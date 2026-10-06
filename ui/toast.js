// Avisos breves en la parte inferior de la pantalla.
// showToast devuelve una función para ocultarlo antes de tiempo.

let containerEl = null;

function ensureContainer() {
  if (containerEl) return containerEl;
  containerEl = document.createElement('div');
  containerEl.className = 'toast-container';
  containerEl.setAttribute('role', 'status');
  document.body.appendChild(containerEl);
  return containerEl;
}

// sticky: no se oculta solo (para errores que siguen pasando, como no poder guardar).
export function showToast(message, { kind = 'info', duration = 2600, sticky = false } = {}) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}`;
  toast.textContent = message;
  ensureContainer().appendChild(toast);

  let timer = null;
  const hide = () => {
    clearTimeout(timer);
    toast.remove();
  };
  if (!sticky) timer = setTimeout(hide, duration);
  return hide;
}
