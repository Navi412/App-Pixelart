import { createLayer } from './layer.js';

export function createDocument(width, height) {
  return {
    width,
    height,
    layers: [createLayer(width, height, 'Layer 1')],
    activeLayerIndex: 0,
  };
}
