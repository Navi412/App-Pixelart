import { createShapeTool } from './shapeTool.js';
import { lineCells, constrainLine } from '../core/shapes.js';

export function createLineTool() {
  return createShapeTool({ outline: lineCells, constrain: constrainLine });
}
