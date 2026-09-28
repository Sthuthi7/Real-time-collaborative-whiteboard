'use client';

import { ToolType } from '../types/stroke';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  participantCount?: number;
  roomId?: string;
}

const TOOLS: { tool: ToolType; label: string; icon: string }[] = [
  { tool: 'pencil',    label: 'Pencil',    icon: '✏️' },
  { tool: 'eraser',   label: 'Eraser',    icon: '🧹' },
  { tool: 'line',     label: 'Line',      icon: '📏' },
  { tool: 'arrow',    label: 'Arrow',     icon: '↗️' },
  { tool: 'rectangle',label: 'Rect',      icon: '⬜' },
  { tool: 'circle',   label: 'Circle',    icon: '⭕' },
  { tool: 'text',     label: 'Text',      icon: '📝' },
];

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#a855f7',
  '#ec4899', '#6b7280',
];

export default function Toolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  participantCount,
  roomId,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-100 border-r border-gray-200 h-full w-16 items-center overflow-y-auto shrink-0">
      {/* Room info */}
      {roomId && (
        <div className="w-full text-center" title={`Room: ${roomId}`}>
          <span className="text-xs text-gray-400 truncate block max-w-full">#{roomId.slice(0, 6)}</span>
        </div>
      )}
      {participantCount !== undefined && (
        <div className="text-xs text-green-600 font-semibold" title={`${participantCount} online`}>
          🟢{participantCount}
        </div>
      )}
      {TOOLS.map(({ tool, label, icon }) => (
        <button
          key={tool}
          title={label}
          aria-label={label}
          aria-pressed={activeTool === tool}
          onClick={() => onToolChange(tool)}
          className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-colors
            ${activeTool === tool
              ? 'bg-blue-500 text-white ring-2 ring-blue-300'
              : 'bg-white text-gray-700 hover:bg-gray-200'
            }`}
        >
          {icon}
        </button>
      ))}

      <div className="w-full border-t border-gray-300 my-1" />

      {/* Undo */}
      <button
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        onClick={onUndo}
        disabled={!canUndo}
        className="w-10 h-10 rounded-lg bg-white text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg"
      >
        ↩️
      </button>

      {/* Redo */}
      <button
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
        onClick={onRedo}
        disabled={!canRedo}
        className="w-10 h-10 rounded-lg bg-white text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg"
      >
        ↪️
      </button>

      {/* Clear */}
      <button
        title="Clear board"
        aria-label="Clear board"
        onClick={onClear}
        className="w-10 h-10 rounded-lg bg-white text-gray-700 hover:bg-red-100 flex items-center justify-center text-lg"
      >
        🗑️
      </button>

      <div className="w-full border-t border-gray-300 my-1" />

      {/* Active color indicator */}
      <div
        className="w-8 h-8 rounded-full border-2 border-gray-400 shrink-0"
        style={{ backgroundColor: activeColor }}
        title={`Active color: ${activeColor}`}
        aria-label={`Active color: ${activeColor}`}
      />

      {/* Preset color swatches */}
      <div className="flex flex-col gap-1 items-center">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            title={color}
            aria-label={`Select color ${color}`}
            onClick={() => onColorChange(color)}
            className={`w-6 h-6 rounded-full border transition-transform hover:scale-110
              ${activeColor === color ? 'border-blue-500 ring-2 ring-blue-300 scale-110' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Custom color picker */}
      <label title="Custom color" className="cursor-pointer">
        <span className="sr-only">Custom color</span>
        <input
          type="color"
          value={activeColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-300"
          aria-label="Custom color picker"
        />
      </label>
    </div>
  );
}
