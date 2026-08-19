import { createProject, applyProjectData } from '../core/project.js';
import { listProjects, loadProjectData, createProjectEntry, renameProjectEntry, deleteProjectEntry } from './storage.js';
import { attachTooltip } from './tooltip.js';

export function createProjectSwitcher({ toggleButton, panelEl, nameInput, listEl, createButton, deleteButton, project, getActiveId, setActiveId, onSwitch }) {
  attachTooltip(toggleButton, { title: 'Proyectos', description: 'Cambia, crea o elimina proyectos guardados' });

  function currentEntry() {
    return listProjects().find((entry) => entry.id === getActiveId());
  }

  function switchTo(id) {
    const data = loadProjectData(id);
    if (!data) return;
    applyProjectData(project, data);
    setActiveId(id);
    refresh();
    onSwitch();
  }

  toggleButton.addEventListener('click', () => {
    panelEl.classList.toggle('is-open');
    if (panelEl.classList.contains('is-open')) refresh();
  });

  nameInput.addEventListener('change', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    renameProjectEntry(getActiveId(), name);
    refresh();
  });

  createButton.addEventListener('click', () => {
    const fresh = createProject(project.width, project.height);
    const id = createProjectEntry(`Proyecto ${listProjects().length + 1}`);
    applyProjectData(project, fresh);
    setActiveId(id);
    onSwitch(); // guarda el proyecto en blanco recién creado antes de seguir
    refresh();
  });

  deleteButton.addEventListener('click', () => {
    const all = listProjects();
    if (all.length <= 1) return;
    const activeId = getActiveId();
    const remaining = all.find((entry) => entry.id !== activeId);
    deleteProjectEntry(activeId);
    switchTo(remaining.id);
  });

  function refresh() {
    const activeId = getActiveId();
    const entry = currentEntry();
    nameInput.value = entry ? entry.name : '';

    listEl.innerHTML = '';
    for (const other of listProjects()) {
      if (other.id === activeId) continue;
      const row = document.createElement('div');
      row.className = 'list-item';
      row.textContent = other.name;
      row.addEventListener('click', () => switchTo(other.id));
      listEl.appendChild(row);
    }

    deleteButton.disabled = listProjects().length <= 1;
  }

  refresh();

  return { refresh };
}
