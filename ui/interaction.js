export function bindPointerEvents(canvasEl, getTool, { getDoc, getHistory, getColor, getBrushSize, getZoom }, onChange) {
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

  function toolContext() {
    return { doc: getDoc(), history: getHistory(), color: getColor(), size: getBrushSize ? getBrushSize() : 1 };
  }

  canvasEl.addEventListener('pointerdown', (event) => {
    const doc = getDoc();
    const { x, y } = toDocCoords(event);
    if (!inBounds(doc, x, y)) return;
    drawing = true;
    canvasEl.setPointerCapture(event.pointerId);
    getTool().onPointerDown(toolContext(), x, y);
    onChange();
  });

  canvasEl.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const doc = getDoc();
    const { x, y } = toDocCoords(event);
    if (!inBounds(doc, x, y)) return;
    getTool().onPointerMove(toolContext(), x, y);
    onChange();
  });

  function stop() {
    if (!drawing) return;
    drawing = false;
    getTool().onPointerUp(toolContext());
    onChange();
  }

  canvasEl.addEventListener('pointerup', stop);
  canvasEl.addEventListener('pointercancel', stop);
}
