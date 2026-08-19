import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorCells } from '../core/mirror.js';

test('sin mirror activo devuelve las mismas celdas', () => {
  const cells = [{ x: 1, y: 1 }];
  assert.deepEqual(mirrorCells(cells, 8, 8, null), cells);
  assert.deepEqual(mirrorCells(cells, 8, 8, { horizontal: false, vertical: false }), cells);
});

test('espejo horizontal añade el reflejo en el eje X', () => {
  const cells = mirrorCells([{ x: 1, y: 3 }], 8, 8, { horizontal: true });
  const points = cells.map((c) => `${c.x},${c.y}`).sort();
  assert.deepEqual(points, ['1,3', '6,3']);
});

test('espejo vertical añade el reflejo en el eje Y', () => {
  const cells = mirrorCells([{ x: 2, y: 1 }], 8, 8, { vertical: true });
  const points = cells.map((c) => `${c.x},${c.y}`).sort();
  assert.deepEqual(points, ['2,1', '2,6']);
});

test('ambos ejes generan las cuatro celdas simétricas', () => {
  const cells = mirrorCells([{ x: 1, y: 1 }], 8, 8, { horizontal: true, vertical: true });
  const points = cells.map((c) => `${c.x},${c.y}`).sort();
  assert.deepEqual(points, ['1,1', '1,6', '6,1', '6,6']);
});

test('una celda en el eje de simetría no se duplica', () => {
  // en un lienzo de 8 columnas (0..7), no hay columna central exacta,
  // pero comprobamos que no se generan duplicados cuando la celda reflejada coincide.
  const cells = mirrorCells([{ x: 3, y: 3 }], 8, 8, { horizontal: true, vertical: true });
  const points = new Set(cells.map((c) => `${c.x},${c.y}`));
  assert.equal(points.size, cells.length);
});

test('reflejos fuera de los límites se descartan', () => {
  const cells = mirrorCells([{ x: 0, y: 0 }], 4, 4, { horizontal: true, vertical: true });
  for (const c of cells) {
    assert.ok(c.x >= 0 && c.x < 4 && c.y >= 0 && c.y < 4);
  }
});
