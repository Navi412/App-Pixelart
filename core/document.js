import { createLayer } from './layer.js';

export function createDocument(width, height) {
  return {
    width,
    height,
    layers: [createLayer(width, height, 'Capa 1')],
    activeLayerIndex: 0,
  };
}

export function createAddLayerCommand(initialPixels = null) {
  let newLayer = null;
  let previousActiveIndex = null;

  return {
    do(doc) {
      if (newLayer === null) {
        newLayer = createLayer(doc.width, doc.height, `Capa ${doc.layers.length + 1}`);
        if (initialPixels) newLayer.pixels.set(initialPixels);
      }
      previousActiveIndex = doc.activeLayerIndex;
      doc.layers.push(newLayer);
      doc.activeLayerIndex = doc.layers.length - 1;
    },
    undo(doc) {
      doc.layers.pop();
      doc.activeLayerIndex = previousActiveIndex;
    },
  };
}

export function createRemoveLayerCommand(index) {
  let removedLayer = null;
  let previousActiveIndex = null;

  return {
    do(doc) {
      previousActiveIndex = doc.activeLayerIndex;
      removedLayer = doc.layers[index];
      doc.layers.splice(index, 1);
      doc.activeLayerIndex = Math.min(previousActiveIndex, doc.layers.length - 1);
    },
    undo(doc) {
      doc.layers.splice(index, 0, removedLayer);
      doc.activeLayerIndex = previousActiveIndex;
    },
  };
}

export function createMoveLayerCommand(fromIndex, toIndex) {
  let previousActiveIndex = null;

  return {
    do(doc) {
      previousActiveIndex = doc.activeLayerIndex;
      const [layer] = doc.layers.splice(fromIndex, 1);
      doc.layers.splice(toIndex, 0, layer);
      if (doc.activeLayerIndex === fromIndex) doc.activeLayerIndex = toIndex;
    },
    undo(doc) {
      const [layer] = doc.layers.splice(toIndex, 1);
      doc.layers.splice(fromIndex, 0, layer);
      doc.activeLayerIndex = previousActiveIndex;
    },
  };
}

export function createToggleLayerVisibilityCommand(index) {
  return {
    do(doc) {
      doc.layers[index].visible = !doc.layers[index].visible;
    },
    undo(doc) {
      doc.layers[index].visible = !doc.layers[index].visible;
    },
  };
}

// Mezcla `src` (con su opacidad) sobre `out`, en el sitio. Operador "over" estándar.
export function blendOver(out, src, opacity = 1) {
  for (let i = 0; i < src.length; i += 4) {
    const srcA = (src[i + 3] / 255) * opacity;
    if (srcA <= 0) continue;

    const dstA = out[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) {
      out[i + 3] = 0;
      continue;
    }

    out[i] = (src[i] * srcA + out[i] * dstA * (1 - srcA)) / outA;
    out[i + 1] = (src[i + 1] * srcA + out[i + 1] * dstA * (1 - srcA)) / outA;
    out[i + 2] = (src[i + 2] * srcA + out[i + 2] * dstA * (1 - srcA)) / outA;
    out[i + 3] = outA * 255;
  }
  return out;
}

// Imagen final de un documento: capas visibles de abajo arriba.
export function composeLayers(doc) {
  const out = new Uint8ClampedArray(doc.width * doc.height * 4);
  for (const layer of doc.layers) {
    if (layer.visible) blendOver(out, layer.pixels, layer.opacity);
  }
  return out;
}

export function createRenameLayerCommand(index, name) {
  let previousName = null;

  return {
    do(doc) {
      previousName = doc.layers[index].name;
      doc.layers[index].name = name;
    },
    undo(doc) {
      doc.layers[index].name = previousName;
    },
  };
}

export function createSetLayerOpacityCommand(index, opacity) {
  let previousOpacity = null;

  return {
    do(doc) {
      previousOpacity = doc.layers[index].opacity;
      doc.layers[index].opacity = opacity;
    },
    undo(doc) {
      doc.layers[index].opacity = previousOpacity;
    },
  };
}

// Funde la capa `index` sobre la de debajo. Las opacidades de ambas quedan
// "horneadas" en los píxeles resultantes (la capa fundida queda con opacidad 1).
export function createMergeLayerDownCommand(index) {
  let lowerBefore = null;
  let upper = null;
  let merged = null;
  let previousActiveIndex = null;

  return {
    do(doc) {
      previousActiveIndex = doc.activeLayerIndex;
      lowerBefore = doc.layers[index - 1];
      upper = doc.layers[index];
      if (merged === null) {
        const pixels = blendOver(new Uint8ClampedArray(lowerBefore.pixels.length), lowerBefore.pixels, lowerBefore.opacity);
        blendOver(pixels, upper.pixels, upper.opacity);
        merged = { ...lowerBefore, opacity: 1, pixels };
      }
      doc.layers.splice(index - 1, 2, merged);
      doc.activeLayerIndex = index - 1;
    },
    undo(doc) {
      doc.layers.splice(index - 1, 1, lowerBefore, upper);
      doc.activeLayerIndex = previousActiveIndex;
    },
  };
}
