import { loadSidebarState, saveSidebarState } from './storage.js';
import { attachTooltip } from './tooltip.js';
import { DOCK_ICON } from './icons.js';

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 520;

export function createSidebarDock({ appLayoutEl, sidebarEl, resizeHandleEl, dockToggleButton }) {
  dockToggleButton.innerHTML = DOCK_ICON;
  attachTooltip(dockToggleButton, { title: 'Cambiar de lado', description: 'Acopla la barra lateral a la izquierda o la derecha' });

  function persist() {
    saveSidebarState({ width: sidebarEl.style.width || null, dockLeft: appLayoutEl.classList.contains('dock-left') });
  }

  // Se restaura de forma síncrona al crear el módulo: quien lo llame (main.js) debe
  // hacerlo antes de calcular el zoom de ajuste, que depende del hueco que deja la sidebar.
  const state = loadSidebarState();
  if (state.width) {
    const savedWidth = parseInt(state.width, 10);
    sidebarEl.style.width = `${Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, savedWidth))}px`;
  }
  if (state.dockLeft) appLayoutEl.classList.add('dock-left');

  dockToggleButton.addEventListener('click', () => {
    appLayoutEl.classList.toggle('dock-left');
    persist();
  });

  let resizing = false;

  resizeHandleEl.addEventListener('pointerdown', (event) => {
    resizing = true;
    resizeHandleEl.setPointerCapture(event.pointerId);
  });

  resizeHandleEl.addEventListener('pointermove', (event) => {
    if (!resizing) return;
    const dockLeft = appLayoutEl.classList.contains('dock-left');
    const rawWidth = dockLeft ? event.clientX : window.innerWidth - event.clientX;
    sidebarEl.style.width = `${Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, rawWidth))}px`;
  });

  function stopResizing() {
    if (!resizing) return;
    resizing = false;
    persist();
  }

  resizeHandleEl.addEventListener('pointerup', stopResizing);
  resizeHandleEl.addEventListener('pointercancel', stopResizing);
}
