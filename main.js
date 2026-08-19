import { undo, redo, execute } from './core/history.js';
import { createClearLayerCommand } from './core/layer.js';
import { rgbToHex } from './core/color.js';
import { createProject, getActiveFrame } from './core/project.js';
import { serializeProject, deserializeProject } from './core/serialize.js';
import { render, composeLayers } from './ui/canvas.js';
import { bindPointerEvents } from './ui/interaction.js';
import { createPalette, DEFAULT_PALETTE } from './ui/palette.js';
import { createToolbar } from './ui/toolbar.js';
import { createColorPicker } from './ui/colorPicker.js';
import { createLayersPanel } from './ui/layersPanel.js';
import { createTimeline } from './ui/timeline.js';
import { attachTooltip } from './ui/tooltip.js';
import { createPencilTool } from './tools/pencil.js';
import { createEraserTool } from './tools/eraser.js';
import { createBucketTool } from './tools/bucket.js';
import { createEyedropperTool } from './tools/eyedropper.js';
import { createLineTool } from './tools/line.js';
import { createRectangleTool } from './tools/rectangle.js';
import { createEllipseTool } from './tools/ellipse.js';
import { createSelectionTool } from './tools/selection.js';
import {
  PENCIL_ICON,
  ERASER_ICON,
  BUCKET_ICON,
  CLEAR_ICON,
  EYEDROPPER_ICON,
  LINE_ICON,
  RECT_ICON,
  ELLIPSE_ICON,
  SELECT_ICON,
  DOCK_ICON,
} from './ui/icons.js';

const CUSTOM_COLORS_KEY = 'pixel-editor.customColors';
const SIDEBAR_STATE_KEY = 'pixel-editor.sidebar';
const PROJECT_KEY = 'pixel-editor.project';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const paletteEl = document.getElementById('palette');
const customPaletteEl = document.getElementById('custom-palette');
const toolbarEl = document.getElementById('toolbar');
const brushSizeEl = document.getElementById('brush-size');
const layersPanelEl = document.getElementById('layers-panel');
const timelineEl = document.getElementById('timeline');

const appLayoutEl = document.querySelector('.app-layout');
const sidebarEl = document.querySelector('.sidebar');
const resizeHandleEl = document.getElementById('resize-handle');
const dockToggleButton = document.getElementById('dock-toggle');
dockToggleButton.innerHTML = DOCK_ICON;
attachTooltip(dockToggleButton, { title: 'Cambiar de lado', description: 'Acopla la barra lateral a la izquierda o la derecha' });

function loadSidebarState() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSidebarState() {
  localStorage.setItem(
    SIDEBAR_STATE_KEY,
    JSON.stringify({ width: sidebarEl.style.width || null, dockLeft: appLayoutEl.classList.contains('dock-left') }),
  );
}

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 520;

// Se restaura antes de calcular el zoom: el tamaño del lienzo depende del hueco que deje la sidebar.
const sidebarState = loadSidebarState();
if (sidebarState.width) {
  const savedWidth = parseInt(sidebarState.width, 10);
  sidebarEl.style.width = `${Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, savedWidth))}px`;
}
if (sidebarState.dockLeft) appLayoutEl.classList.add('dock-left');

dockToggleButton.addEventListener('click', () => {
  appLayoutEl.classList.toggle('dock-left');
  saveSidebarState();
});

let resizingSidebar = false;

resizeHandleEl.addEventListener('pointerdown', (event) => {
  resizingSidebar = true;
  resizeHandleEl.setPointerCapture(event.pointerId);
});

resizeHandleEl.addEventListener('pointermove', (event) => {
  if (!resizingSidebar) return;
  const dockLeft = appLayoutEl.classList.contains('dock-left');
  const rawWidth = dockLeft ? event.clientX : window.innerWidth - event.clientX;
  sidebarEl.style.width = `${Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, rawWidth))}px`;
});

function stopResizingSidebar() {
  if (!resizingSidebar) return;
  resizingSidebar = false;
  saveSidebarState();
}

resizeHandleEl.addEventListener('pointerup', stopResizingSidebar);
resizeHandleEl.addEventListener('pointercancel', stopResizingSidebar);

function loadProject() {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    return raw ? deserializeProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const project = loadProject() || createProject(32, 32);
const currentFrame = () => getActiveFrame(project);

let autosaveTimer = null;
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(serializeProject(project)));
    } catch {
      // Almacenamiento lleno o no disponible: se ignora, no es crítico para seguir dibujando.
    }
  }, 400);
}

const ZOOM_MIN = 2;
const ZOOM_MAX = 64;
const ZOOM_STEP = 2;

function computeFitZoom() {
  const viewportEl = document.querySelector('.canvas-viewport');
  const chrome = 64; // aire + padding/borde del panel alrededor del lienzo
  const availableW = viewportEl.clientWidth - chrome;
  const availableH = viewportEl.clientHeight - chrome;
  const cellSize = Math.floor(Math.min(availableW, availableH) / Math.max(project.width, project.height));
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cellSize));
}

let zoom = computeFitZoom();

const zoomOutButton = document.getElementById('zoom-out');
const zoomInButton = document.getElementById('zoom-in');
const zoomFitButton = document.getElementById('zoom-fit');
const zoomLevelEl = document.getElementById('zoom-level');
attachTooltip(zoomOutButton, { title: 'Alejar' });
attachTooltip(zoomInButton, { title: 'Acercar' });
attachTooltip(zoomFitButton, { title: 'Ajustar', description: 'Encaja el lienzo en el hueco disponible' });

function setZoom(newZoom) {
  zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
  zoomLevelEl.textContent = `${zoom}px`;
  redraw();
}

zoomOutButton.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
zoomInButton.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
zoomFitButton.addEventListener('click', () => setZoom(computeFitZoom()));

canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  },
  { passive: false },
);

let activeColor = DEFAULT_PALETTE[0];

function loadCustomColors() {
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomColors(colors) {
  localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
}

function selectColor(color) {
  activeColor = color;
  palette.setActive(color);
  customPalette.setActive(color);
}

const palette = createPalette(paletteEl, { onSelect: selectColor });
const customPalette = createPalette(customPaletteEl, { colors: loadCustomColors(), onSelect: selectColor });

selectColor(activeColor);

const openPickerButton = document.getElementById('open-picker');
const colorPickerEl = document.getElementById('color-picker');
const pickerPreviewEl = document.getElementById('picker-preview');
const pickerHexEl = document.getElementById('picker-hex');
const saveColorButton = document.getElementById('save-color');

attachTooltip(openPickerButton, { title: 'Color personalizado', description: 'Abre el selector para mezclar un color a medida' });
openPickerButton.addEventListener('click', () => {
  colorPickerEl.classList.toggle('is-open');
});

const colorPicker = createColorPicker({
  svCanvas: document.getElementById('sv-canvas'),
  hueCanvas: document.getElementById('hue-canvas'),
  onChange: (color) => {
    pickerPreviewEl.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    pickerHexEl.textContent = rgbToHex(color);
  },
});

saveColorButton.addEventListener('click', () => {
  const color = colorPicker.getColor();
  customPalette.addColor(color);
  saveCustomColors(customPalette.getColors());
  selectColor(color);
});

let selection = null;
const getSelection = () => selection;
const setSelection = (rect) => {
  selection = rect;
};

const tools = {
  pencil: createPencilTool(),
  eraser: createEraserTool(),
  bucket: createBucketTool(),
  eyedropper: createEyedropperTool(selectColor),
  line: createLineTool(),
  rectangle: createRectangleTool(),
  ellipse: createEllipseTool(),
  selection: createSelectionTool({ getSelection, setSelection }),
};

const TOOL_DEFS = [
  { id: 'pencil', label: 'Lápiz', icon: PENCIL_ICON, shortcut: 'b', description: 'Dibuja píxel a píxel' },
  { id: 'eraser', label: 'Goma', icon: ERASER_ICON, shortcut: 'e', description: 'Borra a transparente' },
  { id: 'bucket', label: 'Bote', icon: BUCKET_ICON, shortcut: 'g', description: 'Rellena un área del mismo color' },
  {
    id: 'eyedropper',
    label: 'Cuentagotas',
    icon: EYEDROPPER_ICON,
    shortcut: 'i',
    description: 'Toma el color de un píxel del lienzo',
  },
  { id: 'line', label: 'Línea', icon: LINE_ICON, shortcut: 'l', description: 'Traza una línea recta' },
  {
    id: 'rectangle',
    label: 'Rectángulo',
    icon: RECT_ICON,
    shortcut: 'u',
    description: 'Dibuja el contorno de un rectángulo',
  },
  { id: 'ellipse', label: 'Elipse', icon: ELLIPSE_ICON, shortcut: 'j', description: 'Dibuja el contorno de una elipse' },
  {
    id: 'selection',
    label: 'Selección',
    icon: SELECT_ICON,
    shortcut: 'm',
    description: 'Selecciona un área y arrástrala para moverla',
  },
];

const TOOL_SHORTCUTS = new Map(TOOL_DEFS.filter((t) => t.shortcut).map((t) => [t.shortcut, t.id]));

const toolbar = createToolbar(toolbarEl, TOOL_DEFS);

const clearButton = document.createElement('button');
clearButton.type = 'button';
clearButton.className = 'btn btn-icon';
clearButton.innerHTML = CLEAR_ICON;
attachTooltip(clearButton, { title: 'Borrar lienzo', description: 'Limpia toda la capa activa' });
clearButton.addEventListener('click', () => {
  execute(currentFrame().history, currentFrame().doc, createClearLayerCommand(currentFrame().doc.activeLayerIndex));
  redraw();
});
toolbarEl.appendChild(clearButton);

const BRUSH_SIZES = [1, 2, 3, 4];
let brushSize = BRUSH_SIZES[0];
const brushSizeButtons = [];

for (const size of BRUSH_SIZES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn';
  button.textContent = String(size);
  attachTooltip(button, { title: `Grosor ${size}px`, description: 'Ancho del pincel/goma' });
  button.addEventListener('click', () => {
    brushSize = size;
    updateBrushSizeButtons();
  });
  brushSizeEl.appendChild(button);
  brushSizeButtons.push({ size, button });
}

function updateBrushSizeButtons() {
  for (const { size, button } of brushSizeButtons) {
    button.classList.toggle('is-pressed', size === brushSize);
  }
}

updateBrushSizeButtons();

const layersPanel = createLayersPanel(layersPanelEl, {
  getDoc: () => currentFrame().doc,
  getHistory: () => currentFrame().history,
  onChange: redraw,
});

const timeline = createTimeline(timelineEl, {
  project,
  onChange: redraw,
});

const exportButton = document.getElementById('export-png');
attachTooltip(exportButton, { title: 'Exportar PNG', description: 'Descarga el fotograma actual como imagen' });
exportButton.addEventListener('click', () => {
  const doc = currentFrame().doc;
  const offscreen = document.createElement('canvas');
  offscreen.width = doc.width;
  offscreen.height = doc.height;
  const offCtx = offscreen.getContext('2d');
  const composited = composeLayers(doc);
  offCtx.putImageData(new ImageData(composited, doc.width, doc.height), 0, 0);
  offscreen.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sprite.png';
    a.click();
    URL.revokeObjectURL(url);
  });
});

function redraw() {
  const activeTool = tools[toolbar.getToolId()];
  render(ctx, currentFrame().doc, zoom, {
    overlay: activeTool.getPreview ? activeTool.getPreview() : null,
    selectionRect: selection,
  });
  layersPanel.refresh();
  timeline.refresh();
  scheduleAutosave();
}

bindPointerEvents(
  canvas,
  () => tools[toolbar.getToolId()],
  {
    getDoc: () => currentFrame().doc,
    getHistory: () => currentFrame().history,
    getColor: () => activeColor,
    getBrushSize: () => brushSize,
    getZoom: () => zoom,
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
  const toolId = TOOL_SHORTCUTS.get(event.key.toLowerCase());
  if (toolId) {
    toolbar.setActiveTool(toolId);
    redraw();
  }
});

zoomLevelEl.textContent = `${zoom}px`;
redraw();
