const CHECKER_CELL = 8;
const CHECKER_LIGHT = '#ffffff';
const CHECKER_DARK = '#cccccc';

function drawCheckerboard(ctx, pxWidth, pxHeight) {
  for (let y = 0; y < pxHeight; y += CHECKER_CELL) {
    for (let x = 0; x < pxWidth; x += CHECKER_CELL) {
      const isLight = ((x / CHECKER_CELL) + (y / CHECKER_CELL)) % 2 === 0;
      ctx.fillStyle = isLight ? CHECKER_LIGHT : CHECKER_DARK;
      ctx.fillRect(x, y, CHECKER_CELL, CHECKER_CELL);
    }
  }
}

function composeLayers(doc) {
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

export function render(ctx, doc, zoom) {
  const pxWidth = doc.width * zoom;
  const pxHeight = doc.height * zoom;

  if (ctx.canvas.width !== pxWidth) ctx.canvas.width = pxWidth;
  if (ctx.canvas.height !== pxHeight) ctx.canvas.height = pxHeight;
  ctx.imageSmoothingEnabled = false;

  drawCheckerboard(ctx, pxWidth, pxHeight);

  const composited = composeLayers(doc);
  const offscreen = document.createElement('canvas');
  offscreen.width = doc.width;
  offscreen.height = doc.height;
  const offCtx = offscreen.getContext('2d');
  offCtx.putImageData(new ImageData(composited, doc.width, doc.height), 0, 0);

  ctx.drawImage(offscreen, 0, 0, doc.width, doc.height, 0, 0, pxWidth, pxHeight);
}
