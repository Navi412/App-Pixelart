import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, getActiveFrame, addFrame, duplicateFrame, removeFrame } from '../core/project.js';
import { setPixel, getPixel } from '../core/layer.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };

test('createProject arranca con un único fotograma', () => {
  const project = createProject(4, 4);
  assert.equal(project.frames.length, 1);
  assert.equal(project.activeFrameIndex, 0);
});

test('addFrame añade un fotograma en blanco y lo deja activo', () => {
  const project = createProject(4, 4);
  addFrame(project);
  assert.equal(project.frames.length, 2);
  assert.equal(project.activeFrameIndex, 1);
  assert.deepEqual(getPixel(getActiveFrame(project).doc.layers[0], 4, 0, 0), { r: 0, g: 0, b: 0, a: 0 });
});

test('duplicateFrame copia los píxeles sin compartir el array', () => {
  const project = createProject(4, 4);
  setPixel(getActiveFrame(project).doc.layers[0], 4, 1, 1, RED);

  duplicateFrame(project, 0);

  assert.equal(project.frames.length, 2);
  assert.equal(project.activeFrameIndex, 1);
  assert.deepEqual(getPixel(getActiveFrame(project).doc.layers[0], 4, 1, 1), RED);

  // Modificar el original no debe afectar a la copia (arrays independientes).
  setPixel(project.frames[0].doc.layers[0], 4, 2, 2, RED);
  assert.deepEqual(getPixel(project.frames[1].doc.layers[0], 4, 2, 2), { r: 0, g: 0, b: 0, a: 0 });
});

test('duplicateFrame inserta justo después del fotograma origen', () => {
  const project = createProject(4, 4);
  addFrame(project);
  addFrame(project);

  duplicateFrame(project, 0);

  assert.equal(project.frames.length, 4);
  assert.equal(project.activeFrameIndex, 1);
});

test('removeFrame quita el fotograma y ajusta el índice activo', () => {
  const project = createProject(4, 4);
  addFrame(project);
  addFrame(project);
  project.activeFrameIndex = 2;

  const removed = removeFrame(project, 2);

  assert.equal(removed, true);
  assert.equal(project.frames.length, 2);
  assert.equal(project.activeFrameIndex, 1);
});

test('removeFrame no deja el proyecto sin fotogramas', () => {
  const project = createProject(4, 4);

  const removed = removeFrame(project, 0);

  assert.equal(removed, false);
  assert.equal(project.frames.length, 1);
});

test('cada fotograma tiene su propio historial independiente', () => {
  const project = createProject(4, 4);
  addFrame(project);
  assert.notEqual(project.frames[0].history, project.frames[1].history);
});
