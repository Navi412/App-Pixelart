// Cada entrada recuerda sobre qué objeto se ejecutó el comando (el doc de un
// fotograma o el proyecto entero). Así un único historial por proyecto puede
// mezclar trazos de distintos fotogramas con cambios de estructura (capas,
// fotogramas, tamaño) y deshacerlos en el orden correcto.

export function createHistory() {
  return { undoStack: [], redoStack: [] };
}

export function execute(history, target, command) {
  command.do(target);
  history.undoStack.push({ command, target });
  history.redoStack.length = 0;
}

// Devuelve el objeto afectado (o null si no había nada que deshacer), para que
// la UI pueda, por ejemplo, saltar al fotograma que acaba de cambiar.
export function undo(history) {
  const entry = history.undoStack.pop();
  if (!entry) return null;
  entry.command.undo(entry.target);
  history.redoStack.push(entry);
  return entry.target;
}

export function redo(history) {
  const entry = history.redoStack.pop();
  if (!entry) return null;
  entry.command.do(entry.target);
  history.undoStack.push(entry);
  return entry.target;
}

export function canUndo(history) {
  return history.undoStack.length > 0;
}

export function canRedo(history) {
  return history.redoStack.length > 0;
}
