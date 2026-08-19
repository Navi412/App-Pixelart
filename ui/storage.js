import { serializeProject, deserializeProject } from '../core/serialize.js';

const PROJECT_KEY = 'pixel-editor.project';
const CUSTOM_COLORS_KEY = 'pixel-editor.customColors';
const SIDEBAR_STATE_KEY = 'pixel-editor.sidebar';
const AUTOSAVE_DELAY_MS = 400;

export function loadProject() {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    return raw ? deserializeProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveProject(project) {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(serializeProject(project)));
  } catch {
    // Almacenamiento lleno o no disponible: se ignora, no es crítico para seguir dibujando.
  }
}

export function createAutosaveScheduler(getProject) {
  let timer = null;
  return {
    schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => saveProject(getProject()), AUTOSAVE_DELAY_MS);
    },
  };
}

export function loadCustomColors() {
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomColors(colors) {
  localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
}

export function loadSidebarState() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSidebarState(state) {
  localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state));
}
