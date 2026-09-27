# Requirements Document

## Introduction

Phase 1 of the collaborative real-time whiteboard app is a single-user drawing canvas built with Next.js, TypeScript, and Tailwind CSS. It provides a full suite of drawing tools (pencil, eraser, line, arrow, rectangle, circle, text), color selection, undo/redo history, and a clear board action. The goal is a polished, interactive canvas experience that serves as the foundation for real-time collaboration in Phase 2.

## Glossary

- **Canvas**: The HTML5 canvas element that serves as the drawing surface.
- **Tool**: A drawing mode the user can activate (pencil, eraser, line, arrow, rectangle, circle, text).
- **Stroke**: A single drawn element (a path, shape, or text entry) placed on the Canvas.
- **History**: The ordered list of Strokes used to support undo and redo operations.
- **Toolbar**: The UI panel containing tool buttons, color picker, and action buttons.
- **App**: The Next.js whiteboard application (Phase 1).
- **Color_Picker**: The UI control for selecting the active drawing color.
- **Text_Tool**: The tool that allows the user to place and type text on the Canvas.

---

## Requirements

### Requirement 1: Canvas Setup

**User Story:** As a user, I want a full-screen drawing canvas, so that I have maximum space to draw and sketch.

#### Acceptance Criteria

1. THE App SHALL render a Canvas that fills the full viewport width and height.
2. WHEN the browser window is resized, THE App SHALL resize the Canvas to match the new viewport dimensions without clearing the existing drawing.
3. THE Canvas SHALL have a white background by default.

---

### Requirement 2: Pencil Tool

**User Story:** As a user, I want to draw freehand lines, so that I can sketch freely on the canvas.

#### Acceptance Criteria

1. WHEN the pencil tool is active and the user presses the mouse button on the Canvas, THE App SHALL begin recording a freehand path.
2. WHILE the pencil tool is active and the mouse button is held, THE App SHALL continuously draw the path following the cursor position.
3. WHEN the user releases the mouse button, THE App SHALL finalize the freehand path as a Stroke and add it to the History.

---

### Requirement 3: Eraser Tool

**User Story:** As a user, I want to erase parts of my drawing, so that I can correct mistakes without clearing the entire board.

#### Acceptance Criteria

1. WHEN the eraser tool is active and the user presses and drags on the Canvas, THE App SHALL remove drawn content along the cursor path.
2. THE Eraser SHALL erase content by drawing over it with the Canvas background color (white).
3. WHEN the user releases the mouse button while using the eraser tool, THE App SHALL finalize the erase operation as a Stroke and add it to the History.

---

### Requirement 4: Color Picker

**User Story:** As a user, I want to choose a drawing color, so that I can create colorful and expressive drawings.

#### Acceptance Criteria

1. THE Toolbar SHALL display a Color_Picker control that shows the currently active color.
2. WHEN the user selects a color from the Color_Picker, THE App SHALL update the active drawing color immediately.
3. WHEN the pencil, line, arrow, rectangle, or circle tool is active, THE App SHALL use the active color for all new Strokes.
4. THE Color_Picker SHALL support at minimum a palette of preset colors and a custom color input.

---

### Requirement 5: Line Tool

**User Story:** As a user, I want to draw straight lines, so that I can add precise linear elements to my drawing.

#### Acceptance Criteria

1. WHEN the line tool is active and the user presses the mouse button on the Canvas, THE App SHALL record the start point of the line.
2. WHILE the line tool is active and the mouse button is held, THE App SHALL render a live preview of the line from the start point to the current cursor position.
3. WHEN the user releases the mouse button, THE App SHALL finalize the straight line as a Stroke and add it to the History.

---

### Requirement 6: Arrow Tool

**User Story:** As a user, I want to draw arrows, so that I can annotate and indicate direction in my drawings.

#### Acceptance Criteria

1. WHEN the arrow tool is active and the user presses the mouse button on the Canvas, THE App SHALL record the start point of the arrow.
2. WHILE the arrow tool is active and the mouse button is held, THE App SHALL render a live preview of the arrow from the start point to the current cursor position, including an arrowhead.
3. WHEN the user releases the mouse button, THE App SHALL finalize the arrow as a Stroke and add it to the History.
4. THE App SHALL render the arrowhead at the endpoint of the arrow in the active color.

---

### Requirement 7: Rectangle Tool

**User Story:** As a user, I want to draw rectangles, so that I can create boxes and frames in my diagrams.

#### Acceptance Criteria

1. WHEN the rectangle tool is active and the user presses the mouse button on the Canvas, THE App SHALL record the origin corner of the rectangle.
2. WHILE the rectangle tool is active and the mouse button is held, THE App SHALL render a live preview of the rectangle defined by the origin corner and the current cursor position.
3. WHEN the user releases the mouse button, THE App SHALL finalize the rectangle as a Stroke and add it to the History.

---

### Requirement 8: Circle Tool

**User Story:** As a user, I want to draw circles and ellipses, so that I can add rounded shapes to my drawings.

#### Acceptance Criteria

1. WHEN the circle tool is active and the user presses the mouse button on the Canvas, THE App SHALL record the center point of the circle.
2. WHILE the circle tool is active and the mouse button is held, THE App SHALL render a live preview of the ellipse defined by the origin point and the current cursor position.
3. WHEN the user releases the mouse button, THE App SHALL finalize the ellipse as a Stroke and add it to the History.

---

### Requirement 9: Text Tool

**User Story:** As a user, I want to place text on the canvas, so that I can label and annotate my drawings.

#### Acceptance Criteria

1. WHEN the text tool is active and the user clicks on the Canvas, THE App SHALL place an editable text input at the clicked position.
2. WHILE the text input is active, THE App SHALL display the typed text on the Canvas in the active color.
3. WHEN the user presses Enter or clicks outside the text input, THE App SHALL finalize the text as a Stroke and add it to the History.
4. IF the user dismisses the text input without entering any text, THEN THE App SHALL discard the input without adding a Stroke to the History.

---

### Requirement 10: Undo / Redo

**User Story:** As a user, I want to undo and redo actions, so that I can correct mistakes and revisit changes.

#### Acceptance Criteria

1. THE Toolbar SHALL display an undo button and a redo button.
2. WHEN the user activates the undo action, THE App SHALL remove the most recent Stroke from the Canvas and move it to the redo stack.
3. WHEN the user activates the redo action, THE App SHALL re-apply the most recently undone Stroke to the Canvas.
4. WHEN a new Stroke is added after an undo, THE App SHALL clear the redo stack.
5. IF the History is empty, THEN THE App SHALL disable the undo button.
6. IF the redo stack is empty, THEN THE App SHALL disable the redo button.
7. THE App SHALL support keyboard shortcuts: Ctrl+Z (or Cmd+Z on macOS) for undo and Ctrl+Y (or Cmd+Shift+Z on macOS) for redo.

---

### Requirement 11: Clear Board

**User Story:** As a user, I want to clear the entire canvas, so that I can start fresh without manually erasing everything.

#### Acceptance Criteria

1. THE Toolbar SHALL display a clear board button.
2. WHEN the user activates the clear board action, THE App SHALL remove all Strokes from the Canvas and reset the History.
3. WHEN the user activates the clear board action, THE App SHALL fill the Canvas with the default white background.

---

### Requirement 12: Toolbar UI

**User Story:** As a user, I want a clearly organized toolbar, so that I can easily find and switch between tools.

#### Acceptance Criteria

1. THE Toolbar SHALL display a button for each tool: pencil, eraser, line, arrow, rectangle, circle, and text.
2. WHEN the user selects a tool, THE Toolbar SHALL visually indicate the currently active tool.
3. THE Toolbar SHALL remain accessible and visible at all times while the Canvas is displayed.
4. THE App SHALL default to the pencil tool on initial load.
