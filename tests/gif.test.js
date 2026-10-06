import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeGif, lzwEncode, scalePixels } from '../core/gif.js';

// Decodificador LZW de GIF estándar, solo para verificar el codificador.
function lzwDecode(bytes, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < clearCode; i++) dict.push([i]);
    dict.push(null, null);
    codeSize = minCodeSize + 1;
  };
  reset();

  const out = [];
  let bitPos = 0;
  let prev = null;
  const read = () => {
    let code = 0;
    for (let i = 0; i < codeSize; i++, bitPos++) {
      if (bytes[bitPos >> 3] & (1 << (bitPos & 7))) code |= 1 << i;
    }
    return code;
  };

  while (bitPos < bytes.length * 8) {
    const code = read();
    if (code === clearCode) {
      reset();
      prev = null;
      continue;
    }
    if (code === eoiCode) break;
    let entry;
    if (prev === null) {
      entry = dict[code];
    } else if (code < dict.length) {
      entry = dict[code];
      dict.push([...dict[prev], entry[0]]);
    } else {
      entry = [...dict[prev], dict[prev][0]];
      dict.push(entry);
    }
    out.push(...entry);
    if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
    prev = code;
  }
  return out;
}

test('LZW: el resultado se decodifica igual, también pasando de 4096 códigos', () => {
  let seed = 7;
  const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 16;
  const indices = Array.from({ length: 30000 }, (_, i) => (i % 97 < 50 ? random() : i % 3));

  const decoded = lzwDecode(lzwEncode(indices, 4), 4);

  assert.deepEqual(decoded, indices);
});

test('LZW: un único índice', () => {
  assert.deepEqual(lzwDecode(lzwEncode([1], 2), 2), [1]);
});

test('encodeGif genera cabecera, tamaño, bucle y terminador correctos', () => {
  const red = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]);
  const blue = new Uint8ClampedArray([0, 0, 255, 255, 0, 0, 255, 255]);

  const gif = encodeGif({ width: 2, height: 1, frames: [red, blue], delayMs: 100 });
  const text = String.fromCharCode(...gif);

  assert.equal(text.slice(0, 6), 'GIF89a');
  assert.equal(gif[6] | (gif[7] << 8), 2);
  assert.equal(gif[8] | (gif[9] << 8), 1);
  assert.ok(text.includes('NETSCAPE2.0'));
  assert.equal(gif[gif.length - 1], 0x3b);
  // Dos fotogramas = dos bloques de control gráfico, con transparencia activada.
  const gce = [...text.matchAll(/\x21\xf9\x04/g)].map((m) => m.index);
  assert.equal(gce.length, 2);
  assert.equal(gif[gce[0] + 3] & 1, 1);
  assert.equal(gif[gce[0] + 4], 10); // 100 ms = 10 centésimas
});

test('encodeGif reduce la paleta si hay más de 256 colores', () => {
  const pixels = new Uint8ClampedArray(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) pixels.set([i % 256, (i * 7) % 256, Math.floor(i / 4) % 256, 255], i * 4);

  assert.doesNotThrow(() => encodeGif({ width: 32, height: 32, frames: [pixels] }));
});

test('scalePixels agranda sin suavizar', () => {
  const pixels = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]);

  const scaled = scalePixels(pixels, 2, 1, 2);

  assert.equal(scaled.length, 4 * 2 * 4);
  assert.deepEqual([...scaled.slice(0, 16)], [1, 2, 3, 4, 1, 2, 3, 4, 5, 6, 7, 8, 5, 6, 7, 8]);
  assert.deepEqual([...scaled.slice(16, 20)], [1, 2, 3, 4]);
});
