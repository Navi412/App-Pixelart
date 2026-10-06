import { execute } from '../core/history.js';
import {
  copyRegion,
  createFillRegionCommand,
  createClearRegionCommand,
  createPasteCommand,
  createFlipRegionCommand,
} from '../core/region.js';
import { attachTooltip } from './tooltip.js';
import { COPY_ICON, CUT_ICON, PASTE_ICON, BUCKET_ICON, CLEAR_ICON, FLIP_H_ICON, FLIP_V_ICON } from './icons.js';

// Barra de acciones sobre la selección rectangular + sus atajos de teclado.
// El portapapeles es interno de la app (sirve para copiar entre fotogramas,
// capas o proyectos), no el del sistema.
export function createSelectionActions(containerEl, { getSelection, setSelection, getDoc, getHistory, getColor, onChange }) {
  let clipboard = null;

  function run(command) {
    const doc = getDoc();
    execute(getHistory(), doc, command(doc));
    onChange();
  }

  const actions = {
    copy() {
      const sel = getSelection();
      if (!sel) return;
      const doc = getDoc();
      clipboard = { ...copyRegion(doc.layers[doc.activeLayerIndex], doc.width, sel), x: sel.x, y: sel.y };
      refresh();
    },
    cut() {
      const sel = getSelection();
      if (!sel) return;
      actions.copy();
      run((doc) => createClearRegionCommand(doc.activeLayerIndex, doc.width, sel));
    },
    paste() {
      if (!clipboard) return;
      const doc = getDoc();
      const sel = getSelection();
      const x = Math.min(sel ? sel.x : clipboard.x, Math.max(0, doc.width - clipboard.width));
      const y = Math.min(sel ? sel.y : clipboard.y, Math.max(0, doc.height - clipboard.height));
      run((d) => createPasteCommand(d.activeLayerIndex, d.width, d.height, clipboard, x, y));
      // Lo pegado queda seleccionado, listo para arrastrarlo con la herramienta de selección.
      setSelection({
        x,
        y,
        width: Math.min(clipboard.width, doc.width - x),
        height: Math.min(clipboard.height, doc.height - y),
      });
      onChange();
    },
    fill() {
      const sel = getSelection();
      if (sel) run((doc) => createFillRegionCommand(doc.activeLayerIndex, doc.width, sel, getColor()));
    },
    clear() {
      const sel = getSelection();
      if (sel) run((doc) => createClearRegionCommand(doc.activeLayerIndex, doc.width, sel));
    },
    flipHorizontal() {
      const sel = getSelection();
      if (sel) run((doc) => createFlipRegionCommand(doc.activeLayerIndex, doc.width, sel, 'horizontal'));
    },
    flipVertical() {
      const sel = getSelection();
      if (sel) run((doc) => createFlipRegionCommand(doc.activeLayerIndex, doc.width, sel, 'vertical'));
    },
    selectAll() {
      const doc = getDoc();
      setSelection({ x: 0, y: 0, width: doc.width, height: doc.height });
      onChange();
    },
    deselect() {
      if (!getSelection()) return;
      setSelection(null);
      onChange();
    },
  };

  const BUTTONS = [
    { action: 'copy', icon: COPY_ICON, title: 'Copiar', shortcut: 'Ctrl+C', needsSelection: true },
    { action: 'cut', icon: CUT_ICON, title: 'Cortar', shortcut: 'Ctrl+X', needsSelection: true },
    { action: 'paste', icon: PASTE_ICON, title: 'Pegar', shortcut: 'Ctrl+V', description: 'Se pega seleccionado, listo para moverlo' },
    { action: 'fill', icon: BUCKET_ICON, title: 'Rellenar selección', description: 'Con el color activo', needsSelection: true },
    { action: 'clear', icon: CLEAR_ICON, title: 'Borrar selección', shortcut: 'Supr', needsSelection: true },
    { action: 'flipHorizontal', icon: FLIP_H_ICON, title: 'Voltear horizontal', needsSelection: true },
    { action: 'flipVertical', icon: FLIP_V_ICON, title: 'Voltear vertical', needsSelection: true },
  ];

  const buttons = BUTTONS.map((def) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-icon';
    button.innerHTML = def.icon;
    attachTooltip(button, { title: def.title, shortcut: def.shortcut, description: def.description });
    button.addEventListener('click', () => actions[def.action]());
    containerEl.appendChild(button);
    return { def, button };
  });

  function refresh() {
    const hasSelection = !!getSelection();
    containerEl.hidden = !hasSelection && !clipboard;
    for (const { def, button } of buttons) {
      button.disabled = def.action === 'paste' ? !clipboard : def.needsSelection && !hasSelection;
    }
  }

  // Devuelve true si el atajo era de la selección (para no procesarlo dos veces).
  function handleKeydown(event) {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    let action = null;

    if (mod && !event.shiftKey && !event.altKey) {
      action = { c: 'copy', x: 'cut', v: 'paste', a: 'selectAll' }[key] ?? null;
    } else if (!mod && (event.key === 'Delete' || event.key === 'Backspace') && getSelection()) {
      action = 'clear';
    } else if (!mod && event.key === 'Escape' && getSelection()) {
      action = 'deselect';
    }

    if (!action) return false;
    event.preventDefault();
    actions[action]();
    return true;
  }

  refresh();

  return { refresh, handleKeydown };
}
