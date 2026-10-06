import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';
import { mirrorCells } from '../core/mirror.js';

function clip(cells, width, height) {
  return cells.filter((c) => c.x >= 0 && c.y >= 0 && c.x < width && c.y < height);
}

function createCellsCommand(layerIndex, width, cells, color) {
  let changes = null;
  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (changes === null) {
        changes = cells.map((c) => ({ ...c, before: getPixel(layer, width, c.x, c.y) }));
      }
      for (const { x, y } of changes) setPixel(layer, width, x, y, color);
    },
    undo(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x, y, before } of changes) setPixel(layer, width, x, y, before);
    },
  };
}

// outline: celdas del contorno. filled (opcional): celdas con relleno, se usan
// cuando context.fill está activo. constrain (opcional): ajusta el punto final
// cuando context.shift está pulsado (cuadrado, círculo, línea a 45°...).
export function createShapeTool({ outline, filled = null, constrain = null }) {
  let start = null;
  let current = null;
  let preview = null;

  function shapeCells(state) {
    const end = state.shift && constrain ? constrain(start.x, start.y, current.x, current.y) : current;
    const cellsFn = state.fill && filled ? filled : outline;
    const clipped = clip(cellsFn(start.x, start.y, end.x, end.y), state.width, state.height);
    return mirrorCells(clipped, state.width, state.height, state.mirror);
  }

  function trackState(context) {
    preview = {
      color: context.color,
      mirror: context.mirror,
      width: context.doc.width,
      height: context.doc.height,
      shift: !!context.shift,
      fill: !!context.fill,
    };
  }

  return {
    onPointerDown(context, x, y) {
      start = { x, y };
      current = { x, y };
      trackState(context);
    },
    onPointerMove(context, x, y) {
      if (!start) return;
      current = { x, y };
      trackState(context);
    },
    onPointerUp(context) {
      if (!start || !current) return;
      trackState(context);
      const { doc, history, color } = context;
      const cells = shapeCells(preview);
      if (cells.length > 0) {
        execute(history, doc, createCellsCommand(doc.activeLayerIndex, doc.width, cells, color));
      }
      start = null;
      current = null;
    },
    getPreview() {
      if (!start || !current) return null;
      return shapeCells(preview).map((c) => ({ ...c, color: preview.color }));
    },
  };
}
