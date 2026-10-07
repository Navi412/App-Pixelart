import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';
import { mirrorCells } from '../core/mirror.js';
import { lineCells } from '../core/shapes.js';

function brushCells(width, height, x, y, size) {
  const startX = x - Math.floor((size - 1) / 2);
  const startY = y - Math.floor((size - 1) / 2);
  const cells = [];

  for (let dy = 0; dy < size; dy++) {
    const cy = startY + dy;
    if (cy < 0 || cy >= height) continue;
    for (let dx = 0; dx < size; dx++) {
      const cx = startX + dx;
      if (cx < 0 || cx >= width) continue;
      cells.push({ x: cx, y: cy });
    }
  }

  return cells;
}

// Un trazo entero (de pointerdown a pointerup) es un único comando: se registra
// en el historial al empezar y va acumulando celdas mientras se arrastra, así
// un Ctrl+Z deshace el trazo completo y no píxel a píxel.
function createStrokeCommand(layerIndex, width, color) {
  const changes = new Map();

  return {
    paint(doc, cells) {
      const layer = doc.layers[layerIndex];
      for (const { x, y } of cells) {
        const key = y * width + x;
        if (!changes.has(key)) changes.set(key, { x, y, before: getPixel(layer, width, x, y) });
        setPixel(layer, width, x, y, color);
      }
    },
    do(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x, y } of changes.values()) setPixel(layer, width, x, y, color);
    },
    undo(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x, y, before } of changes.values()) setPixel(layer, width, x, y, before);
    },
  };
}

export function createPaintTool(resolveColor) {
  let stroke = null;
  let last = null;

  function cellsAt(context, x, y) {
    const { doc, size = 1, mirror } = context;
    return mirrorCells(brushCells(doc.width, doc.height, x, y, size), doc.width, doc.height, mirror);
  }

  return {
    onPointerDown(context, x, y) {
      const { doc, history } = context;
      stroke = createStrokeCommand(doc.activeLayerIndex, doc.width, resolveColor(context));
      execute(history, doc, stroke);
      stroke.paint(doc, cellsAt(context, x, y));
      last = { x, y };
    },
    onPointerMove(context, x, y) {
      if (!stroke || (last.x === x && last.y === y)) return;
      // Se rellena el hueco entre el punto anterior y el actual: con el ratón
      // rápido los eventos llegan separados varios píxeles.
      const points = lineCells(last.x, last.y, x, y).slice(1);
      stroke.paint(context.doc, points.flatMap((p) => cellsAt(context, p.x, p.y)));
      last = { x, y };
    },
    onPointerUp() {
      stroke = null;
      last = null;
    },
    // Huella del pincel bajo el puntero (con espejo). Solo se rellena con color
    // si pinta algo visible; la goma muestra únicamente el contorno.
    getCursor(context, x, y) {
      const color = resolveColor(context);
      return { cells: cellsAt(context, x, y), color: color.a > 0 ? color : null };
    },
  };
}
