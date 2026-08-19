import { attachTooltip } from './tooltip.js';

const BRUSH_SIZES = [1, 2, 3, 4];

function createBrushSizeButtons(container) {
  let brushSize = BRUSH_SIZES[0];
  const buttons = [];

  function update() {
    for (const { size, button } of buttons) {
      button.classList.toggle('is-pressed', size === brushSize);
    }
  }

  for (const size of BRUSH_SIZES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = String(size);
    attachTooltip(button, { title: `Grosor ${size}px`, description: 'Ancho del pincel/goma' });
    button.addEventListener('click', () => {
      brushSize = size;
      update();
    });
    container.appendChild(button);
    buttons.push({ size, button });
  }

  update();

  return () => brushSize;
}

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
  const getBrushSize = createBrushSizeButtons(brushSizeEl);
  const getMirror = createMirrorButtons(mirrorEl);

  return { getBrushSize, getMirror };
}
