import { execute } from '../core/history.js';
import {
  getActiveFrame,
  setActiveLayer,
  createProjectAddLayerCommand,
  createProjectRemoveLayerCommand,
  createProjectMoveLayerCommand,
  createProjectToggleLayerVisibilityCommand,
  createProjectRenameLayerCommand,
  createProjectSetLayerOpacityCommand,
  createProjectMergeLayerDownCommand,
} from '../core/project.js';
import { attachTooltip } from './tooltip.js';
import { EYE_ICON, PLUS_ICON, TRASH_ICON, ARROW_UP_ICON, ARROW_DOWN_ICON, MERGE_ICON } from './icons.js';

function createActionButton(icon, tooltip, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-icon';
  button.innerHTML = icon;
  attachTooltip(button, tooltip);
  button.addEventListener('click', onClick);
  return button;
}

// Las capas son las mismas en todos los fotogramas: cada cambio de estructura
// es un comando de proyecto (core/project.js) que se aplica a todos a la vez.
export function createLayersPanel(container, { project, onChange }) {
  const getDoc = () => getActiveFrame(project).doc;
  const run = (command) => {
    execute(project.history, project, command);
    onChange();
  };

  const listEl = document.createElement('div');
  listEl.className = 'layers-list';

  // --- Opacidad de la capa activa ---
  const opacityRow = document.createElement('label');
  opacityRow.className = 'layer-opacity';
  const opacityLabel = document.createElement('span');
  opacityLabel.textContent = 'Opacidad';
  const opacityInput = document.createElement('input');
  opacityInput.type = 'range';
  opacityInput.min = '0';
  opacityInput.max = '100';
  const opacityValue = document.createElement('span');
  opacityValue.className = 'layer-opacity-value';
  opacityRow.append(opacityLabel, opacityInput, opacityValue);

  // Mientras se arrastra se previsualiza tocando la opacidad directamente; al
  // soltar se deshace esa vista previa y se registra un único comando deshacible.
  let opacityBefore = null;
  const setOpacityEverywhere = (index, opacity) => {
    for (const { doc } of project.frames) doc.layers[index].opacity = opacity;
  };
  opacityInput.addEventListener('input', () => {
    const doc = getDoc();
    if (opacityBefore === null) opacityBefore = doc.layers[doc.activeLayerIndex].opacity;
    setOpacityEverywhere(doc.activeLayerIndex, Number(opacityInput.value) / 100);
    opacityValue.textContent = `${opacityInput.value}%`;
    onChange();
  });
  opacityInput.addEventListener('change', () => {
    if (opacityBefore === null) return;
    const index = getDoc().activeLayerIndex;
    setOpacityEverywhere(index, opacityBefore);
    opacityBefore = null;
    run(createProjectSetLayerOpacityCommand(index, Number(opacityInput.value) / 100));
  });

  // --- Botones ---
  const toolbarEl = document.createElement('div');
  toolbarEl.className = 'toolbar';

  const addButton = createActionButton(PLUS_ICON, { title: 'Nueva capa', description: 'Añade una capa vacía encima, en todos los fotogramas' }, () =>
    run(createProjectAddLayerCommand()),
  );

  const removeButton = createActionButton(TRASH_ICON, { title: 'Eliminar capa', description: 'Borra la capa activa (se puede deshacer)' }, () => {
    const doc = getDoc();
    if (doc.layers.length > 1) run(createProjectRemoveLayerCommand(doc.activeLayerIndex));
  });

  const moveUpButton = createActionButton(ARROW_UP_ICON, { title: 'Subir capa', description: 'La sube una posición en la pila' }, () => {
    const index = getDoc().activeLayerIndex;
    if (index < getDoc().layers.length - 1) run(createProjectMoveLayerCommand(index, index + 1));
  });

  const moveDownButton = createActionButton(ARROW_DOWN_ICON, { title: 'Bajar capa', description: 'La baja una posición en la pila' }, () => {
    const index = getDoc().activeLayerIndex;
    if (index > 0) run(createProjectMoveLayerCommand(index, index - 1));
  });

  const mergeButton = createActionButton(MERGE_ICON, { title: 'Combinar hacia abajo', description: 'Funde la capa activa con la de debajo' }, () => {
    const index = getDoc().activeLayerIndex;
    if (index > 0) run(createProjectMergeLayerDownCommand(index));
  });

  toolbarEl.append(addButton, removeButton, moveUpButton, moveDownButton, mergeButton);
  container.append(listEl, opacityRow, toolbarEl);

  // --- Renombrar con doble clic ---
  let editing = false;
  let lastSignature = null;

  function startRename(nameEl, index) {
    editing = true;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'layer-name-input';
    input.value = getDoc().layers[index].name;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      editing = false;
      const name = input.value.trim();
      lastSignature = null; // el campo sustituyó al nombre: hay que reconstruir
      if (commit && name && name !== getDoc().layers[index].name) run(createProjectRenameLayerCommand(index, name));
      else refresh();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') finish(true);
      else if (event.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  }

  function refresh() {
    const doc = getDoc();
    const active = doc.layers[doc.activeLayerIndex];

    if (document.activeElement !== opacityInput) {
      opacityInput.value = String(Math.round(active.opacity * 100));
      opacityValue.textContent = `${opacityInput.value}%`;
    }

    removeButton.disabled = doc.layers.length <= 1;
    moveUpButton.disabled = doc.activeLayerIndex >= doc.layers.length - 1;
    moveDownButton.disabled = doc.activeLayerIndex <= 0;
    mergeButton.disabled = doc.activeLayerIndex <= 0;

    // No se reconstruye la lista mientras se escribe un nombre (perdería el campo).
    if (editing) return;

    // Si solo cambia la capa activa se actualizan las clases sin reconstruir: así
    // el primer clic de un doble clic (que la activa) no destruye la fila.
    const signature = doc.layers.map((l) => `${l.id}|${l.name}|${l.visible}`).join('\n');
    if (signature === lastSignature) {
      [...listEl.children].forEach((row, i) => {
        row.classList.toggle('is-selected', doc.layers.length - 1 - i === doc.activeLayerIndex);
      });
      return;
    }
    lastSignature = signature;
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
        run(createProjectToggleLayerVisibilityCommand(index));
      });

      const nameEl = document.createElement('span');
      nameEl.className = 'layer-name';
      nameEl.textContent = layer.name;
      nameEl.title = 'Doble clic para renombrar';
      nameEl.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        startRename(nameEl, index);
      });

      row.append(visibilityButton, nameEl);
      row.addEventListener('click', () => {
        if (editing) return;
        setActiveLayer(project, index);
        onChange();
      });

      listEl.appendChild(row);
    }
  }

  refresh();

  return { refresh };
}
