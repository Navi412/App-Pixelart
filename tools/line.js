import { createShapeTool } from './shapeTool.js';
import { lineCells } from '../core/shapes.js';

export function createLineTool() {
  return createShapeTool(lineCells);
}
