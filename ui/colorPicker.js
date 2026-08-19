import { hsvToRgb } from '../core/color.js';

const SV_RES = 20;
const HUE_STEPS = 24;

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

export function createColorPicker({ svCanvas, hueCanvas, onChange }) {
  let hue = 0;
  let sat = 1;
  let val = 1;

  svCanvas.width = SV_RES;
  svCanvas.height = SV_RES;
  hueCanvas.width = 1;
  hueCanvas.height = HUE_STEPS;

  const svCtx = svCanvas.getContext('2d');
  const hueCtx = hueCanvas.getContext('2d');
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

  function emit() {
    onChange(hsvToRgb(hue, sat, val));
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

  bindDrag(hueCanvas, (event) => {
    const { cellY } = cellFromEvent(hueCanvas, HUE_STEPS, event);
    hue = (cellY / HUE_STEPS) * 360;
    drawSv();
    emit();
  });

  drawHue();
  drawSv();

  return {
    getColor: () => hsvToRgb(hue, sat, val),
  };
}
