'use client';

import { useState, useMemo, useRef } from 'react';
import { ToolType, Stroke } from '../types/stroke';
import { useHistory } from '../hooks/useHistory';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCollaboration } from '../hooks/useCollaboration';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import CursorOverlay from './CursorOverlay';
import ConnectionBanner from './ConnectionBanner';

interface CollaborativeWhiteboardAppProps {
  roomId: string;
}

export default function CollaborativeWhiteboardApp({ roomId }: CollaborativeWhiteboardAppProps) {
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [selfCursor, setSelfCursor] = useState<{ x: number; y: number } | null>(null);

  const { strokes: localStrokes, addStroke, undo, redo, clear, canUndo, canRedo } = useHistory();
  const { remoteStrokes, participants, remoteCursors, self, connectionStatus, sendStroke, sendCursor, sendClear } =
    useCollaboration(roomId, clear);

  useKeyboardShortcuts({ undo, redo });

  // Merge local + remote strokes, deduplicated by id
  const allStrokes = useMemo(() => {
    const seen = new Set<string>();
    const merged: Stroke[] = [];
    // Remote strokes come with server timestamps — treat them as the source of truth ordering
    for (const s of remoteStrokes) {
      if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
    }
    // Local strokes not yet echoed back
    for (const s of localStrokes) {
      if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
    }
    return merged;
  }, [localStrokes, remoteStrokes]);

  const handleStrokeComplete = (stroke: Stroke) => {
    addStroke(stroke);
    sendStroke(stroke);
  };

  const handleClear = () => {
    clear();
    sendClear();
  };

  const handleCursorMove = (x: number, y: number) => {
    setSelfCursor({ x, y });
    sendCursor(x, y);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ConnectionBanner status={connectionStatus} />

      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={handleClear}
        participantCount={participants.length}
        roomId={roomId}
      />

      <div className="relative flex-1 h-full">
        <Canvas
          activeTool={activeTool}
          activeColor={activeColor}
          strokes={allStrokes}
          onStrokeComplete={handleStrokeComplete}
          onCursorMove={handleCursorMove}
        />
        <CursorOverlay
          remoteCursors={remoteCursors}
          selfCursor={selfCursor}
          selfColor={self?.displayColor ?? '#555'}
        />
      </div>
    </div>
  );
}
