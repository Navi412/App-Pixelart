import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, undo, canUndo } from '../core/history.js';
import { getPixel } from '../core/layer.js';
import { createPencilTool } from '../tools/pencil.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };

function setup() {
  const doc = createDocument(4, 4);
  const history = createHistory();
  const pencil = createPencilTool();
  return { doc, history, pencil };
}

test('onPointerDown pinta el píxel y queda un paso deshacible', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 1, 1);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), RED);
  assert.equal(canUndo(history), true);
});

test('undo restaura el color original', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 1, 1);
  undo(history, doc);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), { r: 0, g: 0, b: 0, a: 0 });
});

test('un trazo que cruza dos celdas genera dos comandos independientes', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 1, 0);

  assert.equal(history.undoStack.length, 2);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 0, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 0), RED);
});

test('repetir onPointerMove sobre la misma celda no añade un comando extra', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 0, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 0, 0);

  assert.equal(history.undoStack.length, 1);
});

test('tras onPointerUp, un nuevo trazo en la misma celda vuelve a pintar', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 0);
  pencil.onPointerUp({ doc, history, color: RED });
  pencil.onPointerDown({ doc, history, color: BLUE }, 0, 0);

  assert.equal(history.undoStack.length, 2);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 0, 0), BLUE);
});
