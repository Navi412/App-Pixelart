import { getPixel, setPixel } from './layer.js';

// Operaciones sobre una región rectangular { x, y, width, height } de una capa
// (lo que usa la selección: copiar, cortar, pegar, rellenar, borrar, voltear).

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

// Comando genérico: pone cada celda { x, y, color } a su color y guarda el anterior.
export function createSetCellsCommand(layerIndex, width, cells) {
  let changes = null;

  return {
    do(doc) {
      const layer = doc.layers[layerIndex];
      if (changes === null) changes = cells.map((c) => ({ ...c, before: getPixel(layer, width, c.x, c.y) }));
      for (const { x, y, color } of changes) setPixel(layer, width, x, y, color);
    },
    undo(doc) {
      const layer = doc.layers[layerIndex];
      for (const { x, y, before } of changes) setPixel(layer, width, x, y, before);
    },
  };
}

function regionCells(rect) {
  const cells = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) cells.push({ x, y });
  }
  return cells;
}

export function copyRegion(layer, width, rect) {
  const pixels = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    const src = ((rect.y + y) * width + rect.x) * 4;
    pixels.set(layer.pixels.subarray(src, src + rect.width * 4), y * rect.width * 4);
  }
  return { width: rect.width, height: rect.height, pixels };
}

export function createFillRegionCommand(layerIndex, width, rect, color) {
  return createSetCellsCommand(
    layerIndex,
    width,
    regionCells(rect).map((c) => ({ ...c, color })),
  );
}

export function createClearRegionCommand(layerIndex, width, rect) {
  return createFillRegionCommand(layerIndex, width, rect, TRANSPARENT);
}

// Pega `clip` con su esquina superior izquierda en (x, y). Los píxeles
// totalmente transparentes del recorte no tapan lo que haya debajo.
export function createPasteCommand(layerIndex, width, height, clip, x, y) {
  const cells = [];
  for (let cy = 0; cy < clip.height; cy++) {
    for (let cx = 0; cx < clip.width; cx++) {
      const tx = x + cx;
      const ty = y + cy;
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
      const i = (cy * clip.width + cx) * 4;
      if (clip.pixels[i + 3] === 0) continue;
      cells.push({
        x: tx,
        y: ty,
        color: { r: clip.pixels[i], g: clip.pixels[i + 1], b: clip.pixels[i + 2], a: clip.pixels[i + 3] },
      });
    }
  }
  return createSetCellsCommand(layerIndex, width, cells);
}

// axis: 'horizontal' (izquierda <-> derecha) o 'vertical' (arriba <-> abajo).
export function createFlipRegionCommand(layerIndex, width, rect, axis) {
  let inner = null;

  return {
    do(doc) {
      if (inner === null) {
        const layer = doc.layers[layerIndex];
        const cells = regionCells(rect).map(({ x, y }) => {
          const sx = axis === 'horizontal' ? rect.x + rect.width - 1 - (x - rect.x) : x;
          const sy = axis === 'vertical' ? rect.y + rect.height - 1 - (y - rect.y) : y;
          return { x, y, color: getPixel(layer, width, sx, sy) };
        });
        inner = createSetCellsCommand(layerIndex, width, cells);
      }
      inner.do(doc);
    },
    undo(doc) {
      inner.undo(doc);
    },
  };
}
