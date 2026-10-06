import { createHistory } from './history.js';
import { normalizeLayerStructure } from './project.js';

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

// RLE de píxeles RGBA: secuencia de [longitud (varint), r, g, b, a].
// El píxel art tiene grandes zonas de un solo color (sobre todo transparente),
// así que ocupa una fracción del tamaño en crudo y cabe mucho más en localStorage.
export function encodeRle(pixels) {
  const out = [];
  const pixelCount = pixels.length / 4;
  let i = 0;

  while (i < pixelCount) {
    const o = i * 4;
    let run = 1;
    while (
      i + run < pixelCount &&
      pixels[o + run * 4] === pixels[o] &&
      pixels[o + run * 4 + 1] === pixels[o + 1] &&
      pixels[o + run * 4 + 2] === pixels[o + 2] &&
      pixels[o + run * 4 + 3] === pixels[o + 3]
    ) {
      run++;
    }

    let n = run;
    while (n >= 0x80) {
      out.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    out.push(n, pixels[o], pixels[o + 1], pixels[o + 2], pixels[o + 3]);
    i += run;
  }

  return Uint8Array.from(out);
}

export function decodeRle(bytes, pixelCount) {
  const pixels = new Uint8ClampedArray(pixelCount * 4);
  let p = 0;
  let i = 0;

  while (i < bytes.length && p < pixels.length) {
    let run = 0;
    let shift = 0;
    let byte;
    do {
      byte = bytes[i++];
      run |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);

    const [r, g, b, a] = [bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]];
    i += 4;
    for (let k = 0; k < run && p < pixels.length; k++, p += 4) {
      pixels[p] = r;
      pixels[p + 1] = g;
      pixels[p + 2] = b;
      pixels[p + 3] = a;
    }
  }

  return pixels;
}

export function serializeProject(project) {
  return {
    version: 2,
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
        encoding: 'rle',
        pixels: bytesToBase64(encodeRle(layer.pixels)),
      })),
    })),
  };
}

export function deserializeProject(data) {
  const { width, height } = data;
  const project = {
    width,
    height,
    activeFrameIndex: data.activeFrameIndex ?? 0,
    fps: data.fps ?? 12,
    history: createHistory(),
    frames: data.frames.map((frameData) => ({
      doc: {
        width,
        height,
        activeLayerIndex: frameData.activeLayerIndex,
        layers: frameData.layers.map((layer) => ({
          id: crypto.randomUUID(),
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity ?? 1,
          pixels:
            layer.encoding === 'rle'
              ? decodeRle(base64ToBytes(layer.pixels), width * height)
              : base64ToBytes(layer.pixels),
        })),
      },
    })),
  };
  return normalizeLayerStructure(project);
}
