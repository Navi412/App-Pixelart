import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, undo } from '../core/history.js';
import { getPixel } from '../core/layer.js';
import { createPencilTool } from '../tools/pencil.js';
import { createBucketTool } from '../tools/bucket.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

test('rellena todo el layer vacío con un único comando', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const bucket = createBucketTool();

  bucket.onPointerDown({ doc, history, color: RED }, 0, 0);

  assert.equal(history.undoStack.length, 1);
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      assert.deepEqual(getPixel(doc.layers[0], doc.width, x, y), RED);
    }
  }
});

test('undo tras el relleno devuelve todo a transparente', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const bucket = createBucketTool();

  bucket.onPointerDown({ doc, history, color: RED }, 0, 0);
  undo(history, doc);

  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      assert.deepEqual(getPixel(doc.layers[0], doc.width, x, y), TRANSPARENT);
    }
  }
});

test('rellenar con el mismo color ya presente no añade comando', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const bucket = createBucketTool();

  bucket.onPointerDown({ doc, history, color: RED }, 0, 0);
  bucket.onPointerDown({ doc, history, color: RED }, 3, 3);

  assert.equal(history.undoStack.length, 1);
});

test('una barrera de otro color impide que el relleno la cruce', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const pencil = createPencilTool();
  const bucket = createBucketTool();

  for (let y = 0; y < doc.height; y++) {
    pencil.onPointerDown({ doc, history, color: BLUE }, 2, y);
    pencil.onPointerUp({ doc, history, color: BLUE });
  }

  bucket.onPointerDown({ doc, history, color: RED }, 0, 0);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 0, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 3), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 2, 0), BLUE);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 3, 3), TRANSPARENT);
});
