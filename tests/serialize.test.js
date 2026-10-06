import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, getActiveFrame, addFrame } from '../core/project.js';
import { setPixel, getPixel } from '../core/layer.js';
import { serializeProject, deserializeProject } from '../core/serialize.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };

test('round-trip conserva los píxeles de cada capa', () => {
  const project = createProject(4, 4);
  setPixel(getActiveFrame(project).doc.layers[0], 4, 2, 3, RED);

  const restored = deserializeProject(serializeProject(project));

  assert.deepEqual(getPixel(getActiveFrame(restored).doc.layers[0], 4, 2, 3), RED);
});

test('round-trip conserva el número de fotogramas y el fotograma activo', () => {
  const project = createProject(4, 4);
  addFrame(project);
  addFrame(project);
  project.activeFrameIndex = 1;

  const restored = deserializeProject(serializeProject(project));

  assert.equal(restored.frames.length, 3);
  assert.equal(restored.activeFrameIndex, 1);
});

test('round-trip conserva visibilidad de capa y fps', () => {
  const project = createProject(4, 4);
  project.frames[0].doc.layers[0].visible = false;
  project.fps = 24;

  const restored = deserializeProject(serializeProject(project));

  assert.equal(restored.frames[0].doc.layers[0].visible, false);
  assert.equal(restored.fps, 24);
});

test('un píxel transparente no tocado sigue transparente tras el round-trip', () => {
  const project = createProject(4, 4);

  const restored = deserializeProject(serializeProject(project));

  assert.deepEqual(getPixel(getActiveFrame(restored).doc.layers[0], 4, 0, 0), { r: 0, g: 0, b: 0, a: 0 });
});

test('el proyecto restaurado arranca con un historial vacío', () => {
  const project = createProject(4, 4);
  addFrame(project);

  const restored = deserializeProject(serializeProject(project));

  assert.equal(restored.history.undoStack.length, 0);
});
