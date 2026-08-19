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

export function createPalette(container, { colors = DEFAULT_PALETTE, initialColor = colors[0] } = {}) {
  let selected = initialColor;

  const buttons = colors.map((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.width = '32px';
    button.style.height = '32px';
    button.style.padding = '0';
    button.style.border = '1px solid #333';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = toCss(color);
    button.setAttribute('aria-label', toCss(color));
    button.addEventListener('click', () => {
      selected = color;
      updateActive();
    });
    container.appendChild(button);
    return { color, button };
  });

  function updateActive() {
    for (const { color, button } of buttons) {
      const isActive = color === selected;
      button.setAttribute('aria-pressed', String(isActive));
      button.style.outline = isActive ? '2px solid #fff' : 'none';
      button.style.outlineOffset = isActive ? '-3px' : '0';
    }
  }

  updateActive();

  return {
    getColor() {
      return selected;
    },
  };
}
