export type ToolType =
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'text';

interface BaseStroke {
  id: string;
  color: string;
}

export interface FreehandStroke extends BaseStroke {
  tool: 'pencil' | 'eraser';
  points: { x: number; y: number }[];
}

export interface LineStroke extends BaseStroke {
  tool: 'line' | 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectStroke extends BaseStroke {
  tool: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleStroke extends BaseStroke {
  tool: 'circle';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface TextStroke extends BaseStroke {
  tool: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type Stroke =
  | FreehandStroke
  | LineStroke
  | RectStroke
  | CircleStroke
  | TextStroke;
