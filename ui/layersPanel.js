import { execute } from '../core/history.js';
import {
  createAddLayerCommand,
  createRemoveLayerCommand,
  createMoveLayerCommand,
  createToggleLayerVisibilityCommand,
} from '../core/document.js';
import { attachTooltip } from './tooltip.js';
import { EYE_ICON } from './icons.js';

function createActionButton(text, tooltip, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-icon';
  button.textContent = text;
  attachTooltip(button, tooltip);
  button.addEventListener('click', onClick);
  return button;
}

export function createLayersPanel(container, { getDoc, getHistory, onChange }) {
  const listEl = document.createElement('div');
  listEl.className = 'layers-list';

  const toolbarEl = document.createElement('div');
  toolbarEl.className = 'toolbar';

  const addButton = createActionButton('+', { title: 'Nueva capa', description: 'Añade una capa vacía encima' }, () => {
    execute(getHistory(), getDoc(), createAddLayerCommand());
    onChange();
  });

  const removeButton = createActionButton('×', { title: 'Eliminar capa', description: 'Borra la capa activa' }, () => {
    const doc = getDoc();
    if (doc.layers.length <= 1) return;
    execute(getHistory(), doc, createRemoveLayerCommand(doc.activeLayerIndex));
    onChange();
  });

  const moveUpButton = createActionButton('↑', { title: 'Subir capa', description: 'La sube una posición en la pila' }, () => {
    const doc = getDoc();
    const index = doc.activeLayerIndex;
    if (index >= doc.layers.length - 1) return;
    execute(getHistory(), doc, createMoveLayerCommand(index, index + 1));
    onChange();
  });

  const moveDownButton = createActionButton('↓', { title: 'Bajar capa', description: 'La baja una posición en la pila' }, () => {
    const doc = getDoc();
    const index = doc.activeLayerIndex;
    if (index <= 0) return;
    execute(getHistory(), doc, createMoveLayerCommand(index, index - 1));
    onChange();
  });

  toolbarEl.append(addButton, removeButton, moveUpButton, moveDownButton);
  container.append(listEl, toolbarEl);

  function refresh() {
    const doc = getDoc();
    listEl.innerHTML = '';

    // De arriba (última capa = arriba en la pila) hacia abajo, como es habitual en un editor de capas.
    for (let index = doc.layers.length - 1; index >= 0; index--) {
      const layer = doc.layers[index];
      const row = document.createElement('div');
      row.className = 'list-item layer-row';
      row.classList.toggle('is-selected', index === doc.activeLayerIndex);

      const visibilityButton = document.createElement('button');
      visibilityButton.type = 'button';
      visibilityButton.className = 'layer-visibility';
      visibilityButton.classList.toggle('is-hidden', !layer.visible);
      visibilityButton.innerHTML = EYE_ICON;
      attachTooltip(visibilityButton, { title: layer.visible ? 'Ocultar capa' : 'Mostrar capa' });
      visibilityButton.addEventListener('click', (event) => {
        event.stopPropagation();
        execute(getHistory(), doc, createToggleLayerVisibilityCommand(index));
        onChange();
      });

      const nameEl = document.createElement('span');
      nameEl.className = 'layer-name';
      nameEl.textContent = layer.name;

      row.append(visibilityButton, nameEl);
      row.addEventListener('click', () => {
        doc.activeLayerIndex = index;
        onChange();
      });

      listEl.appendChild(row);
    }

    removeButton.disabled = doc.layers.length <= 1;
    moveUpButton.disabled = doc.activeLayerIndex >= doc.layers.length - 1;
    moveDownButton.disabled = doc.activeLayerIndex <= 0;
  }

  refresh();

  return { refresh };
}
