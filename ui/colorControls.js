import { rgbToHex } from '../core/color.js';
import { createPalette, DEFAULT_PALETTE } from './palette.js';
import { createColorPicker } from './colorPicker.js';
import { attachTooltip } from './tooltip.js';
import { loadCustomColors, saveCustomColors } from './storage.js';
import { showToast } from './toast.js';

export function createColorControls({ paletteEl, customPaletteEl, openPickerButton, colorPickerEl, svCanvas, hueCanvas, alphaCanvas, previewEl, hexEl, saveColorButton }) {
  let activeColor = DEFAULT_PALETTE[0];

  function selectColor(color) {
    activeColor = color;
    palette.setActive(color);
    customPalette.setActive(color);
  }

  const palette = createPalette(paletteEl, { onSelect: selectColor });
  const customPalette = createPalette(customPaletteEl, {
    colors: loadCustomColors(),
    onSelect: selectColor,
    onRemove: (color) => {
      customPalette.removeColor(color);
      saveCustomColors(customPalette.getColors());
      showToast('Color eliminado');
    },
  });

  selectColor(activeColor);

  attachTooltip(openPickerButton, { title: 'Color personalizado', description: 'Abre el selector para mezclar un color a medida' });
  openPickerButton.addEventListener('click', () => {
    colorPickerEl.classList.toggle('is-open');
    openPickerButton.classList.toggle('is-pressed', colorPickerEl.classList.contains('is-open'));
  });

  const colorPicker = createColorPicker({
    svCanvas,
    hueCanvas,
    alphaCanvas,
    onChange: (color) => {
      previewEl.style.setProperty('--swatch-color', `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`);
      hexEl.textContent = rgbToHex(color);
    },
  });

  saveColorButton.addEventListener('click', () => {
    const color = colorPicker.getColor();
    customPalette.addColor(color);
    saveCustomColors(customPalette.getColors());
    selectColor(color);
  });

  return {
    getActiveColor: () => activeColor,
    selectColor,
  };
}
