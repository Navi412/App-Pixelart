// Codificador de GIF animado (GIF89a) sin dependencias.
// - Paleta global de hasta 256 colores. Si el dibujo tiene más, se reduce la
//   precisión de los canales hasta que caben (raro en píxel art).
// - Los píxeles con alfa < 128 se vuelven transparentes (GIF no tiene alfa parcial).
// - Bucle infinito (extensión NETSCAPE2.0) y disposal "restaurar a fondo", para
//   que los fotogramas con transparencia no se acumulen unos encima de otros.

const ALPHA_THRESHOLD = 128;

export function scalePixels(pixels, width, height, scale) {
  if (scale === 1) return pixels;
  const outWidth = width * scale;
  const out = new Uint8ClampedArray(outWidth * height * scale * 4);
  for (let y = 0; y < height * scale; y++) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < outWidth; x++) {
      const src = (sy * width + Math.floor(x / scale)) * 4;
      const dst = (y * outWidth + x) * 4;
      out[dst] = pixels[src];
      out[dst + 1] = pixels[src + 1];
      out[dst + 2] = pixels[src + 2];
      out[dst + 3] = pixels[src + 3];
    }
  }
  return out;
}

function buildPalette(frames) {
  let hasTransparency = false;
  for (const pixels of frames) {
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < ALPHA_THRESHOLD) {
        hasTransparency = true;
        break;
      }
    }
    if (hasTransparency) break;
  }

  const maxColors = hasTransparency ? 255 : 256;

  for (let shift = 0; shift < 8; shift++) {
    const keyOf = (r, g, b) => ((r >> shift) << 16) | ((g >> shift) << 8) | (b >> shift);
    const colors = new Map();
    let overflow = false;

    for (const pixels of frames) {
      for (let i = 0; i < pixels.length && !overflow; i += 4) {
        if (pixels[i + 3] < ALPHA_THRESHOLD) continue;
        const key = keyOf(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (colors.has(key)) continue;
        if (colors.size >= maxColors) overflow = true;
        else colors.set(key, [pixels[i], pixels[i + 1], pixels[i + 2]]);
      }
      if (overflow) break;
    }

    if (overflow) continue;

    const offset = hasTransparency ? 1 : 0;
    const indexOf = new Map([...colors.keys()].map((key, i) => [key, i + offset]));
    const entries = hasTransparency ? [[0, 0, 0], ...colors.values()] : [...colors.values()];
    return { entries, indexOf, keyOf, hasTransparency };
  }

  throw new Error('No se pudo construir la paleta del GIF');
}

export function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let table = new Map();

  const out = [];
  let buffer = 0;
  let bufferBits = 0;
  const write = (code) => {
    buffer |= code << bufferBits;
    bufferBits += codeSize;
    while (bufferBits >= 8) {
      out.push(buffer & 0xff);
      buffer >>>= 8;
      bufferBits -= 8;
    }
  };

  write(clearCode);
  let prefix = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 4096 + k;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }

    write(prefix);
    if (nextCode === 4096) {
      write(clearCode);
      table = new Map();
      codeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
    } else {
      // El decodificador va un código "por detrás": se ensancha justo antes de
      // crear la primera entrada que ya no cabe en el tamaño actual.
      if (nextCode >= 1 << codeSize) codeSize++;
      table.set(key, nextCode++);
    }
    prefix = k;
  }

  write(prefix);
  write(eoiCode);
  if (bufferBits > 0) out.push(buffer & 0xff);
  return out;
}

class ByteWriter {
  constructor() {
    this.bytes = [];
  }
  byte(b) {
    this.bytes.push(b & 0xff);
  }
  u16(n) {
    this.byte(n);
    this.byte(n >> 8);
  }
  ascii(text) {
    for (const ch of text) this.byte(ch.charCodeAt(0));
  }
  all(list) {
    for (const b of list) this.byte(b);
  }
}

// frames: array de Uint8ClampedArray RGBA de width*height (ya escalados si hace falta).
export function encodeGif({ width, height, frames, delayMs = 100 }) {
  const { entries, indexOf, keyOf, hasTransparency } = buildPalette(frames);

  let tableBits = 1;
  while (1 << tableBits < Math.max(2, entries.length)) tableBits++;
  const tableSize = 1 << tableBits;
  const minCodeSize = Math.max(2, tableBits);
  const delay = Math.max(2, Math.round(delayMs / 10));

  const w = new ByteWriter();
  w.ascii('GIF89a');
  w.u16(width);
  w.u16(height);
  w.byte(0x80 | ((tableBits - 1) << 4) | (tableBits - 1));
  w.byte(0); // color de fondo
  w.byte(0); // proporción de píxel
  for (let i = 0; i < tableSize; i++) w.all(entries[i] ?? [0, 0, 0]);

  // Bucle infinito
  w.all([0x21, 0xff, 0x0b]);
  w.ascii('NETSCAPE2.0');
  w.all([0x03, 0x01, 0x00, 0x00, 0x00]);

  for (const pixels of frames) {
    w.all([0x21, 0xf9, 0x04, (2 << 2) | (hasTransparency ? 1 : 0)]);
    w.u16(delay);
    w.all([0, 0]);

    w.byte(0x2c);
    w.u16(0);
    w.u16(0);
    w.u16(width);
    w.u16(height);
    w.byte(0);

    const indices = new Uint8Array(width * height);
    for (let p = 0, i = 0; p < indices.length; p++, i += 4) {
      indices[p] = pixels[i + 3] < ALPHA_THRESHOLD ? 0 : indexOf.get(keyOf(pixels[i], pixels[i + 1], pixels[i + 2]));
    }

    w.byte(minCodeSize);
    const data = lzwEncode(indices, minCodeSize);
    for (let i = 0; i < data.length; i += 255) {
      const block = data.slice(i, i + 255);
      w.byte(block.length);
      w.all(block);
    }
    w.byte(0);
  }

  w.byte(0x3b);
  return Uint8Array.from(w.bytes);
}
