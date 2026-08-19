export function createHistory() {
  return { undoStack: [], redoStack: [] };
}

export function execute(history, doc, command) {
  command.do(doc);
  history.undoStack.push(command);
  history.redoStack.length = 0;
}

export function undo(history, doc) {
  const command = history.undoStack.pop();
  if (!command) return;
  command.undo(doc);
  history.redoStack.push(command);
}

export function redo(history, doc) {
  const command = history.redoStack.pop();
  if (!command) return;
  command.do(doc);
  history.undoStack.push(command);
}

export function canUndo(history) {
  return history.undoStack.length > 0;
}

export function canRedo(history) {
  return history.redoStack.length > 0;
}
