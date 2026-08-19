import { createToolbar } from './toolbar.js';
import { attachTooltip } from './tooltip.js';
import { createPencilTool } from '../tools/pencil.js';
import { createEraserTool } from '../tools/eraser.js';
import { createBucketTool } from '../tools/bucket.js';
import { createEyedropperTool } from '../tools/eyedropper.js';
import { createLineTool } from '../tools/line.js';
import { createRectangleTool } from '../tools/rectangle.js';
import { createEllipseTool } from '../tools/ellipse.js';
import { createSelectionTool } from '../tools/selection.js';
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
} from './icons.js';

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

export function createToolSetup({ toolbarEl, selectColor, getSelection, setSelection, onClear }) {
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

  const shortcuts = new Map(TOOL_DEFS.filter((t) => t.shortcut).map((t) => [t.shortcut, t.id]));
  const toolbar = createToolbar(toolbarEl, TOOL_DEFS);

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'btn btn-icon';
  clearButton.innerHTML = CLEAR_ICON;
  attachTooltip(clearButton, { title: 'Borrar lienzo', description: 'Limpia toda la capa activa' });
  clearButton.addEventListener('click', onClear);
  toolbarEl.appendChild(clearButton);

  return {
    toolbar,
    shortcuts,
    getActiveTool: () => tools[toolbar.getToolId()],
  };
}
