import { attachTooltip } from './tooltip.js';

export function createToolbar(container, tools, initialId = tools[0]?.id) {
  let selectedId = initialId;
  const buttons = [];

  for (const { id, label, icon, description, shortcut } of tools) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-icon';
    if (icon) {
      button.innerHTML = icon;
    } else {
      button.textContent = label;
      button.classList.remove('btn-icon');
    }
    attachTooltip(button, { title: label, shortcut: shortcut?.toUpperCase(), description });
    button.addEventListener('click', () => {
      selectedId = id;
      updateActive();
    });
    container.appendChild(button);
    buttons.push({ id, button });
  }

  function updateActive() {
    for (const { id, button } of buttons) {
      const isActive = id === selectedId;
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('is-pressed', isActive);
    }
  }

  updateActive();

  return {
    getToolId() {
      return selectedId;
    },
    setActiveTool(id) {
      if (!buttons.some((b) => b.id === id)) return;
      selectedId = id;
      updateActive();
    },
  };
}
