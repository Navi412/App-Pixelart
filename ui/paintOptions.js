import { attachTooltip } from './tooltip.js';
import { createBrushSizeSlider } from './brushSizeSlider.js';

function createMirrorButtons(container) {
  let horizontal = false;
  let vertical = false;

  const hButton = document.createElement('button');
  hButton.type = 'button';
  hButton.className = 'btn btn-icon';
  hButton.textContent = '↔';
  attachTooltip(hButton, { title: 'Espejo horizontal', description: 'Refleja el trazo en el eje horizontal' });
  hButton.addEventListener('click', () => {
    horizontal = !horizontal;
    hButton.classList.toggle('is-pressed', horizontal);
  });

  const vButton = document.createElement('button');
  vButton.type = 'button';
  vButton.className = 'btn btn-icon';
  vButton.textContent = '↕';
  attachTooltip(vButton, { title: 'Espejo vertical', description: 'Refleja el trazo en el eje vertical' });
  vButton.addEventListener('click', () => {
    vertical = !vertical;
    vButton.classList.toggle('is-pressed', vertical);
  });

  container.append(hButton, vButton);

  return () => ({ horizontal, vertical });
}

export function createPaintOptions({ brushSizeEl, mirrorEl }) {
  const getBrushSize = createBrushSizeSlider(brushSizeEl);
  const getMirror = createMirrorButtons(mirrorEl);

  return { getBrushSize, getMirror };
}
