import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

function insideRect(rect, x, y) {
  return !!rect && x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

function clampRect(rect, width, height) {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(width, rect.x + rect.width);
  const y1 = Math.min(height, rect.y + rect.height);
  return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
}

function createMoveCommand(layerIndex, width, height, originRect, floatingCells, dx, dy) {
  let changes = null;

  function computeChanges(layer) {
    const map = new Map();

    for (let cy = 0; cy < originRect.height; cy++) {
      for (let cx = 0; cx < originRect.width; cx++) {
        const x = originRect.x + cx;
        const y = originRect.y + cy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        map.set(`${x},${y}`, { x, y, before: getPixel(layer, width, x, y), after: TRANSPARENT });
      }
    }

    for (const cell of floatingCells) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const existing = map.get(`${x},${y}`);
      const before = existing ? existing.before : getPixel(layer, width, x, y);
      map.set(`${x},${y}`, { x, y, before, after: cell.color });
    }

    return [...map.values()];
  }

  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (changes === null) changes = computeChanges(layer);
      for (const { x, y, after } of changes) setPixel(layer, width, x, y, after);
    },
    undo(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x, y, before } of changes) setPixel(layer, width, x, y, before);
    },
  };
}

export function createSelectionTool({ getSelection, setSelection }) {
  let mode = null;
  let dragStart = null;
  let originRect = null;
  let floatingCells = null;
  let offset = { dx: 0, dy: 0 };

  return {
    onPointerDown(context, x, y) {
      const sel = getSelection();
      dragStart = { x, y };
      offset = { dx: 0, dy: 0 };

      if (insideRect(sel, x, y)) {
        mode = 'move';
        originRect = sel;
        const layer = context.doc.layers[context.doc.activeLayerIndex];
        floatingCells = [];
        for (let cy = 0; cy < sel.height; cy++) {
          for (let cx = 0; cx < sel.width; cx++) {
            const cellX = sel.x + cx;
            const cellY = sel.y + cy;
            floatingCells.push({ x: cellX, y: cellY, color: getPixel(layer, context.doc.width, cellX, cellY) });
          }
        }
      } else {
        mode = 'select';
        setSelection({ x, y, width: 1, height: 1 });
      }
    },
    onPointerMove(context, x, y) {
      if (!dragStart) return;
      if (mode === 'select') {
        const x0 = Math.min(dragStart.x, x);
        const x1 = Math.max(dragStart.x, x);
        const y0 = Math.min(dragStart.y, y);
        const y1 = Math.max(dragStart.y, y);
        setSelection(clampRect({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, context.doc.width, context.doc.height));
      } else if (mode === 'move') {
        offset = { dx: x - dragStart.x, dy: y - dragStart.y };
      }
    },
    onPointerUp(context) {
      if (mode === 'move' && floatingCells && (offset.dx !== 0 || offset.dy !== 0)) {
        const { doc, history } = context;
        execute(
          history,
          doc,
          createMoveCommand(doc.activeLayerIndex, doc.width, doc.height, originRect, floatingCells, offset.dx, offset.dy),
        );
        setSelection(
          clampRect(
            { x: originRect.x + offset.dx, y: originRect.y + offset.dy, width: originRect.width, height: originRect.height },
            doc.width,
            doc.height,
          ),
        );
      }
      mode = null;
      dragStart = null;
      originRect = null;
      floatingCells = null;
      offset = { dx: 0, dy: 0 };
    },
    getPreview() {
      if (mode !== 'move' || !floatingCells) return null;
      return floatingCells.map((c) => ({ x: c.x + offset.dx, y: c.y + offset.dy, color: c.color }));
    },
  };
}
