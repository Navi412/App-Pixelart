import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';
import { mirrorCells } from '../core/mirror.js';

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

function createFloodFillCommand(layerIndex, width, height, startX, startY, targetColor, fillColor, mirror) {
  let changes = null;

  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (changes === null) {
        const base = floodFillChanges(layer, width, height, startX, startY, targetColor);
        const map = new Map(base.map((c) => [`${c.x},${c.y}`, c]));
        for (const { x, y } of mirrorCells(base, width, height, mirror)) {
          const key = `${x},${y}`;
          if (!map.has(key)) map.set(key, { x, y, before: getPixel(layer, width, x, y) });
        }
        changes = [...map.values()];
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
      const { doc, history, color, mirror } = context;
      const layer = doc.layers[doc.activeLayerIndex];
      const target = getPixel(layer, doc.width, x, y);
      if (colorsEqual(target, color)) return;

      const command = createFloodFillCommand(doc.activeLayerIndex, doc.width, doc.height, x, y, target, color, mirror);
      execute(history, doc, command);
    },
    onPointerMove() {},
    onPointerUp() {},
    getCursor(context, x, y) {
      const { doc, mirror, color } = context;
      return { cells: mirrorCells([{ x, y }], doc.width, doc.height, mirror), color };
    },
  };
}
