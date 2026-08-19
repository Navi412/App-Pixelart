import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, createAddLayerCommand, createRemoveLayerCommand, createMoveLayerCommand, createToggleLayerVisibilityCommand } from '../core/document.js';
import { createHistory, execute, undo } from '../core/history.js';
import { setPixel, getPixel } from '../core/layer.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };

test('createAddLayerCommand añade una capa y la deja activa', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();

  execute(history, doc, createAddLayerCommand());

  assert.equal(doc.layers.length, 2);
  assert.equal(doc.activeLayerIndex, 1);
});

test('undo tras añadir capa la quita y restaura la capa activa previa', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();

  execute(history, doc, createAddLayerCommand());
  undo(history, doc);

  assert.equal(doc.layers.length, 1);
  assert.equal(doc.activeLayerIndex, 0);
});

test('createRemoveLayerCommand quita la capa indicada', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  execute(history, doc, createAddLayerCommand());

  execute(history, doc, createRemoveLayerCommand(0));

  assert.equal(doc.layers.length, 1);
});

test('undo tras eliminar una capa la restaura en su posición original', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  execute(history, doc, createAddLayerCommand());
  setPixel(doc.layers[0], 4, 0, 0, RED);
  const originalFirstLayerId = doc.layers[0].id;

  execute(history, doc, createRemoveLayerCommand(0));
  undo(history, doc);

  assert.equal(doc.layers.length, 2);
  assert.equal(doc.layers[0].id, originalFirstLayerId);
  assert.deepEqual(getPixel(doc.layers[0], 4, 0, 0), RED);
});

test('createMoveLayerCommand reordena las capas', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  execute(history, doc, createAddLayerCommand());
  const [firstId, secondId] = doc.layers.map((l) => l.id);

  execute(history, doc, createMoveLayerCommand(0, 1));

  assert.deepEqual(doc.layers.map((l) => l.id), [secondId, firstId]);
});

test('undo tras mover una capa restaura el orden y la capa activa', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();
  execute(history, doc, createAddLayerCommand());
  const idsBefore = doc.layers.map((l) => l.id);

  execute(history, doc, createMoveLayerCommand(0, 1));
  undo(history, doc);

  assert.deepEqual(doc.layers.map((l) => l.id), idsBefore);
});

test('createToggleLayerVisibilityCommand alterna la visibilidad y undo la revierte', () => {
  const doc = createDocument(4, 4);
  const history = createHistory();

  execute(history, doc, createToggleLayerVisibilityCommand(0));
  assert.equal(doc.layers[0].visible, false);

  undo(history, doc);
  assert.equal(doc.layers[0].visible, true);
});

test('createAddLayerCommand con píxeles iniciales crea la capa ya rellena', () => {
  const doc = createDocument(2, 2);
  const history = createHistory();
  const pixels = new Uint8ClampedArray(2 * 2 * 4);
  pixels.set([255, 0, 0, 255], 0);

  execute(history, doc, createAddLayerCommand(pixels));

  assert.deepEqual(getPixel(doc.layers[1], 2, 0, 0), RED);
});

test('createAddLayerCommand sin argumento sigue creando una capa vacía', () => {
  const doc = createDocument(2, 2);
  const history = createHistory();

  execute(history, doc, createAddLayerCommand());

  assert.deepEqual(getPixel(doc.layers[1], 2, 0, 0), { r: 0, g: 0, b: 0, a: 0 });
});

test('undo tras importar una imagen quita la capa igual que con una capa normal', () => {
  const doc = createDocument(2, 2);
  const history = createHistory();
  const pixels = new Uint8ClampedArray(2 * 2 * 4);
  pixels.set([255, 0, 0, 255], 0);

  execute(history, doc, createAddLayerCommand(pixels));
  undo(history, doc);

  assert.equal(doc.layers.length, 1);
});
