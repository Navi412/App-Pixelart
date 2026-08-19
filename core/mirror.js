export function mirrorCells(cells, width, height, mirror) {
  if (!mirror || (!mirror.horizontal && !mirror.vertical)) return cells;

  const map = new Map();
  const add = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    map.set(`${x},${y}`, { x, y });
  };

  for (const { x, y } of cells) {
    add(x, y);
    if (mirror.horizontal) add(width - 1 - x, y);
    if (mirror.vertical) add(x, height - 1 - y);
    if (mirror.horizontal && mirror.vertical) add(width - 1 - x, height - 1 - y);
  }

  return [...map.values()];
}
