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
