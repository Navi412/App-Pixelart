import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, undo } from '../core/history.js';
import { getPixel } from '../core/layer.js';
import { createPencilTool } from '../tools/pencil.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

test('sin size en el context pinta un único píxel (comportamiento por defecto)', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const pencil = createPencilTool();

  pencil.onPointerDown({ doc, history, color: RED }, 4, 4);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 4, 4), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 5, 4), TRANSPARENT);
});

test('size: 2 pinta un bloque de 2x2 centrado en el cursor', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const pencil = createPencilTool();

  pencil.onPointerDown({ doc, history, color: RED, size: 2 }, 4, 4);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 4, 4), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 5, 4), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 4, 5), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 5, 5), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 3, 4), TRANSPARENT);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 6, 4), TRANSPARENT);
});

test('size: 3 recorta el bloque cuando el cursor está en el borde del documento', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const pencil = createPencilTool();

  pencil.onPointerDown({ doc, history, color: RED, size: 3 }, 0, 0);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 0, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 0, 1), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), RED);
});

test('undo tras pintar con size > 1 restaura todo el bloque', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const pencil = createPencilTool();

  pencil.onPointerDown({ doc, history, color: RED, size: 3 }, 4, 4);
  undo(history, doc);

  for (let y = 3; y <= 5; y++) {
    for (let x = 3; x <= 5; x++) {
      assert.deepEqual(getPixel(doc.layers[0], doc.width, x, y), TRANSPARENT);
    }
  }
});

test('una única llamada a onPointerDown con size > 1 genera un solo comando', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const pencil = createPencilTool();

  pencil.onPointerDown({ doc, history, color: RED, size: 4 }, 4, 4);

  assert.equal(history.undoStack.length, 1);
});

test('con espejo horizontal activo también pinta la celda reflejada, en un único comando', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const pencil = createPencilTool();

  pencil.onPointerDown({ doc, history, color: RED, mirror: { horizontal: true } }, 1, 4);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 4), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 6, 4), RED);
  assert.equal(history.undoStack.length, 1);
});

test('undo con espejo activo restaura también la celda reflejada', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const pencil = createPencilTool();

  pencil.onPointerDown({ doc, history, color: RED, mirror: { horizontal: true } }, 1, 4);
  undo(history, doc);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 4), TRANSPARENT);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 6, 4), TRANSPARENT);
});
