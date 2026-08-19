import { attachTooltip } from './tooltip.js';

const ZOOM_MIN = 2;
const ZOOM_MAX = 64;
const ZOOM_STEP = 2;

export function createZoomControls({ canvasEl, viewportEl, project, outButton, inButton, fitButton, levelEl, onChange }) {
  attachTooltip(outButton, { title: 'Alejar' });
  attachTooltip(inButton, { title: 'Acercar' });
  attachTooltip(fitButton, { title: 'Ajustar', description: 'Encaja el lienzo en el hueco disponible' });

  function computeFitZoom() {
    const chrome = 64; // aire + padding/borde del panel alrededor del lienzo
    const availableW = viewportEl.clientWidth - chrome;
    const availableH = viewportEl.clientHeight - chrome;
    const cellSize = Math.floor(Math.min(availableW, availableH) / Math.max(project.width, project.height));
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cellSize));
  }

  let zoom = computeFitZoom();
  levelEl.textContent = `${zoom}px`;

  function setZoom(newZoom) {
    zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    levelEl.textContent = `${zoom}px`;
    onChange();
  }

  outButton.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
  inButton.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
  fitButton.addEventListener('click', () => setZoom(computeFitZoom()));

  canvasEl.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    },
    { passive: false },
  );

  return {
    getZoom: () => zoom,
    setZoom,
    computeFitZoom,
  };
}
