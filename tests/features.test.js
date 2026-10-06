// Tests de las piezas pequeñas añadidas al pulir la app: formas rellenas y con
// Shift, capas (renombrar, opacidad, fundir), composición, RLE y color con alfa.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rectFilledCells,
  ellipseFilledCells,
  ellipseOutlineCells,
  constrainLine,
  constrainSquare,
} from '../core/shapes.js';
import {
  createDocument,
  composeLayers,
  createAddLayerCommand,
  createMergeLayerDownCommand,
} from '../core/document.js';
import { createHistory, execute, undo } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';
import { encodeRle, decodeRle, serializeProject, deserializeProject } from '../core/serialize.js';
import { createProject, getActiveFrame } from '../core/project.js';
import { rgbToHex } from '../core/color.js';
import { createRectangleTool } from '../tools/rectangle.js';
import { createLineTool } from '../tools/line.js';
import { createEyedropperTool } from '../tools/eyedropper.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

test('rectFilledCells cubre todo el rectángulo', () => {
  assert.equal(rectFilledCells(0, 0, 2, 1).length, 6);
});

test('ellipseFilledCells contiene el contorno y el interior', () => {
  const filled = new Set(ellipseFilledCells(0, 0, 6, 6).map((c) => `${c.x},${c.y}`));
  for (const { x, y } of ellipseOutlineCells(0, 0, 6, 6)) assert.ok(filled.has(`${x},${y}`));
  assert.ok(filled.has('3,3'));
});

test('constrainLine ajusta a horizontal, vertical y 45°', () => {
  assert.deepEqual(constrainLine(0, 0, 10, 2), { x: 10, y: 0 });
  assert.deepEqual(constrainLine(0, 0, 1, 9), { x: 0, y: 9 });
  assert.deepEqual(constrainLine(0, 0, 5, -4), { x: 5, y: -5 });
});

test('constrainSquare fuerza lados iguales conservando la dirección', () => {
  assert.deepEqual(constrainSquare(5, 5, 2, 7), { x: 2, y: 8 });
});

test('el rectángulo con fill pinta el interior; con shift sale cuadrado', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const rect = createRectangleTool();
  const ctx = { doc, history, color: RED, fill: true, shift: true };

  rect.onPointerDown(ctx, 0, 0);
  rect.onPointerMove(ctx, 4, 2);
  rect.onPointerUp(ctx);

  assert.deepEqual(getPixel(doc.layers[0], 8, 2, 2), RED);
  assert.deepEqual(getPixel(doc.layers[0], 8, 4, 4), RED);
  assert.deepEqual(getPixel(doc.layers[0], 8, 5, 5), TRANSPARENT);
});

test('la línea ignora fill (no tiene relleno)', () => {
  const doc = createDocument(8, 8);
  const history = createHistory();
  const line = createLineTool();
  const ctx = { doc, history, color: RED, fill: true };

  line.onPointerDown(ctx, 0, 0);
  line.onPointerMove(ctx, 3, 0);
  line.onPointerUp(ctx);

  assert.deepEqual(getPixel(doc.layers[0], 8, 3, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], 8, 1, 1), TRANSPARENT);
});

test('el cuentagotas ignora coordenadas fuera del lienzo', () => {
  const doc = createDocument(4, 4);
  const picked = [];
  const tool = createEyedropperTool((c) => picked.push(c));

  tool.onPointerMove({ doc }, -1, 2);
  tool.onPointerMove({ doc }, 4, 0);

  assert.equal(picked.length, 0);
});

test('composeLayers respeta visibilidad y opacidad', () => {
  const doc = createDocument(1, 1);
  const history = createHistory();
  execute(history, doc, createAddLayerCommand());
  setPixel(doc.layers[0], 1, 0, 0, RED);
  setPixel(doc.layers[1], 1, 0, 0, BLUE);

  assert.deepEqual([...composeLayers(doc)], [0, 0, 255, 255]);
  doc.layers[1].opacity = 0.5;
  const [r, , b] = composeLayers(doc);
  assert.ok(r > 100 && b > 100);
  doc.layers[1].visible = false;
  assert.deepEqual([...composeLayers(doc)], [255, 0, 0, 255]);
});

test('fundir hacia abajo combina las dos capas y se deshace', () => {
  const doc = createDocument(2, 1);
  const history = createHistory();
  execute(history, doc, createAddLayerCommand());
  setPixel(doc.layers[0], 2, 0, 0, RED);
  setPixel(doc.layers[1], 2, 1, 0, BLUE);

  execute(history, doc, createMergeLayerDownCommand(1));

  assert.equal(doc.layers.length, 1);
  assert.equal(doc.activeLayerIndex, 0);
  assert.deepEqual(getPixel(doc.layers[0], 2, 0, 0), RED);
  assert.deepEqual(getPixel(doc.layers[0], 2, 1, 0), BLUE);

  undo(history);
  assert.equal(doc.layers.length, 2);
  assert.deepEqual(getPixel(doc.layers[0], 2, 1, 0), TRANSPARENT);
});

test('RLE hace round-trip y comprime zonas de un solo color', () => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  pixels.set([255, 0, 0, 255], 100 * 4);
  pixels.set([255, 0, 0, 255], 101 * 4);

  const encoded = encodeRle(pixels);

  assert.ok(encoded.length < 30);
  assert.deepEqual(decodeRle(encoded, 64 * 64), pixels);
});

test('se siguen cargando proyectos guardados sin RLE (formato antiguo)', () => {
  const project = createProject(2, 1);
  setPixel(getActiveFrame(project).doc.layers[0], 2, 1, 0, RED);
  const data = serializeProject(project);
  const raw = Buffer.from(getActiveFrame(project).doc.layers[0].pixels).toString('base64');
  for (const frame of data.frames) {
    for (const layer of frame.layers) {
      delete layer.encoding;
      layer.pixels = raw;
    }
  }

  const restored = deserializeProject(data);

  assert.deepEqual(getPixel(getActiveFrame(restored).doc.layers[0], 2, 1, 0), RED);
});

test('rgbToHex añade el alfa solo si no es opaco', () => {
  assert.equal(rgbToHex({ r: 255, g: 0, b: 0, a: 255 }), '#ff0000');
  assert.equal(rgbToHex({ r: 255, g: 0, b: 0, a: 128 }), '#ff000080');
});
