export function bindPointerEvents(canvasEl, getTool, { getDoc, getHistory, getColor, getBrushSize, getMirror, getFill, getZoom }, onChange) {
  let drawing = false;

  function toDocCoords(event) {
    const rect = canvasEl.getBoundingClientRect();
    const zoom = getZoom();
    return {
      x: Math.floor((event.clientX - rect.left) / zoom),
      y: Math.floor((event.clientY - rect.top) / zoom),
    };
  }

  function inBounds(doc, x, y) {
    return x >= 0 && y >= 0 && x < doc.width && y < doc.height;
  }

  function toolContext(event) {
    return {
      doc: getDoc(),
      history: getHistory(),
      color: getColor(),
      size: getBrushSize ? getBrushSize() : 1,
      mirror: getMirror ? getMirror() : null,
      fill: getFill ? getFill() : false,
      shift: !!event?.shiftKey,
    };
  }

  canvasEl.addEventListener('pointerdown', (event) => {
    // Solo el botón principal dibuja (el central se usa para desplazar la vista).
    if (event.button !== 0) return;
    const doc = getDoc();
    const { x, y } = toDocCoords(event);
    if (!inBounds(doc, x, y)) return;
    drawing = true;
    canvasEl.setPointerCapture(event.pointerId);
    getTool().onPointerDown(toolContext(event), x, y);
    onChange();
  });

  // Durante el arrastre se pasan también coordenadas fuera del lienzo: cada
  // herramienta recorta lo suyo, y así un trazo que sale y vuelve a entrar no
  // deja huecos.
  canvasEl.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const { x, y } = toDocCoords(event);
    getTool().onPointerMove(toolContext(event), x, y);
    onChange();
  });

  function stop(event) {
    if (!drawing) return;
    drawing = false;
    getTool().onPointerUp(toolContext(event));
    onChange();
  }

  canvasEl.addEventListener('pointerup', stop);
  canvasEl.addEventListener('pointercancel', stop);
}
