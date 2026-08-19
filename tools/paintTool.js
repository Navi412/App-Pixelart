import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';

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

function createBrushCommand(layerIndex, width, height, x, y, size, color) {
  let changes = null;
  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (changes === null) {
        changes = brushCells(width, height, x, y, size).map((cell) => ({
          ...cell,
          before: getPixel(layer, width, cell.x, cell.y),
        }));
      }
      for (const { x: cx, y: cy } of changes) {
        setPixel(layer, width, cx, cy, color);
      }
    },
    undo(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x: cx, y: cy, before } of changes) {
        setPixel(layer, width, cx, cy, before);
      }
    },
  };
}

export function createPaintTool(resolveColor) {
  let last = null;

  function paint(context, x, y) {
    if (last && last.x === x && last.y === y) return;
    last = { x, y };
    const { doc, history, size = 1 } = context;
    const command = createBrushCommand(doc.activeLayerIndex, doc.width, doc.height, x, y, size, resolveColor(context));
    execute(history, doc, command);
  }

  return {
    onPointerDown(context, x, y) {
      last = null;
      paint(context, x, y);
    },
    onPointerMove(context, x, y) {
      paint(context, x, y);
    },
    onPointerUp() {
      last = null;
    },
  };
}
