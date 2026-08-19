import { execute } from '../core/history.js';
import { createAddLayerCommand } from '../core/document.js';
import { attachTooltip } from './tooltip.js';

export function createImportControls({ button, fileInput, getCurrentFrame, onImported }) {
  attachTooltip(button, { title: 'Importar imagen', description: 'La añade como una capa nueva' });

  button.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    const { doc, history } = getCurrentFrame();
    const bitmap = await createImageBitmap(file);

    const offscreen = document.createElement('canvas');
    offscreen.width = doc.width;
    offscreen.height = doc.height;
    const offCtx = offscreen.getContext('2d');
    offCtx.imageSmoothingEnabled = false;
    offCtx.drawImage(bitmap, 0, 0, doc.width, doc.height);
    const pixels = offCtx.getImageData(0, 0, doc.width, doc.height).data;

    execute(history, doc, createAddLayerCommand(pixels));
    onImported();
  });
}
