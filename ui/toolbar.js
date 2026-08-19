export function createToolbar(container, tools, initialId = tools[0]?.id) {
  let selectedId = initialId;
  const buttons = [];

  for (const { id, label } of tools) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.padding = '6px 10px';
    button.style.cursor = 'pointer';
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
      button.style.outline = isActive ? '2px solid #fff' : 'none';
    }
  }

  updateActive();

  return {
    getToolId() {
      return selectedId;
    },
  };
}
