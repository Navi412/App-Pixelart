const CHECKER_LIGHT = '#ffffff';
const CHECKER_DARK = '#cccccc';
const ACCENT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3d8fd6';

function drawCheckerboard(ctx, pxWidth, pxHeight, checkerCell) {
  for (let y = 0; y < pxHeight; y += checkerCell) {
    for (let x = 0; x < pxWidth; x += checkerCell) {
      const isLight = ((x / checkerCell) + (y / checkerCell)) % 2 === 0;
      ctx.fillStyle = isLight ? CHECKER_LIGHT : CHECKER_DARK;
      ctx.fillRect(x, y, checkerCell, checkerCell);
    }
  }
}

export function composeLayers(doc) {
  const { width, height, layers } = doc;
  const out = new Uint8ClampedArray(width * height * 4);

  for (const layer of layers) {
    if (!layer.visible) continue;
    const { pixels, opacity } = layer;

    for (let i = 0; i < pixels.length; i += 4) {
      const srcA = (pixels[i + 3] / 255) * opacity;
      if (srcA <= 0) continue;

      const dstA = out[i + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA <= 0) {
        out[i + 3] = 0;
        continue;
      }

      out[i] = (pixels[i] * srcA + out[i] * dstA * (1 - srcA)) / outA;
      out[i + 1] = (pixels[i + 1] * srcA + out[i + 1] * dstA * (1 - srcA)) / outA;
      out[i + 2] = (pixels[i + 2] * srcA + out[i + 2] * dstA * (1 - srcA)) / outA;
      out[i + 3] = outA * 255;
    }
  }

  return out;
}

function drawOverlay(ctx, overlay, zoom) {
  for (const { x, y, color } of overlay) {
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
  }
}

function drawSelection(ctx, selectionRect, zoom) {
  const { x, y, width, height } = selectionRect;
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(x * zoom + 1, y * zoom + 1, width * zoom - 2, height * zoom - 2);
}

export function render(ctx, doc, zoom, { overlay, selectionRect } = {}) {
  const pxWidth = doc.width * zoom;
  const pxHeight = doc.height * zoom;

  if (ctx.canvas.width !== pxWidth) ctx.canvas.width = pxWidth;
  if (ctx.canvas.height !== pxHeight) ctx.canvas.height = pxHeight;
  ctx.imageSmoothingEnabled = false;

  drawCheckerboard(ctx, pxWidth, pxHeight, zoom);

  const composited = composeLayers(doc);
  const offscreen = document.createElement('canvas');
  offscreen.width = doc.width;
  offscreen.height = doc.height;
  const offCtx = offscreen.getContext('2d');
  offCtx.putImageData(new ImageData(composited, doc.width, doc.height), 0, 0);

  ctx.drawImage(offscreen, 0, 0, doc.width, doc.height, 0, 0, pxWidth, pxHeight);

  if (overlay) drawOverlay(ctx, overlay, zoom);
  if (selectionRect) drawSelection(ctx, selectionRect, zoom);
}
