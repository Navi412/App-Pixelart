import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayer, pixelIndex, getPixel, setPixel } from '../core/layer.js';

test('pixelIndex calcula el offset correcto en el array RGBA', () => {
  assert.equal(pixelIndex(4, 0, 0), 0);
  assert.equal(pixelIndex(4, 1, 0), 4);
  assert.equal(pixelIndex(4, 0, 1), 16);
  assert.equal(pixelIndex(4, 3, 2), 44);
});

test('setPixel seguido de getPixel hace round-trip', () => {
  const layer = createLayer(4, 4, 'Layer 1');
  const color = { r: 10, g: 20, b: 30, a: 255 };

  setPixel(layer, 4, 2, 1, color);

  assert.deepEqual(getPixel(layer, 4, 2, 1), color);
});

test('un píxel no tocado sigue transparente', () => {
  const layer = createLayer(4, 4, 'Layer 1');

  assert.deepEqual(getPixel(layer, 4, 3, 3), { r: 0, g: 0, b: 0, a: 0 });
});
