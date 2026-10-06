import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProject,
  getActiveFrame,
  addFrame,
  moveFrame,
  setActiveLayer,
  normalizeLayerStructure,
  createProjectAddLayerCommand,
  createProjectRemoveLayerCommand,
  createProjectRenameLayerCommand,
  createProjectSetLayerOpacityCommand,
  createProjectToggleLayerVisibilityCommand,
  createAddFrameCommand,
  createDuplicateFrameCommand,
  createRemoveFrameCommand,
  createMoveFrameCommand,
  createResizeProjectCommand,
} from '../core/project.js';
import { createLayer, setPixel, getPixel, createClearLayerCommand } from '../core/layer.js';
import { execute, undo, redo } from '../core/history.js';
import { createPencilTool } from '../tools/pencil.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

function layerCounts(project) {
  return project.frames.map((f) => f.doc.layers.length);
}

test('añadir una capa la añade en todos los fotogramas', () => {
  const project = createProject(4, 4);
  addFrame(project);
  addFrame(project);

  execute(project.history, project, createProjectAddLayerCommand());

  assert.deepEqual(layerCounts(project), [2, 2, 2]);
  undo(project.history);
  assert.deepEqual(layerCounts(project), [1, 1, 1]);
});

test('los píxeles iniciales de una capa nueva solo van al fotograma indicado', () => {
  const project = createProject(2, 2);
  addFrame(project);
  const pixels = new Uint8ClampedArray(2 * 2 * 4).fill(255);

  execute(project.history, project, createProjectAddLayerCommand(pixels, 1));

  assert.deepEqual(getPixel(project.frames[1].doc.layers[1], 2, 0, 0), { r: 255, g: 255, b: 255, a: 255 });
  assert.deepEqual(getPixel(project.frames[0].doc.layers[1], 2, 0, 0), TRANSPARENT);
});

test('quitar, renombrar, opacidad y visibilidad se aplican a todos los fotogramas', () => {
  const project = createProject(4, 4);
  addFrame(project);
  execute(project.history, project, createProjectAddLayerCommand());

  execute(project.history, project, createProjectRenameLayerCommand(1, 'Sombras'));
  execute(project.history, project, createProjectSetLayerOpacityCommand(1, 0.5));
  execute(project.history, project, createProjectToggleLayerVisibilityCommand(1));

  for (const { doc } of project.frames) {
    assert.equal(doc.layers[1].name, 'Sombras');
    assert.equal(doc.layers[1].opacity, 0.5);
    assert.equal(doc.layers[1].visible, false);
  }

  execute(project.history, project, createProjectRemoveLayerCommand(0));
  assert.deepEqual(layerCounts(project), [1, 1]);
  assert.equal(project.frames[1].doc.layers[0].name, 'Sombras');
});

test('un fotograma nuevo hereda la estructura de capas pero vacía', () => {
  const project = createProject(4, 4);
  execute(project.history, project, createProjectAddLayerCommand());
  execute(project.history, project, createProjectRenameLayerCommand(1, 'Línea'));
  setPixel(project.frames[0].doc.layers[1], 4, 0, 0, RED);

  execute(project.history, project, createAddFrameCommand());

  const doc = getActiveFrame(project).doc;
  assert.equal(project.activeFrameIndex, 1);
  assert.equal(doc.layers.length, 2);
  assert.equal(doc.layers[1].name, 'Línea');
  assert.deepEqual(getPixel(doc.layers[1], 4, 0, 0), TRANSPARENT);
});

test('añadir, duplicar, quitar y mover fotogramas se puede deshacer y rehacer', () => {
  const project = createProject(4, 4);
  const first = project.frames[0];

  execute(project.history, project, createDuplicateFrameCommand());
  execute(project.history, project, createAddFrameCommand());
  const third = project.frames[2];
  execute(project.history, project, createMoveFrameCommand(2, 0));
  assert.equal(project.frames[0], third);
  assert.equal(project.activeFrameIndex, 0);

  execute(project.history, project, createRemoveFrameCommand(0));
  assert.equal(project.frames.length, 2);

  undo(project.history);
  undo(project.history);
  assert.equal(project.frames[2], third);
  assert.equal(project.activeFrameIndex, 2);

  undo(project.history);
  undo(project.history);
  assert.deepEqual(project.frames, [first]);
  assert.equal(project.activeFrameIndex, 0);

  redo(project.history);
  assert.equal(project.frames.length, 2);
});

test('moveFrame deja activo el fotograma movido', () => {
  const project = createProject(4, 4);
  addFrame(project);
  addFrame(project);
  const moved = project.frames[0];

  moveFrame(project, 0, 2);

  assert.equal(project.frames[2], moved);
  assert.equal(project.activeFrameIndex, 2);
});

test('deshacer después de redimensionar restaura el tamaño y los trazos anteriores sin corromper', () => {
  const project = createProject(4, 4);
  const pencil = createPencilTool();
  const ctx = () => ({ doc: getActiveFrame(project).doc, history: project.history, color: RED });

  pencil.onPointerDown(ctx(), 3, 3);
  pencil.onPointerUp(ctx());
  execute(project.history, project, createResizeProjectCommand(8, 2));
  assert.equal(getActiveFrame(project).doc.width, 8);

  // Borrar lienzo tras redimensionar y deshacerlo todo: antes esto lanzaba RangeError.
  execute(project.history, getActiveFrame(project).doc, createClearLayerCommand(0));
  undo(project.history);
  undo(project.history);

  const doc = getActiveFrame(project).doc;
  assert.equal(project.width, 4);
  assert.equal(doc.width, 4);
  assert.equal(doc.layers[0].pixels.length, 4 * 4 * 4);
  assert.deepEqual(getPixel(doc.layers[0], 4, 3, 3), RED);

  undo(project.history);
  assert.deepEqual(getPixel(doc.layers[0], 4, 3, 3), TRANSPARENT);

  redo(project.history);
  redo(project.history);
  assert.equal(project.width, 8);
  assert.equal(getActiveFrame(project).doc.layers[0].pixels.length, 8 * 2 * 4);
});

test('undo devuelve el objeto afectado (para saltar al fotograma que cambió)', () => {
  const project = createProject(4, 4);
  addFrame(project);
  const pencil = createPencilTool();
  const doc0 = project.frames[0].doc;

  pencil.onPointerDown({ doc: doc0, history: project.history, color: RED }, 0, 0);

  assert.equal(undo(project.history), doc0);
  assert.equal(undo(project.history), null);
});

test('setActiveLayer sincroniza la capa activa en todos los fotogramas', () => {
  const project = createProject(4, 4);
  addFrame(project);
  execute(project.history, project, createProjectAddLayerCommand());

  setActiveLayer(project, 0);

  assert.deepEqual(
    project.frames.map((f) => f.doc.activeLayerIndex),
    [0, 0],
  );
});

test('normalizeLayerStructure iguala proyectos antiguos con capas distintas por fotograma', () => {
  const project = createProject(4, 4);
  addFrame(project);
  const extra = createLayer(4, 4, 'Fondo');
  extra.visible = false;
  project.frames[1].doc.layers.push(extra);

  normalizeLayerStructure(project);

  assert.deepEqual(layerCounts(project), [2, 2]);
  assert.equal(project.frames[0].doc.layers[1].name, 'Fondo');
  assert.equal(project.frames[0].doc.layers[1].visible, false);
});
