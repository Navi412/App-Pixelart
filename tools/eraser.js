import { createPaintTool } from './paintTool.js';

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

export function createEraserTool() {
  return createPaintTool(() => TRANSPARENT);
}
