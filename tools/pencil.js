import { createPaintTool } from './paintTool.js';

export function createPencilTool() {
  return createPaintTool((context) => context.color);
}
