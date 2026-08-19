import test from 'node:test';
import assert from 'node:assert/strict';
import { lineCells, rectOutlineCells, ellipseOutlineCells } from '../core/shapes.js';

test('lineCells de un único punto devuelve esa única celda', () => {
  assert.deepEqual(lineCells(3, 3, 3, 3), [{ x: 3, y: 3 }]);
});

test('lineCells horizontal recorre todas las x intermedias', () => {
  const cells = lineCells(0, 2, 4, 2);
  assert.deepEqual(
    cells,
    [0, 1, 2, 3, 4].map((x) => ({ x, y: 2 })),
  );
});

test('lineCells vertical recorre todas las y intermedias', () => {
  const cells = lineCells(2, 0, 2, 4);
  assert.deepEqual(
    cells,
    [0, 1, 2, 3, 4].map((y) => ({ x: 2, y })),
  );
});

test('lineCells diagonal 45 grados es una diagonal perfecta', () => {
  const cells = lineCells(0, 0, 3, 3);
  assert.deepEqual(cells, [0, 1, 2, 3].map((i) => ({ x: i, y: i })));
});

test('rectOutlineCells de un único punto devuelve esa única celda', () => {
  assert.deepEqual(rectOutlineCells(5, 5, 5, 5), [{ x: 5, y: 5 }]);
});

test('rectOutlineCells no incluye celdas interiores', () => {
  const cells = rectOutlineCells(0, 0, 3, 3);
  const hasInterior = cells.some((c) => c.x > 0 && c.x < 3 && c.y > 0 && c.y < 3);
  assert.equal(hasInterior, false);
  assert.equal(cells.length, 4 * 3);
  for (const corner of [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 3 }]) {
    assert.ok(cells.some((c) => c.x === corner.x && c.y === corner.y));
  }
});

test('ellipseOutlineCells incluye los cuatro puntos extremos de su caja', () => {
  const cells = ellipseOutlineCells(0, 0, 10, 6);
  const has = (x, y) => cells.some((c) => c.x === x && c.y === y);
  assert.ok(has(0, 3), 'punto extremo izquierdo');
  assert.ok(has(10, 3), 'punto extremo derecho');
  assert.ok(has(5, 0), 'punto extremo superior');
  assert.ok(has(5, 6), 'punto extremo inferior');
});

test('ellipseOutlineCells de un único punto devuelve solo esa celda', () => {
  const cells = ellipseOutlineCells(4, 4, 4, 4);
  assert.deepEqual(cells, [{ x: 4, y: 4 }]);
});
