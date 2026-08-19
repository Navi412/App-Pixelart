import { duplicateFrame, removeFrame, getActiveFrame } from '../core/project.js';
import { composeLayers } from './canvas.js';
import { attachTooltip } from './tooltip.js';

const FPS_PRESETS = [6, 12, 24];

function drawThumb(canvasEl, doc) {
  canvasEl.width = doc.width;
  canvasEl.height = doc.height;
  const ctx = canvasEl.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const composited = composeLayers(doc);
  ctx.putImageData(new ImageData(composited, doc.width, doc.height), 0, 0);
}

export function createTimeline(container, { project, onChange }) {
  const stripEl = document.createElement('div');
  stripEl.className = 'frame-strip';

  const controlsEl = document.createElement('div');
  controlsEl.className = 'toolbar';

  let playing = false;
  let playTimer = null;

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'btn btn-icon';
  attachTooltip(playButton, { title: 'Reproducir', description: 'Anima los fotogramas en bucle' });

  function updatePlayButton() {
    playButton.textContent = playing ? '❚❚' : '▶';
  }
  updatePlayButton();

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

  playButton.addEventListener('click', () => {
    if (playing) stopPlayback();
    else startPlayback();
  });

  const fpsButtons = FPS_PRESETS.map((fps) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = `${fps}`;
    attachTooltip(button, { title: `${fps} FPS` });
    button.addEventListener('click', () => {
      project.fps = fps;
      updateFpsButtons();
      if (playing) {
        stopPlayback();
        startPlayback();
      }
    });
    return button;
  });

  function updateFpsButtons() {
    for (const button of fpsButtons) {
      button.classList.toggle('is-pressed', Number(button.textContent) === project.fps);
    }
  }
  updateFpsButtons();

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'btn btn-icon';
  addButton.textContent = '+';
  attachTooltip(addButton, { title: 'Duplicar fotograma', description: 'Crea uno nuevo a partir del actual' });
  addButton.addEventListener('click', () => {
    stopPlayback();
    duplicateFrame(project, project.activeFrameIndex);
    refreshAll();
    onChange();
  });

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn btn-icon';
  removeButton.textContent = '×';
  attachTooltip(removeButton, { title: 'Eliminar fotograma', description: 'Borra el fotograma actual' });
  removeButton.addEventListener('click', () => {
    stopPlayback();
    if (!removeFrame(project, project.activeFrameIndex)) return;
    refreshAll();
    onChange();
  });

  let onionSkin = false;
  const onionSkinButton = document.createElement('button');
  onionSkinButton.type = 'button';
  onionSkinButton.className = 'btn';
  onionSkinButton.textContent = 'Cebolla';
  attachTooltip(onionSkinButton, {
    title: 'Papel cebolla',
    description: 'Muestra el fotograma anterior semitransparente como guía',
  });
  onionSkinButton.addEventListener('click', () => {
    onionSkin = !onionSkin;
    onionSkinButton.classList.toggle('is-pressed', onionSkin);
    onChange();
  });

  controlsEl.append(playButton, ...fpsButtons, addButton, removeButton, onionSkinButton);
  container.append(stripEl, controlsEl);

  function refreshAll() {
    stripEl.innerHTML = '';
    project.frames.forEach((frame, index) => {
      const thumbButton = document.createElement('button');
      thumbButton.type = 'button';
      thumbButton.className = 'frame-thumb';
      thumbButton.classList.toggle('is-selected', index === project.activeFrameIndex);

      const thumbCanvas = document.createElement('canvas');
      drawThumb(thumbCanvas, frame.doc);
      thumbButton.appendChild(thumbCanvas);
      attachTooltip(thumbButton, `Fotograma ${index + 1}`);

      thumbButton.addEventListener('click', () => {
        stopPlayback();
        project.activeFrameIndex = index;
        refresh();
        onChange();
      });

      stripEl.appendChild(thumbButton);
    });

    removeButton.disabled = project.frames.length <= 1;
  }

  function refresh() {
    [...stripEl.children].forEach((el, index) => {
      el.classList.toggle('is-selected', index === project.activeFrameIndex);
    });
    const activeThumb = stripEl.children[project.activeFrameIndex];
    if (activeThumb) drawThumb(activeThumb.querySelector('canvas'), getActiveFrame(project).doc);
  }

  refreshAll();

  return { refresh, refreshAll, stopPlayback, isOnionSkinEnabled: () => onionSkin };
}
