import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';

function colorsEqual(a, b) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function floodFillChanges(layer, width, height, startX, startY, targetColor) {
  const changes = [];
  const visited = new Uint8Array(width * height);
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;

    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const current = getPixel(layer, width, x, y);
    if (!colorsEqual(current, targetColor)) continue;

    changes.push({ x, y, before: current });
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return changes;
}

function createFloodFillCommand(layerIndex, width, height, startX, startY, targetColor, fillColor) {
  let changes = null;

  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (changes === null) {
        changes = floodFillChanges(layer, width, height, startX, startY, targetColor);
      }
      for (const { x, y } of changes) {
        setPixel(layer, width, x, y, fillColor);
      }
    },
    undo(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x, y, before } of changes) {
        setPixel(layer, width, x, y, before);
      }
    },
  };
}

export function createBucketTool() {
  return {
    onPointerDown(context, x, y) {
      const { doc, history, color } = context;
      const layer = doc.layers[doc.activeLayerIndex];
      const target = getPixel(layer, doc.width, x, y);
      if (colorsEqual(target, color)) return;

      const command = createFloodFillCommand(doc.activeLayerIndex, doc.width, doc.height, x, y, target, color);
      execute(history, doc, command);
    },
    onPointerMove() {},
    onPointerUp() {},
  };
}
