import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayer, pixelIndex, getPixel, setPixel, createClearLayerCommand, resizeLayerPixels } from '../core/layer.js';
import { createDocument } from '../core/document.js';
import { createHistory, execute, undo } from '../core/history.js';

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

test('createClearLayerCommand deja todos los píxeles transparentes', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  setPixel(doc.layers[0], 4, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
  setPixel(doc.layers[0], 4, 3, 3, { r: 0, g: 255, b: 0, a: 255 });

  execute(history, doc, createClearLayerCommand(0));

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      assert.deepEqual(getPixel(doc.layers[0], 4, x, y), { r: 0, g: 0, b: 0, a: 0 });
    }
  }
});

test('undo tras borrar el lienzo restaura el contenido previo', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const red = { r: 255, g: 0, b: 0, a: 255 };
  setPixel(doc.layers[0], 4, 0, 0, red);

  execute(history, doc, createClearLayerCommand(0));
  undo(history, doc);

  assert.deepEqual(getPixel(doc.layers[0], 4, 0, 0), red);
});

test('resizeLayerPixels al agrandar conserva el contenido y rellena con transparente', () => {
  const layer = createLayer(4, 4, 'Capa 1');
  const red = { r: 255, g: 0, b: 0, a: 255 };
  setPixel(layer, 4, 1, 1, red);

  const resized = resizeLayerPixels(layer, 4, 4, 8, 8);

  assert.equal(resized.pixels.length, 8 * 8 * 4);
  assert.deepEqual(getPixel(resized, 8, 1, 1), red);
  assert.deepEqual(getPixel(resized, 8, 6, 6), { r: 0, g: 0, b: 0, a: 0 });
});

test('resizeLayerPixels al achicar recorta lo que queda fuera', () => {
  const layer = createLayer(8, 8, 'Capa 1');
  const red = { r: 255, g: 0, b: 0, a: 255 };
  setPixel(layer, 8, 1, 1, red);
  setPixel(layer, 8, 6, 6, red);

  const resized = resizeLayerPixels(layer, 8, 8, 4, 4);

  assert.equal(resized.pixels.length, 4 * 4 * 4);
  assert.deepEqual(getPixel(resized, 4, 1, 1), red);
});

test('resizeLayerPixels conserva id, nombre y visibilidad de la capa', () => {
  const layer = createLayer(4, 4, 'Capa 1');
  layer.visible = false;

  const resized = resizeLayerPixels(layer, 4, 4, 6, 6);

  assert.equal(resized.id, layer.id);
  assert.equal(resized.name, 'Capa 1');
  assert.equal(resized.visible, false);
});
