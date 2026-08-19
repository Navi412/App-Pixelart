import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../core/document.js';
import { setPixel } from '../core/layer.js';
import { createEyedropperTool } from '../tools/eyedropper.js';

const RED = { r: 255, g: 0, b: 0, a: 255 };

test('onPointerDown llama a onPick con el color del píxel muestreado', () => {
  const doc = createDocument(4, 4);
  setPixel(doc.layers[0], 4, 2, 2, RED);

  let picked = null;
  const eyedropper = createEyedropperTool((color) => {
    picked = color;
  });

  eyedropper.onPointerDown({ doc }, 2, 2);

  assert.deepEqual(picked, RED);
});

test('onPointerMove también actualiza el color mientras se arrastra', () => {
  const doc = createDocument(4, 4);
  setPixel(doc.layers[0], 4, 0, 0, RED);

  const picks = [];
  const eyedropper = createEyedropperTool((color) => picks.push(color));

  eyedropper.onPointerDown({ doc }, 1, 1);
  eyedropper.onPointerMove({ doc }, 0, 0);

  assert.equal(picks.length, 2);
  assert.deepEqual(picks[1], RED);
});
