export function bindPointerEvents(
  canvasEl,
  getTool,
  { getDoc, getHistory, getColor, getBrushSize, getMirror, getFill, getZoom },
  onChange,
  onHover = () => {},
) {
  let drawing = false;
  // Celda bajo el puntero (null fuera del lienzo): sirve para la huella de la herramienta.
  let hover = null;

  function setHover(next) {
    if (hover?.x === next?.x && hover?.y === next?.y) return false;
    hover = next;
    return true;
  }

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
    const { x, y } = toDocCoords(event);
    const hoverChanged = setHover(inBounds(getDoc(), x, y) ? { x, y } : null);
    if (!drawing) {
      // Sin arrastrar solo cambia la huella: basta repintar el lienzo.
      if (hoverChanged) onHover();
      return;
    }
    getTool().onPointerMove(toolContext(event), x, y);
    onChange();
  });

  canvasEl.addEventListener('pointerleave', () => {
    if (!drawing && setHover(null)) onHover();
  });

  function stop(event) {
    if (!drawing) return;
    drawing = false;
    getTool().onPointerUp(toolContext(event));
    // Con el puntero capturado, al soltar fuera del lienzo no llega pointerleave.
    const { x, y } = toDocCoords(event);
    if (!inBounds(getDoc(), x, y)) setHover(null);
    onChange();
  }

  canvasEl.addEventListener('pointerup', stop);
  canvasEl.addEventListener('pointercancel', stop);

  return {
    // Huella de la herramienta activa en la celda bajo el puntero: { cells, color } o null.
    getCursor() {
      const tool = getTool();
      if (!hover || !tool.getCursor) return null;
      return tool.getCursor(toolContext(), hover.x, hover.y);
    },
  };
}
