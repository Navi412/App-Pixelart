import { createShapeTool } from './shapeTool.js';
import { rectOutlineCells } from '../core/shapes.js';

export function createRectangleTool() {
  return createShapeTool(rectOutlineCells);
}
