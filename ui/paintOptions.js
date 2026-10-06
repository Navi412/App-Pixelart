import { attachTooltip } from './tooltip.js';
import { createBrushSizeSlider } from './brushSizeSlider.js';
import { MIRROR_H_ICON, MIRROR_V_ICON, FILL_SHAPE_ICON } from './icons.js';

function createToggleButton(container, { icon, tooltip }) {
  let on = false;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-icon';
  button.innerHTML = icon;
  button.setAttribute('aria-pressed', 'false');
  attachTooltip(button, tooltip);
  button.addEventListener('click', () => {
    on = !on;
    button.classList.toggle('is-pressed', on);
    button.setAttribute('aria-pressed', String(on));
  });
  container.appendChild(button);
  return () => on;
}

export function createPaintOptions({ brushSizeEl, optionsEl }) {
  const getBrushSize = createBrushSizeSlider(brushSizeEl);

  const getHorizontal = createToggleButton(optionsEl, {
    icon: MIRROR_H_ICON,
    tooltip: { title: 'Espejo horizontal', description: 'Refleja el trazo de izquierda a derecha' },
  });
  const getVertical = createToggleButton(optionsEl, {
    icon: MIRROR_V_ICON,
    tooltip: { title: 'Espejo vertical', description: 'Refleja el trazo de arriba abajo' },
  });
  const getFill = createToggleButton(optionsEl, {
    icon: FILL_SHAPE_ICON,
    tooltip: {
      title: 'Formas rellenas',
      description: 'Rectángulo y elipse con relleno. Mantén Shift para cuadrado/círculo o línea recta a 45°',
    },
  });

  return {
    getBrushSize,
    getMirror: () => ({ horizontal: getHorizontal(), vertical: getVertical() }),
    getFill,
  };
}
