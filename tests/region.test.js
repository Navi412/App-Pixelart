import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, execute, undo } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';
import {
  copyRegion,
  createFillRegionCommand,
  createClearRegionCommand,
  createPasteCommand,
  createFlipRegionCommand,
} from '../core/region.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

function setup() {
  return { doc: createDocument(4, 4), history: createHistory() };
}

test('copyRegion copia los píxeles del rectángulo', () => {
  const { doc } = setup();
  setPixel(doc.layers[0], 4, 1, 1, RED);
  setPixel(doc.layers[0], 2, 2, 2, BLUE);

  const clip = copyRegion(doc.layers[0], 4, { x: 1, y: 1, width: 2, height: 1 });

  assert.equal(clip.width, 2);
  assert.equal(clip.height, 1);
  assert.deepEqual([...clip.pixels.slice(0, 4)], [255, 0, 0, 255]);
});

test('rellenar y borrar una región se deshacen', () => {
  const { doc, history } = setup();
  const rect = { x: 0, y: 0, width: 2, height: 2 };

  execute(history, doc, createFillRegionCommand(0, 4, rect, RED));
  assert.deepEqual(getPixel(doc.layers[0], 4, 1, 1), RED);
  assert.deepEqual(getPixel(doc.layers[0], 4, 2, 2), TRANSPARENT);

  execute(history, doc, createClearRegionCommand(0, 4, rect));
  assert.deepEqual(getPixel(doc.layers[0], 4, 1, 1), TRANSPARENT);

  undo(history);
  assert.deepEqual(getPixel(doc.layers[0], 4, 1, 1), RED);
  undo(history);
  assert.deepEqual(getPixel(doc.layers[0], 4, 1, 1), TRANSPARENT);
});

test('pegar respeta la transparencia del recorte y recorta fuera del lienzo', () => {
  const { doc, history } = setup();
  setPixel(doc.layers[0], 4, 3, 3, BLUE);
  const clip = { width: 2, height: 2, pixels: new Uint8ClampedArray(2 * 2 * 4) };
  clip.pixels.set([255, 0, 0, 255], 0); // (0,0) rojo; el resto transparente

  execute(history, doc, createPasteCommand(0, 4, 4, clip, 2, 2));
  execute(history, doc, createPasteCommand(0, 4, 4, clip, 3, 3));

  assert.deepEqual(getPixel(doc.layers[0], 4, 2, 2), RED);
  assert.deepEqual(getPixel(doc.layers[0], 4, 3, 3), RED);
  undo(history);
  assert.deepEqual(getPixel(doc.layers[0], 4, 3, 3), BLUE);
});

test('voltear en horizontal y en vertical', () => {
  const { doc, history } = setup();
  const rect = { x: 0, y: 0, width: 3, height: 2 };
  setPixel(doc.layers[0], 4, 0, 0, RED);

  execute(history, doc, createFlipRegionCommand(0, 4, rect, 'horizontal'));
  assert.deepEqual(getPixel(doc.layers[0], 4, 2, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], 4, 0, 0), TRANSPARENT);

  execute(history, doc, createFlipRegionCommand(0, 4, rect, 'vertical'));
  assert.deepEqual(getPixel(doc.layers[0], 4, 2, 1), RED);

  undo(history);
  undo(history);
  assert.deepEqual(getPixel(doc.layers[0], 4, 0, 0), RED);
});
