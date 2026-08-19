import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, undo } from '../core/history.js';
import { getPixel } from '../core/layer.js';
import { createLineTool } from '../tools/line.js';
import { createRectangleTool } from '../tools/rectangle.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

test('arrastrar la herramienta de línea no pinta hasta soltar', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const line = createLineTool();

  line.onPointerDown({ doc, history, color: RED }, 0, 0);
  line.onPointerMove({ doc, history, color: RED }, 3, 0);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 2, 0), TRANSPARENT);
  assert.equal(history.undoStack.length, 0);
});

test('soltar la herramienta de línea pinta el trazo completo en un único comando', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const line = createLineTool();

  line.onPointerDown({ doc, history, color: RED }, 0, 0);
  line.onPointerMove({ doc, history, color: RED }, 3, 0);
  line.onPointerUp({ doc, history, color: RED });

  for (let x = 0; x <= 3; x++) {
    assert.deepEqual(getPixel(doc.layers[0], doc.width, x, 0), RED);
  }
  assert.equal(history.undoStack.length, 1);
});

test('undo tras la línea restaura todo el trazo', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const line = createLineTool();

  line.onPointerDown({ doc, history, color: RED }, 0, 0);
  line.onPointerMove({ doc, history, color: RED }, 3, 0);
  line.onPointerUp({ doc, history, color: RED });
  undo(history, doc);

  for (let x = 0; x <= 3; x++) {
    assert.deepEqual(getPixel(doc.layers[0], doc.width, x, 0), TRANSPARENT);
  }
});

test('getPreview de la línea refleja el trazo en curso sin tocar el documento', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const line = createLineTool();

  assert.equal(line.getPreview(), null);

  line.onPointerDown({ doc, history, color: RED }, 0, 0);
  line.onPointerMove({ doc, history, color: RED }, 2, 0);

  const preview = line.getPreview();
  assert.equal(preview.length, 3);
  assert.ok(preview.every((c) => c.color === RED));
});

test('el rectángulo solo pinta el contorno, no el interior', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const rect = createRectangleTool();

  rect.onPointerDown({ doc, history, color: RED }, 1, 1);
  rect.onPointerMove({ doc, history, color: RED }, 4, 4);
  rect.onPointerUp({ doc, history, color: RED });

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 4, 4), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 2, 2), TRANSPARENT);
});

test('las celdas fuera de los límites del documento se recortan', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const line = createLineTool();

  line.onPointerDown({ doc, history, color: RED }, 2, 2);
  line.onPointerMove({ doc, history, color: RED }, 10, 2);
  line.onPointerUp({ doc, history, color: RED });

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 3, 2), RED);
  assert.equal(history.undoStack.length, 1);
});
