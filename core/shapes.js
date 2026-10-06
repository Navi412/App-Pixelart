export function lineCells(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;

  while (true) {
    cells.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }

  return cells;
}

export function rectOutlineCells(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const cells = [];

  for (let x = minX; x <= maxX; x++) {
    cells.push({ x, y: minY });
    if (maxY !== minY) cells.push({ x, y: maxY });
  }
  for (let y = minY + 1; y < maxY; y++) {
    cells.push({ x: minX, y });
    if (maxX !== minX) cells.push({ x: maxX, y });
  }

  return cells;
}

export function ellipseOutlineCells(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;

  const seen = new Set();
  const cells = [];
  const steps = Math.max(32, Math.ceil((rx + ry) * 4));

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + rx * Math.cos(t));
    const y = Math.round(cy + ry * Math.sin(t));
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push({ x, y });
  }

  return cells;
}

export function rectFilledCells(x0, y0, x1, y1) {
  const cells = [];
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) cells.push({ x, y });
  }
  return cells;
}

// Rellena cada fila entre el punto más a la izquierda y el más a la derecha del
// contorno, para que el relleno encaje exactamente con ellipseOutlineCells.
export function ellipseFilledCells(x0, y0, x1, y1) {
  const spans = new Map();
  for (const { x, y } of ellipseOutlineCells(x0, y0, x1, y1)) {
    const span = spans.get(y);
    if (!span) spans.set(y, { min: x, max: x });
    else {
      span.min = Math.min(span.min, x);
      span.max = Math.max(span.max, x);
    }
  }

  const cells = [];
  for (const [y, { min, max }] of spans) {
    for (let x = min; x <= max; x++) cells.push({ x, y });
  }
  return cells;
}

const signOrOne = (n) => (n < 0 ? -1 : 1);

// Shift en la herramienta de línea: la ajusta a horizontal, vertical o 45°.
export function constrainLine(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (Math.abs(dx) > 2 * Math.abs(dy)) return { x: x1, y: y0 };
  if (Math.abs(dy) > 2 * Math.abs(dx)) return { x: x0, y: y1 };
  const d = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: x0 + signOrOne(dx) * d, y: y0 + signOrOne(dy) * d };
}

// Shift en rectángulo/elipse: fuerza un cuadrado/círculo.
export function constrainSquare(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: x0 + signOrOne(dx) * d, y: y0 + signOrOne(dy) * d };
}
