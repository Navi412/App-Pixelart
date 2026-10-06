import { hsvToRgb } from '../core/color.js';

const SV_RES = 20;
const HUE_STEPS = 24;
const ALPHA_STEPS = 16;
const CHECKER_LIGHT = 255;
const CHECKER_DARK = 204;

function bindDrag(el, handler) {
  let dragging = false;

  el.addEventListener('pointerdown', (event) => {
    dragging = true;
    el.setPointerCapture(event.pointerId);
    handler(event);
  });

  el.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    handler(event);
  });

  function stop() {
    dragging = false;
  }

  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
}

export function createColorPicker({ svCanvas, hueCanvas, alphaCanvas, onChange }) {
  let hue = 0;
  let sat = 1;
  let val = 1;
  let alpha = 255;

  const currentColor = () => ({ ...hsvToRgb(hue, sat, val), a: alpha });

  svCanvas.width = SV_RES;
  svCanvas.height = SV_RES;
  hueCanvas.width = 1;
  hueCanvas.height = HUE_STEPS;
  alphaCanvas.width = ALPHA_STEPS;
  alphaCanvas.height = 2;

  const svCtx = svCanvas.getContext('2d');
  const hueCtx = hueCanvas.getContext('2d');
  const alphaCtx = alphaCanvas.getContext('2d');
  svCtx.imageSmoothingEnabled = false;
  hueCtx.imageSmoothingEnabled = false;

  function drawSv() {
    for (let y = 0; y < SV_RES; y++) {
      const v = 1 - y / (SV_RES - 1);
      for (let x = 0; x < SV_RES; x++) {
        const s = x / (SV_RES - 1);
        const { r, g, b } = hsvToRgb(hue, s, v);
        svCtx.fillStyle = `rgb(${r},${g},${b})`;
        svCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawHue() {
    for (let y = 0; y < HUE_STEPS; y++) {
      const { r, g, b } = hsvToRgb((y / HUE_STEPS) * 360, 1, 1);
      hueCtx.fillStyle = `rgb(${r},${g},${b})`;
      hueCtx.fillRect(0, y, 1, 1);
    }
  }

  // Barra de alfa: el color actual mezclado sobre un fondo de cuadros (2 filas).
  function drawAlpha() {
    const { r, g, b } = hsvToRgb(hue, sat, val);
    for (let x = 0; x < ALPHA_STEPS; x++) {
      const t = x / (ALPHA_STEPS - 1);
      for (let y = 0; y < 2; y++) {
        const bg = (x + y) % 2 === 0 ? CHECKER_LIGHT : CHECKER_DARK;
        const mix = (c) => Math.round(c * t + bg * (1 - t));
        alphaCtx.fillStyle = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
        alphaCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function emit() {
    drawAlpha();
    onChange(currentColor());
  }

  function cellFromEvent(el, res, event) {
    const rect = el.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const x = (event.clientX - rect.left) / rect.width;
    return {
      cellX: Math.min(res - 1, Math.max(0, Math.floor(x * res))),
      cellY: Math.min(res - 1, Math.max(0, Math.floor(ratio * res))),
    };
  }

  bindDrag(svCanvas, (event) => {
    const { cellX, cellY } = cellFromEvent(svCanvas, SV_RES, event);
    sat = cellX / (SV_RES - 1);
    val = 1 - cellY / (SV_RES - 1);
    emit();
  });

  bindDrag(alphaCanvas, (event) => {
    const rect = alphaCanvas.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    alpha = Math.round(Math.round(t * (ALPHA_STEPS - 1)) / (ALPHA_STEPS - 1) * 255);
    emit();
  });

  bindDrag(hueCanvas, (event) => {
    const { cellY } = cellFromEvent(hueCanvas, HUE_STEPS, event);
    hue = (cellY / HUE_STEPS) * 360;
    drawSv();
    emit();
  });

  drawHue();
  drawSv();
  drawAlpha();

  return {
    getColor: currentColor,
  };
}
