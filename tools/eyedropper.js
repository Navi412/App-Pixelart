import { getPixel } from '../core/layer.js';

export function createEyedropperTool(onPick) {
  function pick(context, x, y) {
    const { doc } = context;
    // Al arrastrar, el puntero puede salir del lienzo: fuera no hay color que coger.
    if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return;
    onPick(getPixel(doc.layers[doc.activeLayerIndex], doc.width, x, y));
  }

  return {
    onPointerDown: pick,
    onPointerMove: pick,
    onPointerUp() {},
    getCursor(context, x, y) {
      const { doc } = context;
      if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return null;
      return { cells: [{ x, y }], color: null };
    },
  };
}
