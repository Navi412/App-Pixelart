import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createHistory, undo } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';
import { createSelectionTool } from '../tools/selection.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

function setup() {
  let selection = null;
  const getSelection = () => selection;
  const setSelection = (rect) => {
    selection = rect;
  };
  const doc = createDocument(8, 8);
  const history = createHistory();
  const tool = createSelectionTool({ getSelection, setSelection });
  return { doc, history, tool, getSelection };
}

test('arrastrar fuera de cualquier selección define una nueva selección rectangular', () => {
  const { doc, history, tool, getSelection } = setup();

  tool.onPointerDown({ doc, history, color: RED }, 1, 1);
  tool.onPointerMove({ doc, history, color: RED }, 3, 3);
  tool.onPointerUp({ doc, history, color: RED });

  assert.deepEqual(getSelection(), { x: 1, y: 1, width: 3, height: 3 });
  assert.equal(history.undoStack.length, 0);
});

test('arrastrar dentro de la selección mueve su contenido y limpia el origen', () => {
  const { doc, history, tool, getSelection } = setup();
  setPixel(doc.layers[0], doc.width, 1, 1, RED);

  tool.onPointerDown({ doc, history, color: RED }, 1, 1);
  tool.onPointerMove({ doc, history, color: RED }, 1, 1);
  tool.onPointerUp({ doc, history, color: RED });

  tool.onPointerDown({ doc, history, color: RED }, 1, 1);
  tool.onPointerMove({ doc, history, color: RED }, 3, 1);
  tool.onPointerUp({ doc, history, color: RED });

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), TRANSPARENT);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 3, 1), RED);
  assert.deepEqual(getSelection(), { x: 3, y: 1, width: 1, height: 1 });
  assert.equal(history.undoStack.length, 1);
});

test('undo tras mover restaura el origen y el destino', () => {
  const { doc, history, tool } = setup();
  setPixel(doc.layers[0], doc.width, 1, 1, RED);
  setPixel(doc.layers[0], doc.width, 3, 1, BLUE);

  tool.onPointerDown({ doc, history, color: RED }, 1, 1);
  tool.onPointerMove({ doc, history, color: RED }, 1, 1);
  tool.onPointerUp({ doc, history, color: RED });

  tool.onPointerDown({ doc, history, color: RED }, 1, 1);
  tool.onPointerMove({ doc, history, color: RED }, 3, 1);
  tool.onPointerUp({ doc, history, color: RED });
  undo(history, doc);

  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), RED);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 3, 1), BLUE);
});

test('soltar sin desplazamiento no genera comando', () => {
  const { doc, history, tool } = setup();
  setPixel(doc.layers[0], doc.width, 1, 1, RED);

  tool.onPointerDown({ doc, history, color: RED }, 1, 1);
  tool.onPointerMove({ doc, history, color: RED }, 1, 1);
  tool.onPointerUp({ doc, history, color: RED });

  tool.onPointerDown({ doc, history, color: RED }, 1, 1);
  tool.onPointerUp({ doc, history, color: RED });

  assert.equal(history.undoStack.length, 0);
  assert.deepEqual(getPixel(doc.layers[0], doc.width, 1, 1), RED);
});
