import { resizeProject } from '../core/project.js';
import { attachTooltip } from './tooltip.js';

const MIN_SIZE = 1;
const MAX_SIZE = 256;

export function createCanvasResizeControls({ toggleButton, panelEl, widthInput, heightInput, applyButton, project, onResize }) {
  attachTooltip(toggleButton, { title: 'Redimensionar lienzo', description: 'Cambia el ancho y el alto de todos los fotogramas' });

  toggleButton.addEventListener('click', () => {
    widthInput.value = project.width;
    heightInput.value = project.height;
    panelEl.classList.toggle('is-open');
  });

  applyButton.addEventListener('click', () => {
    const newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(widthInput.value, 10) || project.width));
    const newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(heightInput.value, 10) || project.height));
    resizeProject(project, newWidth, newHeight);
    panelEl.classList.remove('is-open');
    onResize();
  });
}
