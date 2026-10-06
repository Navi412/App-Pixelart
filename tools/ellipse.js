import { createShapeTool } from './shapeTool.js';
import { ellipseOutlineCells, ellipseFilledCells, constrainSquare } from '../core/shapes.js';

export function createEllipseTool() {
  return createShapeTool({ outline: ellipseOutlineCells, filled: ellipseFilledCells, constrain: constrainSquare });
}
