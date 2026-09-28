'use client';

import { CursorPosition } from '../types/collaboration';

interface CursorOverlayProps {
  remoteCursors: Record<string, CursorPosition>;
  selfCursor: { x: number; y: number } | null;
  selfColor: string;
}

export default function CursorOverlay({ remoteCursors, selfCursor, selfColor }: CursorOverlayProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
      aria-hidden="true"
    >
      {/* Remote cursors */}
      {Object.entries(remoteCursors).map(([sessionId, cursor]) => (
        <div
          key={sessionId}
          className="absolute flex flex-col items-start"
          style={{ left: cursor.x, top: cursor.y, transform: 'translate(0, -100%)' }}
        >
          <span
            className="text-xs font-semibold px-1 rounded whitespace-nowrap"
            style={{ backgroundColor: cursor.displayColor, color: '#fff' }}
          >
            {cursor.displayName}
          </span>
          <div
            className="w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: cursor.displayColor, marginTop: 2 }}
          />
        </div>
      ))}

      {/* Self cursor label */}
      {selfCursor && (
        <div
          className="absolute flex flex-col items-start"
          style={{ left: selfCursor.x, top: selfCursor.y, transform: 'translate(0, -100%)' }}
        >
          <span
            className="text-xs font-semibold px-1 rounded whitespace-nowrap"
            style={{ backgroundColor: selfColor || '#555', color: '#fff' }}
          >
            You
          </span>
          <div
            className="w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: selfColor || '#555', marginTop: 2 }}
          />
        </div>
      )}
    </div>
  );
}
