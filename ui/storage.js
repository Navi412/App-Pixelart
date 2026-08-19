import { serializeProject, deserializeProject } from '../core/serialize.js';

const LEGACY_PROJECT_KEY = 'pixel-editor.project';
const PROJECT_DATA_PREFIX = 'pixel-editor.project.';
const PROJECTS_INDEX_KEY = 'pixel-editor.projects';
const ACTIVE_PROJECT_KEY = 'pixel-editor.activeProjectId';
const CUSTOM_COLORS_KEY = 'pixel-editor.customColors';
const SIDEBAR_STATE_KEY = 'pixel-editor.sidebar';
const AUTOSAVE_DELAY_MS = 400;

function projectDataKey(id) {
  return PROJECT_DATA_PREFIX + id;
}

function readIndex() {
  try {
    const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIndex(entries) {
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(entries));
}

// Si ya había un único proyecto guardado con el esquema antiguo, se convierte
// en el primer proyecto de la lista para no perder el trabajo ya hecho.
function migrateLegacyProject() {
  const raw = localStorage.getItem(LEGACY_PROJECT_KEY);
  if (!raw) return null;

  const id = crypto.randomUUID();
  localStorage.setItem(projectDataKey(id), raw);
  localStorage.removeItem(LEGACY_PROJECT_KEY);
  const entry = { id, name: 'Proyecto 1', updatedAt: Date.now() };
  writeIndex([entry]);
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  return entry;
}

export function listProjects() {
  return readIndex();
}

export function getActiveProjectId() {
  let index = readIndex();
  if (index.length === 0) {
    const migrated = migrateLegacyProject();
    if (migrated) return migrated.id;
  }

  let id = localStorage.getItem(ACTIVE_PROJECT_KEY);
  index = readIndex();
  if ((!id || !index.some((entry) => entry.id === id)) && index.length > 0) {
    id = index[0].id;
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }
  return id || null;
}

export function setActiveProjectId(id) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

export function loadProjectData(id) {
  try {
    const raw = localStorage.getItem(projectDataKey(id));
    return raw ? deserializeProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function touchProjectEntry(id) {
  const index = readIndex();
  const entry = index.find((e) => e.id === id);
  if (entry) {
    entry.updatedAt = Date.now();
    writeIndex(index);
  }
}

export function saveProjectData(id, project) {
  try {
    localStorage.setItem(projectDataKey(id), JSON.stringify(serializeProject(project)));
    touchProjectEntry(id);
  } catch {
    // Almacenamiento lleno o no disponible: se ignora, no es crítico para seguir dibujando.
  }
}

export function createProjectEntry(name) {
  const id = crypto.randomUUID();
  const index = readIndex();
  index.push({ id, name, updatedAt: Date.now() });
  writeIndex(index);
  return id;
}

export function renameProjectEntry(id, name) {
  const index = readIndex();
  const entry = index.find((e) => e.id === id);
  if (entry) {
    entry.name = name;
    writeIndex(index);
  }
}

export function deleteProjectEntry(id) {
  writeIndex(readIndex().filter((e) => e.id !== id));
  localStorage.removeItem(projectDataKey(id));
}

export function createAutosaveScheduler(getActiveProjectIdFn, getProject) {
  let timer = null;
  return {
    schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => saveProjectData(getActiveProjectIdFn(), getProject()), AUTOSAVE_DELAY_MS);
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
