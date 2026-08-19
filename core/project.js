import { createDocument } from './document.js';
import { createHistory } from './history.js';
import { resizeLayerPixels } from './layer.js';

function createFrame(width, height) {
  return { doc: createDocument(width, height), history: createHistory() };
}

export function createProject(width, height) {
  return {
    width,
    height,
    frames: [createFrame(width, height)],
    activeFrameIndex: 0,
    fps: 12,
  };
}

export function getActiveFrame(project) {
  return project.frames[project.activeFrameIndex];
}

export function addFrame(project) {
  project.frames.push(createFrame(project.width, project.height));
  project.activeFrameIndex = project.frames.length - 1;
  return project.activeFrameIndex;
}

export function duplicateFrame(project, index) {
  const source = project.frames[index];
  const copy = createFrame(project.width, project.height);
  copy.doc.activeLayerIndex = source.doc.activeLayerIndex;
  copy.doc.layers = source.doc.layers.map((layer) => ({
    ...layer,
    id: crypto.randomUUID(),
    pixels: layer.pixels.slice(),
  }));
  project.frames.splice(index + 1, 0, copy);
  project.activeFrameIndex = index + 1;
  return project.activeFrameIndex;
}

export function removeFrame(project, index) {
  if (project.frames.length <= 1) return false;
  project.frames.splice(index, 1);
  project.activeFrameIndex = Math.min(project.activeFrameIndex, project.frames.length - 1);
  return true;
}

export function applyProjectData(project, data) {
  project.width = data.width;
  project.height = data.height;
  project.frames = data.frames;
  project.activeFrameIndex = data.activeFrameIndex;
  project.fps = data.fps;
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
