import { undo, redo, execute } from './core/history.js';
import { createClearLayerCommand } from './core/layer.js';
import { createProject, getActiveFrame } from './core/project.js';
import { render } from './ui/canvas.js';
import { bindPointerEvents } from './ui/interaction.js';
import { loadProject, createAutosaveScheduler } from './ui/storage.js';
import { createSidebarDock } from './ui/sidebarDock.js';
import { createZoomControls } from './ui/zoomControls.js';
import { createCanvasResizeControls } from './ui/canvasResizeControls.js';
import { createColorControls } from './ui/colorControls.js';
import { createPaintOptions } from './ui/paintOptions.js';
import { createToolSetup } from './ui/toolSetup.js';
import { createLayersPanel } from './ui/layersPanel.js';
import { createTimeline } from './ui/timeline.js';
import { createExportControls } from './ui/exportControls.js';

// --- Referencias al DOM ---

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// --- Barra lateral: debe restaurarse antes de calcular el zoom de ajuste,
// ya que este depende del hueco que deja la sidebar en pantalla. ---

createSidebarDock({
  appLayoutEl: document.querySelector('.app-layout'),
  sidebarEl: document.querySelector('.sidebar'),
  resizeHandleEl: document.getElementById('resize-handle'),
  dockToggleButton: document.getElementById('dock-toggle'),
});

// --- Proyecto (fotogramas de animación) + autoguardado ---

const project = loadProject() || createProject(32, 32);
const currentFrame = () => getActiveFrame(project);
const autosave = createAutosaveScheduler(() => project);

// --- Zoom ---

const zoomControls = createZoomControls({
  canvasEl: canvas,
  viewportEl: document.querySelector('.canvas-viewport'),
  project,
  outButton: document.getElementById('zoom-out'),
  inButton: document.getElementById('zoom-in'),
  fitButton: document.getElementById('zoom-fit'),
  levelEl: document.getElementById('zoom-level'),
  onChange: () => redraw(),
});

// --- Redimensionar lienzo ---

createCanvasResizeControls({
  toggleButton: document.getElementById('resize-toggle'),
  panelEl: document.getElementById('resize-panel'),
  widthInput: document.getElementById('resize-width'),
  heightInput: document.getElementById('resize-height'),
  applyButton: document.getElementById('resize-apply'),
  project,
  onResize: () => {
    timeline.refreshAll();
    zoomControls.setZoom(zoomControls.computeFitZoom());
  },
});

// --- Color ---

const colorControls = createColorControls({
  paletteEl: document.getElementById('palette'),
  customPaletteEl: document.getElementById('custom-palette'),
  openPickerButton: document.getElementById('open-picker'),
  colorPickerEl: document.getElementById('color-picker'),
  svCanvas: document.getElementById('sv-canvas'),
  hueCanvas: document.getElementById('hue-canvas'),
  previewEl: document.getElementById('picker-preview'),
  hexEl: document.getElementById('picker-hex'),
  saveColorButton: document.getElementById('save-color'),
});

// --- Grosor de pincel y espejo ---

const paintOptions = createPaintOptions({
  brushSizeEl: document.getElementById('brush-size'),
  mirrorEl: document.getElementById('mirror'),
});

// --- Selección rectangular (estado de interacción, no forma parte del documento) ---

let selection = null;
const getSelection = () => selection;
const setSelection = (rect) => {
  selection = rect;
};

// --- Herramientas, barra de herramientas y atajos ---

const toolSetup = createToolSetup({
  toolbarEl: document.getElementById('toolbar'),
  selectColor: colorControls.selectColor,
  getSelection,
  setSelection,
  onClear: () => {
    execute(currentFrame().history, currentFrame().doc, createClearLayerCommand(currentFrame().doc.activeLayerIndex));
    redraw();
  },
});

// --- Capas y fotogramas ---

const layersPanel = createLayersPanel(document.getElementById('layers-panel'), {
  getDoc: () => currentFrame().doc,
  getHistory: () => currentFrame().history,
  onChange: () => redraw(),
});

const timeline = createTimeline(document.getElementById('timeline'), {
  project,
  onChange: () => redraw(),
});

// --- Exportar ---

createExportControls({
  pngButton: document.getElementById('export-png'),
  spritesheetButton: document.getElementById('export-spritesheet'),
  project,
  getCurrentDoc: () => currentFrame().doc,
});

// --- Render + wiring de entrada ---

function redraw() {
  const activeTool = toolSetup.getActiveTool();
  const onionSkinDoc =
    timeline.isOnionSkinEnabled() && project.activeFrameIndex > 0 ? project.frames[project.activeFrameIndex - 1].doc : null;

  render(ctx, currentFrame().doc, zoomControls.getZoom(), {
    overlay: activeTool.getPreview ? activeTool.getPreview() : null,
    selectionRect: selection,
    onionSkinDoc,
  });
  layersPanel.refresh();
  timeline.refresh();
  autosave.schedule();
}

bindPointerEvents(
  canvas,
  () => toolSetup.getActiveTool(),
  {
    getDoc: () => currentFrame().doc,
    getHistory: () => currentFrame().history,
    getColor: () => colorControls.getActiveColor(),
    getBrushSize: paintOptions.getBrushSize,
    getMirror: paintOptions.getMirror,
    getZoom: zoomControls.getZoom,
  },
  redraw,
);

window.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;

  if (mod) {
    if (event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo(currentFrame().history, currentFrame().doc);
      redraw();
    } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
      event.preventDefault();
      redo(currentFrame().history, currentFrame().doc);
      redraw();
    }
    return;
  }

  if (event.altKey) return;
  const toolId = toolSetup.shortcuts.get(event.key.toLowerCase());
  if (toolId) {
    toolSetup.toolbar.setActiveTool(toolId);
    redraw();
  }
});

redraw();
