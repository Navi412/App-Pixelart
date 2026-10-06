import { attachTooltip } from './tooltip.js';
import { MINUS_ICON, PLUS_ICON, GRID_ICON } from './icons.js';

const ZOOM_MIN = 1;
const ZOOM_MAX = 64;

// Pasos más finos con zoom bajo y más grandes con zoom alto.
function stepFor(zoom) {
  return Math.max(1, Math.round(zoom * 0.2));
}

export function createZoomControls({ canvasEl, viewportEl, project, outButton, inButton, fitButton, gridButton, levelEl, onChange }) {
  outButton.innerHTML = MINUS_ICON;
  inButton.innerHTML = PLUS_ICON;
  gridButton.innerHTML = GRID_ICON;
  attachTooltip(outButton, { title: 'Alejar', description: 'También con la rueda del ratón' });
  attachTooltip(inButton, { title: 'Acercar', description: 'También con la rueda del ratón' });
  attachTooltip(fitButton, { title: 'Ajustar', description: 'Encaja el lienzo en el hueco disponible' });
  attachTooltip(gridButton, { title: 'Cuadrícula', description: 'Muestra la rejilla de píxeles al acercar' });

  function computeFitZoom() {
    const chrome = 96; // aire + padding del viewport y del panel alrededor del lienzo
    const availableW = viewportEl.clientWidth - chrome;
    const availableH = viewportEl.clientHeight - chrome;
    const cellSize = Math.floor(Math.min(availableW, availableH) / Math.max(project.width, project.height));
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cellSize));
  }

  let zoom = computeFitZoom();
  let grid = false;
  levelEl.textContent = `${zoom}px`;

  // anchor (opcional): punto de pantalla { clientX, clientY } que debe quedar
  // sobre el mismo píxel del dibujo tras cambiar el zoom.
  function setZoom(newZoom, anchor = null) {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    let docPoint = null;
    if (anchor) {
      const rect = canvasEl.getBoundingClientRect();
      docPoint = { x: (anchor.clientX - rect.left) / zoom, y: (anchor.clientY - rect.top) / zoom };
    }

    zoom = clamped;
    levelEl.textContent = `${zoom}px`;
    onChange(); // repinta: el canvas ya tiene el tamaño nuevo al volver

    if (docPoint) {
      const rect = canvasEl.getBoundingClientRect();
      viewportEl.scrollLeft += rect.left + docPoint.x * zoom - anchor.clientX;
      viewportEl.scrollTop += rect.top + docPoint.y * zoom - anchor.clientY;
    }
  }

  outButton.addEventListener('click', () => setZoom(zoom - stepFor(zoom)));
  inButton.addEventListener('click', () => setZoom(zoom + stepFor(zoom)));
  fitButton.addEventListener('click', () => setZoom(computeFitZoom()));
  gridButton.addEventListener('click', () => {
    grid = !grid;
    gridButton.classList.toggle('is-pressed', grid);
    onChange();
  });

  viewportEl.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? stepFor(zoom) : -stepFor(zoom)), event);
    },
    { passive: false },
  );

  return {
    getZoom: () => zoom,
    isGridEnabled: () => grid,
    setZoom,
    computeFitZoom,
  };
}
