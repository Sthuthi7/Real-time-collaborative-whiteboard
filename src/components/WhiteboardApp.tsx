'use client';

import { useState } from 'react';
import { ToolType, Stroke } from '../types/stroke';
import { useHistory } from '../hooks/useHistory';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import Canvas from './Canvas';
import Toolbar from './Toolbar';

export default function WhiteboardApp() {
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const { strokes, addStroke, undo, redo, clear, canUndo, canRedo } = useHistory();

  useKeyboardShortcuts({ undo, redo });

  const handleStrokeComplete = (stroke: Stroke) => {
    addStroke(stroke);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={clear}
      />
      <Canvas
        activeTool={activeTool}
        activeColor={activeColor}
        strokes={strokes}
        onStrokeComplete={handleStrokeComplete}
      />
    </div>
  );
}
