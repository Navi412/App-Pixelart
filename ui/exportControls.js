import { composeLayers } from './canvas.js';
import { attachTooltip } from './tooltip.js';

function downloadCanvas(canvasEl, filename) {
  canvasEl.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function createExportControls({ pngButton, spritesheetButton, project, getCurrentDoc }) {
  attachTooltip(pngButton, { title: 'Exportar PNG', description: 'Descarga el fotograma actual como imagen' });
  pngButton.addEventListener('click', () => {
    const doc = getCurrentDoc();
    const offscreen = document.createElement('canvas');
    offscreen.width = doc.width;
    offscreen.height = doc.height;
    const composited = composeLayers(doc);
    offscreen.getContext('2d').putImageData(new ImageData(composited, doc.width, doc.height), 0, 0);
    downloadCanvas(offscreen, 'sprite.png');
  });

  attachTooltip(spritesheetButton, {
    title: 'Exportar spritesheet',
    description: 'Descarga todos los fotogramas en una sola imagen',
  });
  spritesheetButton.addEventListener('click', () => {
    const frameWidth = project.width;
    const frameHeight = project.height;
    const sheet = document.createElement('canvas');
    sheet.width = frameWidth * project.frames.length;
    sheet.height = frameHeight;
    const sheetCtx = sheet.getContext('2d');

    project.frames.forEach((frame, index) => {
      const composited = composeLayers(frame.doc);
      const off = document.createElement('canvas');
      off.width = frameWidth;
      off.height = frameHeight;
      off.getContext('2d').putImageData(new ImageData(composited, frameWidth, frameHeight), 0, 0);
      sheetCtx.drawImage(off, index * frameWidth, 0);
    });

    downloadCanvas(sheet, 'spritesheet.png');
  });
}
