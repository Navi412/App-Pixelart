import { createHistory } from './history.js';

const CHUNK_SIZE = 8192;

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function serializeProject(project) {
  return {
    width: project.width,
    height: project.height,
    activeFrameIndex: project.activeFrameIndex,
    fps: project.fps,
    frames: project.frames.map((frame) => ({
      activeLayerIndex: frame.doc.activeLayerIndex,
      layers: frame.doc.layers.map((layer) => ({
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        pixels: bytesToBase64(layer.pixels),
      })),
    })),
  };
}

export function deserializeProject(data) {
  const { width, height } = data;
  return {
    width,
    height,
    activeFrameIndex: data.activeFrameIndex ?? 0,
    fps: data.fps ?? 12,
    frames: data.frames.map((frameData) => ({
      doc: {
        width,
        height,
        activeLayerIndex: frameData.activeLayerIndex,
        layers: frameData.layers.map((layer) => ({
          id: crypto.randomUUID(),
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          pixels: base64ToBytes(layer.pixels),
        })),
      },
      history: createHistory(),
    })),
  };
}
