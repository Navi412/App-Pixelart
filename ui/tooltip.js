let tooltipEl = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function position(tooltip, target) {
  const rect = target.getBoundingClientRect();
  const ttRect = tooltip.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + ttRect.width > window.innerWidth - 4) {
    left = window.innerWidth - ttRect.width - 4;
  }
  if (top + ttRect.height > window.innerHeight - 4) {
    top = rect.top - ttRect.height - 6;
  }

  tooltip.style.left = `${Math.max(4, left)}px`;
  tooltip.style.top = `${Math.max(4, top)}px`;
}

function renderContent(tooltip, content) {
  if (typeof content === 'string') {
    tooltip.textContent = content;
    return;
  }
  const { title, shortcut, description } = content;
  tooltip.innerHTML = [
    `<strong>${title}</strong>`,
    shortcut ? ` <span class="tooltip-shortcut">(${shortcut})</span>` : '',
    description ? `<br>${description}` : '',
  ].join('');
}

export function attachTooltip(el, getContent) {
  const tooltip = ensureTooltip();

  function show() {
    const content = typeof getContent === 'function' ? getContent() : getContent;
    if (!content) return;
    renderContent(tooltip, content);
    tooltip.classList.add('is-visible');
    position(tooltip, el);
  }

  function hide() {
    tooltip.classList.remove('is-visible');
  }

  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
  el.addEventListener('focus', show);
  el.addEventListener('blur', hide);
  el.addEventListener('click', hide);
}
