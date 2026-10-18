import type { ToolId } from "../store/editor";
import { ellipseTool, rectTool } from "./boxTool";
import { curveTool } from "./curveTool";
import { calibrateTool, handTool, measureTool } from "./measureTools";
import { nodeTool } from "./nodeTool";
import { polygonTool } from "./polygonTool";
import { selectTool } from "./selectTool";
import type { Tool } from "./tool";

export const TOOLS: Record<ToolId, Tool> = {
  select: selectTool,
  node: nodeTool,
  rect: rectTool,
  ellipse: ellipseTool,
  polygon: polygonTool,
  curve: curveTool,
  hand: handTool,
  measure: measureTool,
  calibrate: calibrateTool,
};

export interface ToolInfo {
  id: ToolId;
  label: string;
  key: string;
  description: string;
}

/** Toolbar order and single-key shortcuts. */
export const TOOLBAR: ToolInfo[] = [
  { id: "select", label: "Select", key: "V", description: "Select and move. Drag right to box-select, left to select anything touched." },
  { id: "node", label: "Edit points", key: "A", description: "Drag points and curve handles. Click an edge to add a point; Alt-click a point to toggle smooth/corner." },
  { id: "curve", label: "Smooth curve", key: "C", description: "Sketch a bed line; it becomes a clean curve. End near the start to close it." },
  { id: "polygon", label: "Line / polygon", key: "L", description: "Click points. Type a length and press Enter. Click the first point to close." },
  { id: "rect", label: "Rectangle", key: "R", description: "Drag, or click and type a size. Shift for a square." },
  { id: "ellipse", label: "Circle / ellipse", key: "O", description: "Drag, or click and type a size. Shift for a circle." },
  { id: "measure", label: "Measure", key: "M", description: "Drag to measure a distance. Nothing is added to the plan." },
  { id: "hand", label: "Pan", key: "H", description: "Drag to pan. Space-drag or middle-drag pans from any tool." },
];
