import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, undo, redo, canUndo } from '../core/history.js';
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

test('un trazo que cruza varias celdas es un único comando', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 1, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 2, 1);
  pencil.onPointerUp({ doc, history, color: RED });

  assert.equal(history.undoStack.length, 1);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 0, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 2, 1), RED);
});

test('undo deshace el trazo completo de una vez', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 3, 0);
  pencil.onPointerUp({ doc, history, color: RED });
  undo(history);

  for (let x = 0; x <= 3; x++) {
    assert.deepEqual(getPixel(doc.layers[0], doc.width, x, 0), { r: 0, g: 0, b: 0, a: 0 });
  }
  assert.equal(canUndo(history), false);
});

test('un salto grande entre dos eventos de movimiento se rellena sin huecos', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 3, 3);

  for (let i = 0; i <= 3; i++) {
    assert.deepEqual(getPixel(doc.layers[0], doc.width, i, i), RED);
  }
});

test('redo vuelve a aplicar el trazo completo', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 0);
  pencil.onPointerMove({ doc, history, color: RED }, 2, 0);
  pencil.onPointerUp({ doc, history, color: RED });
  undo(history);
  redo(history);

  for (let x = 0; x <= 2; x++) assert.deepEqual(getPixel(doc.layers[0], doc.width, x, 0), RED);
});

test('el trazo puede salir del lienzo y volver sin romperse', () => {
  const { doc, history, pencil } = setup();

  pencil.onPointerDown({ doc, history, color: RED }, 0, 1);
  pencil.onPointerMove({ doc, history, color: RED }, -3, 1);
  pencil.onPointerMove({ doc, history, color: RED }, 3, 1);

  for (let x = 0; x <= 3; x++) assert.deepEqual(getPixel(doc.layers[0], doc.width, x, 1), RED);
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
