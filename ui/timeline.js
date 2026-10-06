import { execute } from '../core/history.js';
import { composeLayers } from '../core/document.js';
import {
  getActiveFrame,
  createAddFrameCommand,
  createDuplicateFrameCommand,
  createRemoveFrameCommand,
  createMoveFrameCommand,
} from '../core/project.js';
import { attachTooltip } from './tooltip.js';
import { PLAY_ICON, PAUSE_ICON, PLUS_ICON, DUPLICATE_ICON, TRASH_ICON, ONION_ICON } from './icons.js';

const FPS_PRESETS = [6, 12, 24];

function drawThumb(canvasEl, doc) {
  canvasEl.width = doc.width;
  canvasEl.height = doc.height;
  const ctx = canvasEl.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(new ImageData(composeLayers(doc), doc.width, doc.height), 0, 0);
}

function createIconButton(icon, tooltip, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-icon';
  button.innerHTML = icon;
  attachTooltip(button, tooltip);
  button.addEventListener('click', onClick);
  return button;
}

export function createTimeline(container, { project, onChange }) {
  const stripEl = document.createElement('div');
  stripEl.className = 'frame-strip';

  const controlsEl = document.createElement('div');
  controlsEl.className = 'toolbar';

  let playing = false;
  let playTimer = null;

  // Cambios de estructura de fotogramas: siempre como comando deshacible.
  function runFrameCommand(command) {
    stopPlayback();
    execute(project.history, project, command);
    refreshAll();
    onChange();
  }

  const playButton = createIconButton(PLAY_ICON, { title: 'Reproducir', description: 'Anima los fotogramas en bucle' }, () => {
    if (playing) stopPlayback();
    else startPlayback();
  });

  function updatePlayButton() {
    playButton.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
    playButton.classList.toggle('is-pressed', playing);
  }

  function stopPlayback() {
    if (!playing) return;
    playing = false;
    clearInterval(playTimer);
    playTimer = null;
    updatePlayButton();
  }

  function startPlayback() {
    if (playing || project.frames.length <= 1) return;
    playing = true;
    updatePlayButton();
    playTimer = setInterval(() => {
      project.activeFrameIndex = (project.activeFrameIndex + 1) % project.frames.length;
      onChange();
    }, 1000 / project.fps);
  }

  const fpsButtons = FPS_PRESETS.map((fps) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-fps';
    button.textContent = `${fps}`;
    attachTooltip(button, { title: `${fps} FPS`, description: 'Velocidad de reproducción y del GIF exportado' });
    button.addEventListener('click', () => {
      project.fps = fps;
      updateFpsButtons();
      if (playing) {
        stopPlayback();
        startPlayback();
      }
      onChange();
    });
    return button;
  });

  function updateFpsButtons() {
    for (const button of fpsButtons) {
      button.classList.toggle('is-pressed', Number(button.textContent) === project.fps);
    }
  }

  const addButton = createIconButton(PLUS_ICON, { title: 'Fotograma vacío', description: 'Añade uno en blanco después del actual' }, () =>
    runFrameCommand(createAddFrameCommand()),
  );

  const duplicateButton = createIconButton(DUPLICATE_ICON, { title: 'Duplicar fotograma', description: 'Crea uno nuevo a partir del actual' }, () =>
    runFrameCommand(createDuplicateFrameCommand()),
  );

  const removeButton = createIconButton(TRASH_ICON, { title: 'Eliminar fotograma', description: 'Borra el fotograma actual (se puede deshacer)' }, () => {
    if (project.frames.length > 1) runFrameCommand(createRemoveFrameCommand(project.activeFrameIndex));
  });

  let onionSkin = false;
  const onionSkinButton = createIconButton(
    ONION_ICON,
    { title: 'Papel cebolla', description: 'Muestra el fotograma anterior semitransparente como guía' },
    () => {
      onionSkin = !onionSkin;
      onionSkinButton.classList.toggle('is-pressed', onionSkin);
      onChange();
    },
  );

  const separator = () => {
    const el = document.createElement('span');
    el.className = 'toolbar-separator';
    return el;
  };

  controlsEl.append(playButton, ...fpsButtons, separator(), addButton, duplicateButton, removeButton, separator(), onionSkinButton);
  container.append(stripEl, controlsEl);

  // --- Reordenar arrastrando las miniaturas ---
  let dragIndex = null;

  function clearDropMarkers() {
    for (const el of stripEl.children) el.classList.remove('is-drop-before', 'is-drop-after', 'is-dragging');
  }

  function refreshAll() {
    stripEl.innerHTML = '';
    project.frames.forEach((frame, index) => {
      const thumbButton = document.createElement('button');
      thumbButton.type = 'button';
      thumbButton.className = 'frame-thumb';
      thumbButton.draggable = true;
      thumbButton.classList.toggle('is-selected', index === project.activeFrameIndex);

      const thumbCanvas = document.createElement('canvas');
      drawThumb(thumbCanvas, frame.doc);
      thumbButton.appendChild(thumbCanvas);

      const numberEl = document.createElement('span');
      numberEl.className = 'frame-number';
      numberEl.textContent = String(index + 1);
      thumbButton.appendChild(numberEl);
      attachTooltip(thumbButton, { title: `Fotograma ${index + 1}`, description: 'Arrastra para reordenar' });

      thumbButton.addEventListener('click', () => {
        stopPlayback();
        project.activeFrameIndex = index;
        refresh();
        onChange();
      });

      thumbButton.addEventListener('dragstart', (event) => {
        stopPlayback();
        dragIndex = index;
        event.dataTransfer.effectAllowed = 'move';
        thumbButton.classList.add('is-dragging');
      });
      thumbButton.addEventListener('dragover', (event) => {
        if (dragIndex === null) return;
        event.preventDefault();
        const rect = thumbButton.getBoundingClientRect();
        const after = event.clientX > rect.left + rect.width / 2;
        clearDropMarkers();
        thumbButton.classList.add(after ? 'is-drop-after' : 'is-drop-before');
      });
      thumbButton.addEventListener('drop', (event) => {
        event.preventDefault();
        if (dragIndex === null) return;
        const rect = thumbButton.getBoundingClientRect();
        const after = event.clientX > rect.left + rect.width / 2;
        let target = index + (after ? 1 : 0);
        if (target > dragIndex) target--;
        const from = dragIndex;
        dragIndex = null;
        clearDropMarkers();
        if (target !== from) runFrameCommand(createMoveFrameCommand(from, target));
      });
      thumbButton.addEventListener('dragend', () => {
        dragIndex = null;
        clearDropMarkers();
      });

      stripEl.appendChild(thumbButton);
    });

    removeButton.disabled = project.frames.length <= 1;
    updateFpsButtons();
  }

  function refresh() {
    [...stripEl.children].forEach((el, index) => {
      el.classList.toggle('is-selected', index === project.activeFrameIndex);
    });
    const activeThumb = stripEl.children[project.activeFrameIndex];
    if (activeThumb) drawThumb(activeThumb.querySelector('canvas'), getActiveFrame(project).doc);
  }

  updatePlayButton();
  refreshAll();

  return { refresh, refreshAll, stopPlayback, isOnionSkinEnabled: () => onionSkin };
}
