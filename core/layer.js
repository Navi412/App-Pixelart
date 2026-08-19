export function createLayer(width, height, name) {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    opacity: 1,
    pixels: new Uint8ClampedArray(width * height * 4),
  };
}

export function pixelIndex(width, x, y) {
  return (y * width + x) * 4;
}

export function getPixel(layer, width, x, y) {
  const i = pixelIndex(width, x, y);
  return {
    r: layer.pixels[i],
    g: layer.pixels[i + 1],
    b: layer.pixels[i + 2],
    a: layer.pixels[i + 3],
  };
}

export function setPixel(layer, width, x, y, color) {
  const i = pixelIndex(width, x, y);
  layer.pixels[i] = color.r;
  layer.pixels[i + 1] = color.g;
  layer.pixels[i + 2] = color.b;
  layer.pixels[i + 3] = color.a;
}

export function createClearLayerCommand(layerIndex) {
  let before = null;

  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (before === null) before = layer.pixels.slice();
      layer.pixels.fill(0);
    },
    undo(doc) {
      doc.layers[layerIndex].pixels.set(before);
    },
  };
}
