import { execute } from '../core/history.js';
import { createProjectAddLayerCommand } from '../core/project.js';
import { attachTooltip } from './tooltip.js';
import { showToast } from './toast.js';

// La imagen entra como capa nueva (en todos los fotogramas, para mantener la
// misma estructura de capas), con los píxeles solo en el fotograma actual.
export function createImportControls({ button, fileInput, project, onImported }) {
  attachTooltip(button, { title: 'Importar imagen', description: 'La añade como una capa nueva en el fotograma actual' });

  button.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      showToast('No se pudo leer la imagen', { kind: 'error' });
      return;
    }

    const { width, height } = project;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    offCtx.imageSmoothingEnabled = false;
    offCtx.drawImage(bitmap, 0, 0, width, height);
    const pixels = offCtx.getImageData(0, 0, width, height).data;

    execute(project.history, project, createProjectAddLayerCommand(pixels, project.activeFrameIndex));
    onImported();
  });
}
