import { createDocument } from './core/document.js';
import { createHistory, undo, redo } from './core/history.js';
import { render } from './ui/canvas.js';
import { bindPointerEvents } from './ui/interaction.js';
import { createPalette } from './ui/palette.js';
import { createToolbar } from './ui/toolbar.js';
import { createPencilTool } from './tools/pencil.js';
import { createEraserTool } from './tools/eraser.js';
import { createBucketTool } from './tools/bucket.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const paletteEl = document.getElementById('palette');
const toolbarEl = document.getElementById('toolbar');

const zoom = 16;
const doc = createDocument(32, 32);
const history = createHistory();
const palette = createPalette(paletteEl);

const tools = {
  pencil: createPencilTool(),
  eraser: createEraserTool(),
  bucket: createBucketTool(),
};

const toolbar = createToolbar(toolbarEl, [
  { id: 'pencil', label: 'Lápiz' },
  { id: 'eraser', label: 'Goma' },
  { id: 'bucket', label: 'Bote' },
]);

function redraw() {
  render(ctx, doc, zoom);
}

bindPointerEvents(
  canvas,
  () => tools[toolbar.getToolId()],
  {
    getDoc: () => doc,
    getHistory: () => history,
    getColor: () => palette.getColor(),
    zoom,
  },
  redraw,
);

window.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;

  if (event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo(history, doc);
    redraw();
  } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
    event.preventDefault();
    redo(history, doc);
    redraw();
  }
});

redraw();
