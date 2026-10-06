import { loadTheme, saveTheme } from './storage.js';
import { attachTooltip } from './tooltip.js';
import { SUN_ICON, MOON_ICON } from './icons.js';

// Tema claro por defecto; el oscuro solo se aplica si el usuario lo elige.
export function createThemeToggle({ button, onChange }) {
  let theme = loadTheme();

  function apply() {
    if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    button.innerHTML = theme === 'dark' ? SUN_ICON : MOON_ICON;
  }

  attachTooltip(button, () => ({
    title: theme === 'dark' ? 'Tema claro' : 'Tema oscuro',
    description: 'Cambia el aspecto de la interfaz',
  }));

  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveTheme(theme);
    apply();
    onChange?.();
  });

  apply();
  return { getTheme: () => theme };
}
