import { isTypingTarget } from './keyboard.js';

// Desplazar la vista del lienzo arrastrando con la rueda (botón central) o con
// Espacio + arrastrar, como en la mayoría de editores. Se engancha en fase de
// captura sobre el viewport para que el canvas no llegue a recibir el pointerdown
// (si no, el lápiz pintaría a la vez que se desplaza).
export function createViewportPan(viewportEl) {
  let spaceHeld = false;
  let panning = null;

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || isTypingTarget(event.target)) return;
    // Sin esto, Espacio "pulsaría" el último botón con foco.
    event.preventDefault();
    if (!spaceHeld) {
      spaceHeld = true;
      viewportEl.classList.add('is-pan-ready');
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code !== 'Space') return;
    spaceHeld = false;
    viewportEl.classList.remove('is-pan-ready');
  });

  viewportEl.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 1 && !(event.button === 0 && spaceHeld)) return;
      event.preventDefault();
      event.stopPropagation();
      panning = { x: event.clientX, y: event.clientY, left: viewportEl.scrollLeft, top: viewportEl.scrollTop };
      viewportEl.setPointerCapture(event.pointerId);
      viewportEl.classList.add('is-panning');
    },
    { capture: true },
  );

  viewportEl.addEventListener('pointermove', (event) => {
    if (!panning) return;
    viewportEl.scrollLeft = panning.left - (event.clientX - panning.x);
    viewportEl.scrollTop = panning.top - (event.clientY - panning.y);
  });

  function stop() {
    panning = null;
    viewportEl.classList.remove('is-panning');
  }

  viewportEl.addEventListener('pointerup', stop);
  viewportEl.addEventListener('pointercancel', stop);
}
