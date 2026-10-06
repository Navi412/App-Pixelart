import { createShapeTool } from './shapeTool.js';
import { rectOutlineCells, rectFilledCells, constrainSquare } from '../core/shapes.js';

export function createRectangleTool() {
  return createShapeTool({ outline: rectOutlineCells, filled: rectFilledCells, constrain: constrainSquare });
}
