import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';

function createSetPixelCommand(layerIndex, width, x, y, color) {
  let before = null;
  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (before === null) before = getPixel(layer, width, x, y);
      setPixel(layer, width, x, y, color);
    },
    undo(doc) {
      setPixel(doc.layers[layerIndex], width, x, y, before);
    },
  };
}

export function createPaintTool(resolveColor) {
  let last = null;

  function paint(context, x, y) {
    if (last && last.x === x && last.y === y) return;
    last = { x, y };
    const { doc, history } = context;
    const command = createSetPixelCommand(doc.activeLayerIndex, doc.width, x, y, resolveColor(context));
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
