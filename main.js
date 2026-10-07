import { undo, redo, execute } from './core/history.js';
import { createClearLayerCommand } from './core/layer.js';
import { createProject, getActiveFrame } from './core/project.js';
import { render } from './ui/canvas.js';
import { bindPointerEvents } from './ui/interaction.js';
import {
  getActiveProjectId,
  setActiveProjectId,
  loadProjectData,
  createProjectEntry,
  createAutosaveScheduler,
  listProjects,
} from './ui/storage.js';
import { createSidebarDock } from './ui/sidebarDock.js';
import { createThemeToggle } from './ui/themeToggle.js';
import { createZoomControls } from './ui/zoomControls.js';
import { createViewportPan } from './ui/viewportPan.js';
import { createCanvasResizeControls } from './ui/canvasResizeControls.js';
import { createProjectSwitcher } from './ui/projectSwitcher.js';
import { createImportControls } from './ui/importControls.js';
import { createColorControls } from './ui/colorControls.js';
import { createPaintOptions } from './ui/paintOptions.js';
import { createToolSetup } from './ui/toolSetup.js';
import { createSelectionActions } from './ui/selectionActions.js';
import { createLayersPanel } from './ui/layersPanel.js';
import { createTimeline } from './ui/timeline.js';
import { createExportControls } from './ui/exportControls.js';
import { isTypingTarget } from './ui/keyboard.js';
import { showToast } from './ui/toast.js';

// --- Referencias al DOM ---

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const viewportEl = document.querySelector('.canvas-viewport');

// --- Barra lateral: debe restaurarse antes de calcular el zoom de ajuste,
// ya que este depende del hueco que deja la sidebar en pantalla. ---

createSidebarDock({
  appLayoutEl: document.querySelector('.app-layout'),
  sidebarEl: document.querySelector('.sidebar'),
  resizeHandleEl: document.getElementById('resize-handle'),
  dockToggleButton: document.getElementById('dock-toggle'),
});

// --- Tema claro/oscuro (el lienzo se repinta para recoger el nuevo acento) ---

createThemeToggle({
  button: document.getElementById('theme-toggle'),
  onChange: () => redraw(),
});

// --- Proyecto activo (puede haber varios guardados) + autoguardado ---

let activeProjectId = getActiveProjectId();
const project = (activeProjectId && loadProjectData(activeProjectId)) || createProject(32, 32);
if (!activeProjectId) {
  activeProjectId = createProjectEntry('Proyecto 1');
  setActiveProjectId(activeProjectId);
}

const currentFrame = () => getActiveFrame(project);
const getProjectName = () => listProjects().find((entry) => entry.id === activeProjectId)?.name;

// Si el almacenamiento se llena, el aviso se queda fijo hasta que vuelva a poder guardarse.
let hideSaveError = null;
const autosave = createAutosaveScheduler(() => activeProjectId, () => project, {
  onResult: (saved) => {
    if (saved) {
      hideSaveError?.();
      hideSaveError = null;
    } else if (!hideSaveError) {
      hideSaveError = showToast(
        'No se puede guardar: el almacenamiento está lleno. Exporta tu trabajo o elimina proyectos antiguos.',
        { kind: 'error', sticky: true },
      );
    }
  },
});

// --- Selección rectangular (estado de interacción, no forma parte del documento) ---

let selection = null;
const getSelection = () => selection;
const setSelection = (rect) => {
  selection = rect;
};

// --- Zoom, cuadrícula y desplazamiento de la vista ---

const zoomControls = createZoomControls({
  canvasEl: canvas,
  viewportEl,
  project,
  outButton: document.getElementById('zoom-out'),
  inButton: document.getElementById('zoom-in'),
  fitButton: document.getElementById('zoom-fit'),
  gridButton: document.getElementById('grid-toggle'),
  levelEl: document.getElementById('zoom-level'),
  onChange: () => redraw(),
});

createViewportPan(viewportEl);

// Tras cambios que pueden alterar fotogramas, capas o tamaño (cambiar de
// proyecto, redimensionar, deshacer...) se refresca todo lo que depende de ello.
function refreshStructure({ refit = false } = {}) {
  if (selection && (selection.x + selection.width > project.width || selection.y + selection.height > project.height)) {
    selection = null;
  }
  timeline.refreshAll();
  layersPanel.refresh();
  if (refit) zoomControls.setZoom(zoomControls.computeFitZoom());
  else redraw();
}

// --- Redimensionar lienzo ---

createCanvasResizeControls({
  toggleButton: document.getElementById('resize-toggle'),
  panelEl: document.getElementById('resize-panel'),
  widthInput: document.getElementById('resize-width'),
  heightInput: document.getElementById('resize-height'),
  applyButton: document.getElementById('resize-apply'),
  project,
  onResize: () => refreshStructure({ refit: true }),
});

// --- Varios proyectos ---

createProjectSwitcher({
  toggleButton: document.getElementById('project-toggle'),
  panelEl: document.getElementById('project-panel'),
  nameInput: document.getElementById('project-name'),
  listEl: document.getElementById('project-list'),
  createButton: document.getElementById('project-create'),
  deleteButton: document.getElementById('project-delete'),
  project,
  getActiveId: () => activeProjectId,
  setActiveId: (id) => {
    activeProjectId = id;
  },
  onSwitch: () => {
    timeline.stopPlayback();
    selection = null;
    refreshStructure({ refit: true });
  },
});

// --- Importar imagen ---

createImportControls({
  button: document.getElementById('import-image'),
  fileInput: document.getElementById('import-file'),
  project,
  onImported: () => refreshStructure(),
});

// --- Color ---

const colorControls = createColorControls({
  paletteEl: document.getElementById('palette'),
  customPaletteEl: document.getElementById('custom-palette'),
  openPickerButton: document.getElementById('open-picker'),
  colorPickerEl: document.getElementById('color-picker'),
  svCanvas: document.getElementById('sv-canvas'),
  hueCanvas: document.getElementById('hue-canvas'),
  alphaCanvas: document.getElementById('alpha-canvas'),
  previewEl: document.getElementById('picker-preview'),
  hexEl: document.getElementById('picker-hex'),
  saveColorButton: document.getElementById('save-color'),
});

// --- Grosor de pincel, espejo y relleno de formas ---

const paintOptions = createPaintOptions({
  brushSizeEl: document.getElementById('brush-size'),
  optionsEl: document.getElementById('paint-options'),
});

// --- Herramientas, barra de herramientas y atajos ---

const toolSetup = createToolSetup({
  toolbarEl: document.getElementById('toolbar'),
  selectColor: colorControls.selectColor,
  getSelection,
  setSelection,
  onClear: () => {
    execute(project.history, currentFrame().doc, createClearLayerCommand(currentFrame().doc.activeLayerIndex));
    redraw();
  },
});

const selectionActions = createSelectionActions(document.getElementById('selection-actions'), {
  getSelection,
  setSelection,
  getDoc: () => currentFrame().doc,
  getHistory: () => project.history,
  getColor: () => colorControls.getActiveColor(),
  onChange: () => redraw(),
});

// --- Capas y fotogramas ---

const layersPanel = createLayersPanel(document.getElementById('layers-panel'), {
  project,
  onChange: () => redraw(),
});

const timeline = createTimeline(document.getElementById('timeline'), {
  project,
  onChange: () => redraw(),
});

// --- Exportar ---

createExportControls({
  toggleButton: document.getElementById('export-toggle'),
  panelEl: document.getElementById('export-panel'),
  scaleEl: document.getElementById('export-scale'),
  pngButton: document.getElementById('export-png'),
  spritesheetButton: document.getElementById('export-spritesheet'),
  gifButton: document.getElementById('export-gif'),
  project,
  getCurrentDoc: () => currentFrame().doc,
  getProjectName,
});

// --- Render + wiring de entrada ---

let pointer = null;

// Solo el lienzo: es lo que se repinta al mover el puntero sin dibujar (huella de la herramienta).
function renderCanvas() {
  const activeTool = toolSetup.getActiveTool();
  const onionSkinDoc =
    timeline.isOnionSkinEnabled() && project.activeFrameIndex > 0 ? project.frames[project.activeFrameIndex - 1].doc : null;

  render(ctx, currentFrame().doc, zoomControls.getZoom(), {
    overlay: activeTool.getPreview ? activeTool.getPreview() : null,
    cursor: pointer?.getCursor(),
    selectionRect: selection,
    onionSkinDoc,
    grid: zoomControls.isGridEnabled(),
  });
}

function redraw() {
  renderCanvas();
  layersPanel.refresh();
  timeline.refresh();
  selectionActions.refresh();
  autosave.schedule();
}

pointer = bindPointerEvents(
  canvas,
  () => toolSetup.getActiveTool(),
  {
    getDoc: () => currentFrame().doc,
    getHistory: () => project.history,
    getColor: () => colorControls.getActiveColor(),
    getBrushSize: paintOptions.getBrushSize,
    getMirror: paintOptions.getMirror,
    getFill: paintOptions.getFill,
    getZoom: zoomControls.getZoom,
  },
  redraw,
  renderCanvas,
);

// Deshacer/rehacer: si el cambio era de otro fotograma, se salta a él para verlo.
function undoRedo(fn) {
  timeline.stopPlayback();
  const sizeBefore = `${project.width}x${project.height}`;
  const target = fn(project.history);
  if (!target) return;
  if (target !== project) {
    const index = project.frames.findIndex((frame) => frame.doc === target);
    if (index >= 0) project.activeFrameIndex = index;
  }
  refreshStructure({ refit: `${project.width}x${project.height}` !== sizeBefore });
}

window.addEventListener('keydown', (event) => {
  // Mientras se escribe (nombre de proyecto o capa, tamaño...) el teclado es del campo.
  if (isTypingTarget(event.target)) return;
  if (selectionActions.handleKeydown(event)) return;

  const mod = event.ctrlKey || event.metaKey;

  if (mod) {
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoRedo(undo);
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      event.preventDefault();
      undoRedo(redo);
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

// El zoom de ajuste se recalcula ya con toda la UI montada (la timeline, por
// ejemplo, reduce el hueco disponible para el lienzo). setZoom repinta.
zoomControls.setZoom(zoomControls.computeFitZoom());
