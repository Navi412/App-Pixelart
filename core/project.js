import {
  createDocument,
  createAddLayerCommand,
  createRemoveLayerCommand,
  createMoveLayerCommand,
  createToggleLayerVisibilityCommand,
  createRenameLayerCommand,
  createSetLayerOpacityCommand,
  createMergeLayerDownCommand,
} from './document.js';
import { createHistory } from './history.js';
import { createLayer, resizeLayerPixels } from './layer.js';

// Un fotograma es solo { doc }. El historial es único por proyecto
// (project.history) y todos los fotogramas comparten la misma estructura de
// capas: mismo número, nombres, visibilidad y opacidad. Solo cambian los píxeles.

function createFrame(width, height) {
  return { doc: createDocument(width, height) };
}

// Fotograma vacío con la misma estructura de capas que `templateDoc`.
function createEmptyFrameLike(templateDoc) {
  const { width, height } = templateDoc;
  const doc = createDocument(width, height);
  doc.layers = templateDoc.layers.map((layer) => ({
    ...createLayer(width, height, layer.name),
    visible: layer.visible,
    opacity: layer.opacity,
  }));
  doc.activeLayerIndex = templateDoc.activeLayerIndex;
  return { doc };
}

function cloneFrame(frame) {
  const { doc } = frame;
  return {
    doc: {
      ...doc,
      layers: doc.layers.map((layer) => ({ ...layer, id: crypto.randomUUID(), pixels: layer.pixels.slice() })),
    },
  };
}

export function createProject(width, height) {
  return {
    width,
    height,
    frames: [createFrame(width, height)],
    activeFrameIndex: 0,
    fps: 12,
    history: createHistory(),
  };
}

export function getActiveFrame(project) {
  return project.frames[project.activeFrameIndex];
}

export function addFrame(project, afterIndex = project.frames.length - 1) {
  project.frames.splice(afterIndex + 1, 0, createEmptyFrameLike(project.frames[afterIndex].doc));
  project.activeFrameIndex = afterIndex + 1;
  return project.activeFrameIndex;
}

export function duplicateFrame(project, index) {
  project.frames.splice(index + 1, 0, cloneFrame(project.frames[index]));
  project.activeFrameIndex = index + 1;
  return project.activeFrameIndex;
}

export function removeFrame(project, index) {
  if (project.frames.length <= 1) return false;
  project.frames.splice(index, 1);
  project.activeFrameIndex = Math.min(project.activeFrameIndex, project.frames.length - 1);
  return true;
}

export function moveFrame(project, fromIndex, toIndex) {
  const [frame] = project.frames.splice(fromIndex, 1);
  project.frames.splice(toIndex, 0, frame);
  project.activeFrameIndex = toIndex;
}

export function setActiveLayer(project, index) {
  for (const frame of project.frames) frame.doc.activeLayerIndex = index;
}

export function applyProjectData(project, data) {
  project.width = data.width;
  project.height = data.height;
  project.frames = data.frames;
  project.activeFrameIndex = data.activeFrameIndex;
  project.fps = data.fps;
  project.history = data.history ?? createHistory();
}

export function resizeProject(project, newWidth, newHeight) {
  for (const frame of project.frames) {
    frame.doc.layers = frame.doc.layers.map((layer) =>
      resizeLayerPixels(layer, project.width, project.height, newWidth, newHeight),
    );
    frame.doc.width = newWidth;
    frame.doc.height = newHeight;
  }
  project.width = newWidth;
  project.height = newHeight;
}

// Proyectos guardados antes de compartir las capas pueden tener un número
// distinto de capas en cada fotograma: se igualan añadiendo capas vacías arriba
// y copiando nombre/visibilidad/opacidad del fotograma con más capas.
export function normalizeLayerStructure(project) {
  const template = project.frames.reduce((best, frame) =>
    frame.doc.layers.length > best.doc.layers.length ? frame : best,
  ).doc;

  for (const { doc } of project.frames) {
    template.layers.forEach((templateLayer, index) => {
      if (!doc.layers[index]) doc.layers.push(createLayer(doc.width, doc.height, templateLayer.name));
      doc.layers[index].name = templateLayer.name;
      doc.layers[index].visible = templateLayer.visible;
      doc.layers[index].opacity = templateLayer.opacity;
    });
  }

  const activeDoc = getActiveFrame(project).doc;
  setActiveLayer(project, Math.min(activeDoc.activeLayerIndex, template.layers.length - 1));
  return project;
}

// --- Comandos de proyecto: { do(project), undo(project) } ---

// Aplica el mismo cambio de capas a todos los fotogramas, para que su estructura
// siga siendo idéntica. makeDocCommand(frameIndex) crea el comando de cada doc.
function createAllFramesCommand(makeDocCommand) {
  let entries = null;

  return {
    do(project) {
      if (entries === null) {
        entries = project.frames.map((frame, index) => ({ doc: frame.doc, command: makeDocCommand(index) }));
      }
      for (const { doc, command } of entries) command.do(doc);
    },
    undo() {
      for (const { doc, command } of [...entries].reverse()) command.undo(doc);
    },
  };
}

// initialPixels (opcional) solo se ponen en el fotograma `frameIndex`; en el resto la capa nace vacía.
export function createProjectAddLayerCommand(initialPixels = null, frameIndex = 0) {
  return createAllFramesCommand((index) => createAddLayerCommand(index === frameIndex ? initialPixels : null));
}

export function createProjectRemoveLayerCommand(layerIndex) {
  return createAllFramesCommand(() => createRemoveLayerCommand(layerIndex));
}

export function createProjectMoveLayerCommand(fromIndex, toIndex) {
  return createAllFramesCommand(() => createMoveLayerCommand(fromIndex, toIndex));
}

export function createProjectToggleLayerVisibilityCommand(layerIndex) {
  return createAllFramesCommand(() => createToggleLayerVisibilityCommand(layerIndex));
}

export function createProjectRenameLayerCommand(layerIndex, name) {
  return createAllFramesCommand(() => createRenameLayerCommand(layerIndex, name));
}

export function createProjectSetLayerOpacityCommand(layerIndex, opacity) {
  return createAllFramesCommand(() => createSetLayerOpacityCommand(layerIndex, opacity));
}

export function createProjectMergeLayerDownCommand(layerIndex) {
  return createAllFramesCommand(() => createMergeLayerDownCommand(layerIndex));
}

// Envuelve una operación de fotogramas (que cambia el array y el índice activo)
// guardando el estado anterior y el posterior para poder deshacer/rehacer.
function createFramesSnapshotCommand(apply) {
  let before = null;
  let after = null;

  return {
    do(project) {
      if (after === null) {
        before = { frames: [...project.frames], activeFrameIndex: project.activeFrameIndex };
        apply(project);
        after = { frames: [...project.frames], activeFrameIndex: project.activeFrameIndex };
        return;
      }
      project.frames = [...after.frames];
      project.activeFrameIndex = after.activeFrameIndex;
    },
    undo(project) {
      project.frames = [...before.frames];
      project.activeFrameIndex = before.activeFrameIndex;
    },
  };
}

export function createAddFrameCommand() {
  return createFramesSnapshotCommand((project) => addFrame(project, project.activeFrameIndex));
}

export function createDuplicateFrameCommand() {
  return createFramesSnapshotCommand((project) => duplicateFrame(project, project.activeFrameIndex));
}

export function createRemoveFrameCommand(index) {
  return createFramesSnapshotCommand((project) => removeFrame(project, index));
}

export function createMoveFrameCommand(fromIndex, toIndex) {
  return createFramesSnapshotCommand((project) => moveFrame(project, fromIndex, toIndex));
}

export function createResizeProjectCommand(newWidth, newHeight) {
  let before = null;
  let after = null;

  function snapshot(project) {
    return {
      width: project.width,
      height: project.height,
      layersByFrame: project.frames.map((frame) => [frame, frame.doc.layers]),
    };
  }

  function restore(project, state) {
    project.width = state.width;
    project.height = state.height;
    for (const [frame, layers] of state.layersByFrame) {
      frame.doc.layers = layers;
      frame.doc.width = state.width;
      frame.doc.height = state.height;
    }
  }

  return {
    do(project) {
      if (after === null) {
        before = snapshot(project);
        resizeProject(project, newWidth, newHeight);
        after = snapshot(project);
        return;
      }
      restore(project, after);
    },
    undo(project) {
      restore(project, before);
    },
  };
}
