import test from 'node:test';
import assert from 'node:assert/strict';
import { hsvToRgb, rgbToHex } from '../core/color.js';

test('hue 0 con saturación y valor máximos da rojo puro', () => {
  assert.deepEqual(hsvToRgb(0, 1, 1), { r: 255, g: 0, b: 0, a: 255 });
});

test('hue 120 con saturación y valor máximos da verde puro', () => {
  assert.deepEqual(hsvToRgb(120, 1, 1), { r: 0, g: 255, b: 0, a: 255 });
});

test('hue 240 con saturación y valor máximos da azul puro', () => {
  assert.deepEqual(hsvToRgb(240, 1, 1), { r: 0, g: 0, b: 255, a: 255 });
});

test('saturación 0 da un gris igual al valor, sin importar el hue', () => {
  assert.deepEqual(hsvToRgb(200, 0, 0.5), { r: 128, g: 128, b: 128, a: 255 });
});

test('valor 0 siempre da negro', () => {
  assert.deepEqual(hsvToRgb(90, 1, 0), { r: 0, g: 0, b: 0, a: 255 });
});

test('rgbToHex formatea con ceros a la izquierda', () => {
  assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), '#000000');
  assert.equal(rgbToHex({ r: 255, g: 165, b: 1 }), '#ffa501');
});
