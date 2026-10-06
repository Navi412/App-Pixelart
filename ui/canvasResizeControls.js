import { execute } from '../core/history.js';
import { createResizeProjectCommand } from '../core/project.js';
import { attachTooltip } from './tooltip.js';
import { confirmAction } from './dialog.js';

const MIN_SIZE = 1;
const MAX_SIZE = 256;

export function createCanvasResizeControls({ toggleButton, panelEl, widthInput, heightInput, applyButton, project, onResize }) {
  attachTooltip(toggleButton, { title: 'Redimensionar lienzo', description: 'Cambia el ancho y el alto de todos los fotogramas' });

  toggleButton.addEventListener('click', () => {
    widthInput.value = project.width;
    heightInput.value = project.height;
    panelEl.classList.toggle('is-open');
    toggleButton.classList.toggle('is-pressed', panelEl.classList.contains('is-open'));
  });

  async function apply() {
    const newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(widthInput.value, 10) || project.width));
    const newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(heightInput.value, 10) || project.height));
    if (newWidth === project.width && newHeight === project.height) return;

    if (newWidth < project.width || newHeight < project.height) {
      const ok = await confirmAction({
        title: 'Reducir el lienzo',
        message: `Pasar de ${project.width}×${project.height} a ${newWidth}×${newHeight} recorta lo que quede fuera (por la derecha y por abajo). Se puede deshacer con Ctrl+Z.`,
        confirmLabel: 'Recortar',
      });
      if (!ok) return;
    }

    execute(project.history, project, createResizeProjectCommand(newWidth, newHeight));
    panelEl.classList.remove('is-open');
    toggleButton.classList.remove('is-pressed');
    onResize();
  }

  applyButton.addEventListener('click', apply);
  for (const input of [widthInput, heightInput]) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') apply();
    });
  }
}
