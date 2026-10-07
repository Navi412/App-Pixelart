import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { createPencilTool } from '../tools/pencil.js';
import { createEraserTool } from '../tools/eraser.js';
import { createBucketTool } from '../tools/bucket.js';
import { createEyedropperTool } from '../tools/eyedropper.js';
import { createRectangleTool } from '../tools/rectangle.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };

const sortCells = (cells) => [...cells].sort((a, b) => a.y - b.y || a.x - b.x);

test('la huella del lápiz cubre el grosor del pincel y lleva el color', () => {
  const doc = createDocument(8, 8);
  const cursor = createPencilTool().getCursor({ doc, color: RED, size: 2 }, 4, 4);

  assert.deepEqual(cursor.color, RED);
  assert.deepEqual(sortCells(cursor.cells), [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
  ]);
});

test('la huella de la goma es la misma zona pero sin color (solo contorno)', () => {
  const doc = createDocument(8, 8);
  const cursor = createEraserTool().getCursor({ doc, color: RED, size: 3 }, 0, 0);

  assert.equal(cursor.color, null);
  // Se recorta al lienzo: en la esquina solo quedan 2x2 de las 3x3 celdas.
  assert.equal(cursor.cells.length, 4);
});

test('la huella respeta el espejo', () => {
  const doc = createDocument(8, 8);
  const mirror = { horizontal: true, vertical: false };
  const cursor = createPencilTool().getCursor({ doc, color: RED, size: 1, mirror }, 1, 2);

  assert.deepEqual(sortCells(cursor.cells), [
    { x: 1, y: 2 },
    { x: 6, y: 2 },
  ]);
});

test('bote, formas y cuentagotas muestran un único píxel', () => {
  const doc = createDocument(8, 8);
  const context = { doc, color: RED, size: 4 };

  assert.deepEqual(createBucketTool().getCursor(context, 3, 3).cells, [{ x: 3, y: 3 }]);
  assert.deepEqual(createRectangleTool().getCursor(context, 3, 3).cells, [{ x: 3, y: 3 }]);
  const eyedropper = createEyedropperTool(() => {}).getCursor(context, 3, 3);
  assert.deepEqual(eyedropper, { cells: [{ x: 3, y: 3 }], color: null });
});
