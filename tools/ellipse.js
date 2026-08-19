import { createShapeTool } from './shapeTool.js';
import { ellipseOutlineCells } from '../core/shapes.js';

export function createEllipseTool() {
  return createShapeTool(ellipseOutlineCells);
}
