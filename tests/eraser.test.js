import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, undo } from '../core/history.js';
import { getPixel } from '../core/layer.js';
import { createPencilTool } from '../tools/pencil.js';
import { createEraserTool } from '../tools/eraser.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

test('borrar deja el píxel transparente', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const pencil = createPencilTool();
  const eraser = createEraserTool();

  pencil.onPointerDown({ doc, history, color: RED }, 1, 1);
  eraser.onPointerDown({ doc, history, color: RED }, 1, 1);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), TRANSPARENT);
});

test('undo tras borrar restaura el color previo', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const pencil = createPencilTool();
  const eraser = createEraserTool();

  pencil.onPointerDown({ doc, history, color: RED }, 1, 1);
  eraser.onPointerDown({ doc, history, color: RED }, 1, 1);
  undo(history, doc);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), RED);
});
