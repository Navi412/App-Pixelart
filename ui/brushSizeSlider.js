const MIN_SIZE = 1;
const MAX_SIZE = 64;

export function createBrushSizeSlider(container) {
  let size = MIN_SIZE;
  let hideTimer = null;

  const track = document.createElement('div');
  track.className = 'brush-slider-track';

  const fill = document.createElement('div');
  fill.className = 'brush-slider-fill';
  track.appendChild(fill);

  const label = document.createElement('div');
  label.className = 'tooltip brush-slider-label';

  container.append(track, label);

  function ratio() {
    return (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
  }

  function updateFill() {
    fill.style.width = `${ratio() * 100}%`;
  }

  function showLabel() {
    label.textContent = `${size}px`;
    label.classList.add('is-visible');
    const rect = track.getBoundingClientRect();
    label.style.left = `${rect.left + rect.width * ratio()}px`;
    label.style.top = `${rect.top - 30}px`;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => label.classList.remove('is-visible'), 700);
  }

  function setSizeFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    size = Math.round(MIN_SIZE + x * (MAX_SIZE - MIN_SIZE));
    updateFill();
    showLabel();
  }

  let dragging = false;

  track.addEventListener('pointerdown', (event) => {
    dragging = true;
    track.setPointerCapture(event.pointerId);
    setSizeFromClientX(event.clientX);
  });

  track.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    setSizeFromClientX(event.clientX);
  });

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    scheduleHide();
  }

  track.addEventListener('pointerup', stopDrag);
  track.addEventListener('pointercancel', stopDrag);

  track.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size + (event.deltaY < 0 ? 1 : -1)));
      updateFill();
      showLabel();
      scheduleHide();
    },
    { passive: false },
  );

  updateFill();

  return () => size;
}
