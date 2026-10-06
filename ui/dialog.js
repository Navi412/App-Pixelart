// Diálogo de confirmación con el estilo de la app (en vez de window.confirm).
// confirmAction(...) devuelve una promesa que se resuelve a true/false.

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'confirm-dialog';
  dialogEl.innerHTML = `
    <form method="dialog">
      <p class="confirm-title"></p>
      <p class="confirm-message"></p>
      <div class="confirm-actions">
        <button type="submit" value="cancel" class="btn">Cancelar</button>
        <button type="submit" value="ok" class="btn btn-accent confirm-ok"></button>
      </div>
    </form>`;
  document.body.appendChild(dialogEl);
  return dialogEl;
}

export function confirmAction({ title, message = '', confirmLabel = 'Aceptar' }) {
  const dialog = ensureDialog();
  dialog.querySelector('.confirm-title').textContent = title;
  dialog.querySelector('.confirm-message').textContent = message;
  dialog.querySelector('.confirm-ok').textContent = confirmLabel;
  dialog.returnValue = '';

  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.showModal();
    dialog.querySelector('.confirm-ok').focus();
  });
}
