import { execute } from '../core/history.js';
import { getPixel, setPixel } from '../core/layer.js';
import { mirrorCells } from '../core/mirror.js';

function clip(cells, width, height) {
  return cells.filter((c) => c.x >= 0 && c.y >= 0 && c.x < width && c.y < height);
}

function createCellsCommand(layerIndex, width, cells, color) {
  let changes = null;
  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (changes === null) {
        changes = cells.map((c) => ({ ...c, before: getPixel(layer, width, c.x, c.y) }));
      }
      for (const { x, y } of changes) setPixel(layer, width, x, y, color);
    },
    undo(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x, y, before } of changes) setPixel(layer, width, x, y, before);
    },
  };
}

export function createShapeTool(cellsFn) {
  let start = null;
  let current = null;
  let previewColor = null;
  let previewMirror = null;
  let previewWidth = null;
  let previewHeight = null;

  function trackPreviewState(context) {
    previewColor = context.color;
    previewMirror = context.mirror;
    previewWidth = context.doc.width;
    previewHeight = context.doc.height;
  }

  return {
    onPointerDown(context, x, y) {
      start = { x, y };
      current = { x, y };
      trackPreviewState(context);
    },
    onPointerMove(context, x, y) {
      if (!start) return;
      current = { x, y };
      trackPreviewState(context);
    },
    onPointerUp(context) {
      if (!start || !current) return;
      const { doc, history, color, mirror } = context;
      const clipped = clip(cellsFn(start.x, start.y, current.x, current.y), doc.width, doc.height);
      const cells = mirrorCells(clipped, doc.width, doc.height, mirror);
      if (cells.length > 0) {
        execute(history, doc, createCellsCommand(doc.activeLayerIndex, doc.width, cells, color));
      }
      start = null;
      current = null;
    },
    getPreview() {
      if (!start || !current) return null;
      const clipped = clip(cellsFn(start.x, start.y, current.x, current.y), previewWidth, previewHeight);
      const cells = mirrorCells(clipped, previewWidth, previewHeight, previewMirror);
      return cells.map((c) => ({ ...c, color: previewColor }));
    },
  };
}
