import { composeLayers } from '../core/document.js';
import { encodeGif, scalePixels } from '../core/gif.js';
import { attachTooltip } from './tooltip.js';
import { showToast } from './toast.js';

const SCALES = [1, 2, 4, 8, 16];
const DEFAULT_SCALE = 4;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pixelsToPngBlob(pixels, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Nombre de archivo a partir del nombre del proyecto, sin caracteres que Windows no admite.
function baseFilename(name) {
  const clean = (name || '').replace(/[\\/:*?"<>|]+/g, '').trim();
  return clean || 'sprite';
}

export function createExportControls({ toggleButton, panelEl, scaleEl, pngButton, spritesheetButton, gifButton, project, getCurrentDoc, getProjectName }) {
  let scale = DEFAULT_SCALE;

  attachTooltip(toggleButton, { title: 'Exportar', description: 'PNG, spritesheet o GIF animado, al tamaño que elijas' });
  toggleButton.addEventListener('click', () => {
    panelEl.classList.toggle('is-open');
    toggleButton.classList.toggle('is-pressed', panelEl.classList.contains('is-open'));
  });

  const scaleButtons = SCALES.map((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-chip';
    button.textContent = `×${value}`;
    button.addEventListener('click', () => {
      scale = value;
      updateScaleButtons();
    });
    scaleEl.appendChild(button);
    return { value, button };
  });

  function updateScaleButtons() {
    for (const { value, button } of scaleButtons) {
      button.classList.toggle('is-pressed', value === scale);
      button.setAttribute('aria-pressed', String(value === scale));
    }
  }
  updateScaleButtons();

  const suffix = () => (scale > 1 ? `@${scale}x` : '');

  attachTooltip(pngButton, { title: 'Exportar PNG', description: 'El fotograma actual como imagen' });
  pngButton.addEventListener('click', async () => {
    const doc = getCurrentDoc();
    const pixels = scalePixels(composeLayers(doc), doc.width, doc.height, scale);
    const blob = await pixelsToPngBlob(pixels, doc.width * scale, doc.height * scale);
    downloadBlob(blob, `${baseFilename(getProjectName())}${suffix()}.png`);
  });

  attachTooltip(spritesheetButton, { title: 'Exportar spritesheet', description: 'Todos los fotogramas en fila en una sola imagen' });
  spritesheetButton.addEventListener('click', async () => {
    const { width, height, frames } = project;
    const sheetWidth = width * frames.length;
    const sheet = new Uint8ClampedArray(sheetWidth * height * 4);

    frames.forEach((frame, index) => {
      const composited = composeLayers(frame.doc);
      for (let y = 0; y < height; y++) {
        sheet.set(composited.subarray(y * width * 4, (y + 1) * width * 4), (y * sheetWidth + index * width) * 4);
      }
    });

    const blob = await pixelsToPngBlob(scalePixels(sheet, sheetWidth, height, scale), sheetWidth * scale, height * scale);
    downloadBlob(blob, `${baseFilename(getProjectName())}-spritesheet${suffix()}.png`);
  });

  attachTooltip(gifButton, {
    title: 'Exportar GIF',
    description: 'Animación en bucle a los FPS de la timeline. Las semitransparencias se convierten en opaco o transparente',
  });
  gifButton.addEventListener('click', () => {
    const { width, height, frames, fps } = project;
    try {
      const gif = encodeGif({
        width: width * scale,
        height: height * scale,
        frames: frames.map((frame) => scalePixels(composeLayers(frame.doc), width, height, scale)),
        delayMs: 1000 / fps,
      });
      downloadBlob(new Blob([gif], { type: 'image/gif' }), `${baseFilename(getProjectName())}${suffix()}.gif`);
    } catch {
      showToast('No se pudo generar el GIF', { kind: 'error' });
    }
  });
}
