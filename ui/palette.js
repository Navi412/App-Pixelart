export const DEFAULT_PALETTE = [
  { r: 0, g: 0, b: 0, a: 255 },
  { r: 255, g: 255, b: 255, a: 255 },
  { r: 136, g: 136, b: 136, a: 255 },
  { r: 68, g: 68, b: 68, a: 255 },
  { r: 237, g: 28, b: 36, a: 255 },
  { r: 255, g: 127, b: 39, a: 255 },
  { r: 255, g: 242, b: 0, a: 255 },
  { r: 34, g: 177, b: 76, a: 255 },
  { r: 0, g: 162, b: 232, a: 255 },
  { r: 63, g: 72, b: 204, a: 255 },
  { r: 163, g: 73, b: 164, a: 255 },
  { r: 255, g: 174, b: 201, a: 255 },
  { r: 185, g: 122, b: 87, a: 255 },
  { r: 128, g: 0, b: 0, a: 255 },
  { r: 0, g: 128, b: 128, a: 255 },
  { r: 112, g: 146, b: 190, a: 255 },
];

function toCss(color) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
}

// Fondo de cuadros bajo el color, para que se note si es semitransparente.
const CHECKER = 'repeating-conic-gradient(#cccccc 0 25%, #ffffff 0 50%) 0 0 / 10px 10px';

function colorsEqual(a, b) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

// onRemove (opcional): con clic derecho sobre un color se pide quitarlo.
export function createPalette(container, { colors = DEFAULT_PALETTE, onSelect, onRemove } = {}) {
  let buttons = [];

  function createSwatchButton(color) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.background = color.a < 255 ? `linear-gradient(${toCss(color)}, ${toCss(color)}), ${CHECKER}` : toCss(color);
    button.setAttribute('aria-label', toCss(color));
    if (onRemove) button.title = 'Clic derecho para eliminar';
    button.addEventListener('click', () => onSelect?.(color));
    button.addEventListener('contextmenu', (event) => {
      if (!onRemove) return;
      event.preventDefault();
      onRemove(color);
    });
    container.appendChild(button);
    buttons.push({ color, button });
  }

  for (const color of colors) createSwatchButton(color);

  function setActive(activeColor) {
    for (const { color, button } of buttons) {
      const isActive = colorsEqual(color, activeColor);
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('is-selected', isActive);
    }
  }

  function addColor(color) {
    createSwatchButton(color);
  }

  function removeColor(color) {
    const entry = buttons.find((b) => b.color === color);
    if (!entry) return;
    entry.button.remove();
    buttons = buttons.filter((b) => b !== entry);
  }

  return {
    setActive,
    addColor,
    removeColor,
    getColors: () => buttons.map((b) => b.color),
  };
}
