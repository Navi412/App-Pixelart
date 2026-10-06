import { composeLayers } from '../core/document.js';

const CHECKER_LIGHT = '#ffffff';
const CHECKER_DARK = '#cccccc';
const GRID_MIN_ZOOM = 6; // por debajo, las líneas taparían el dibujo
const GRID_COLOR = 'rgba(0, 0, 0, 0.14)';

function drawCheckerboard(ctx, pxWidth, pxHeight, checkerCell) {
  for (let y = 0; y < pxHeight; y += checkerCell) {
    for (let x = 0; x < pxWidth; x += checkerCell) {
      const isLight = ((x / checkerCell) + (y / checkerCell)) % 2 === 0;
      ctx.fillStyle = isLight ? CHECKER_LIGHT : CHECKER_DARK;
      ctx.fillRect(x, y, checkerCell, checkerCell);
    }
  }
}

function docToCanvas(doc) {
  const offscreen = document.createElement('canvas');
  offscreen.width = doc.width;
  offscreen.height = doc.height;
  offscreen.getContext('2d').putImageData(new ImageData(composeLayers(doc), doc.width, doc.height), 0, 0);
  return offscreen;
}

const ONION_SKIN_ALPHA = 0.35;

function drawOnionSkin(ctx, onionSkinDoc, width, height, zoom) {
  ctx.globalAlpha = ONION_SKIN_ALPHA;
  ctx.drawImage(docToCanvas(onionSkinDoc), 0, 0, onionSkinDoc.width, onionSkinDoc.height, 0, 0, width * zoom, height * zoom);
  ctx.globalAlpha = 1;
}

function drawOverlay(ctx, overlay, zoom) {
  for (const { x, y, color } of overlay) {
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
  }
}

function drawGrid(ctx, doc, zoom) {
  ctx.fillStyle = GRID_COLOR;
  for (let x = 1; x < doc.width; x++) ctx.fillRect(x * zoom, 0, 1, doc.height * zoom);
  for (let y = 1; y < doc.height; y++) ctx.fillRect(0, y * zoom, doc.width * zoom, 1);
}

function drawSelection(ctx, selectionRect, zoom) {
  const { x, y, width, height } = selectionRect;
  // Se lee en cada pintado: el acento cambia con el tema claro/oscuro.
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff6a2c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x * zoom + 1, y * zoom + 1, width * zoom - 2, height * zoom - 2);
}

export function render(ctx, doc, zoom, { overlay, selectionRect, onionSkinDoc, grid } = {}) {
  const pxWidth = doc.width * zoom;
  const pxHeight = doc.height * zoom;

  if (ctx.canvas.width !== pxWidth) ctx.canvas.width = pxWidth;
  if (ctx.canvas.height !== pxHeight) ctx.canvas.height = pxHeight;
  ctx.imageSmoothingEnabled = false;

  drawCheckerboard(ctx, pxWidth, pxHeight, zoom);

  if (onionSkinDoc) drawOnionSkin(ctx, onionSkinDoc, doc.width, doc.height, zoom);

  ctx.drawImage(docToCanvas(doc), 0, 0, doc.width, doc.height, 0, 0, pxWidth, pxHeight);

  if (overlay) drawOverlay(ctx, overlay, zoom);
  if (grid && zoom >= GRID_MIN_ZOOM) drawGrid(ctx, doc, zoom);
  if (selectionRect) drawSelection(ctx, selectionRect, zoom);
}
