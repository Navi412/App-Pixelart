import { getPixel } from '../core/layer.js';

export function createEyedropperTool(onPick) {
  function pick(context, x, y) {
    const layer = context.doc.layers[context.doc.activeLayerIndex];
    onPick(getPixel(layer, context.doc.width, x, y));
  }

  return {
    onPointerDown: pick,
    onPointerMove: pick,
    onPointerUp() {},
  };
}
