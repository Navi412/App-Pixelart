// Los atajos de teclado no deben dispararse mientras se escribe en un campo
// (renombrar proyecto o capa, tamaño del lienzo...).
export function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  if (target.tagName !== 'INPUT') return false;
  return !['button', 'checkbox', 'radio', 'range', 'color', 'file'].includes(target.type);
}
