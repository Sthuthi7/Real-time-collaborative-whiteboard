'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ToolType, Stroke, FreehandStroke, LineStroke, RectStroke, CircleStroke, TextStroke } from '../types/stroke';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { drawStroke } from '../lib/drawStroke';

interface CanvasProps {
  activeTool: ToolType;
  activeColor: string;
  strokes: Stroke[];
  onStrokeComplete: (stroke: Stroke) => void;
  onCursorMove?: (x: number, y: number) => void;
}

interface DrawState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  points: { x: number; y: number }[];
}

interface TextInput {
  x: number;
  y: number;
  visible: boolean;
}

export default function Canvas({ activeTool, activeColor, strokes, onStrokeComplete, onCursorMove }: CanvasProps) {
  const persistentRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawState = useRef<DrawState>({ isDrawing: false, startX: 0, startY: 0, points: [] });
  const [textInput, setTextInput] = useState<TextInput>({ x: 0, y: 0, visible: false });
  const textRef = useRef<HTMLInputElement>(null);

  // Render committed strokes on the persistent canvas
  useCanvasRenderer(persistentRef, strokes);

  // Handle canvas resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (persistentRef.current) {
        persistentRef.current.width = width;
        persistentRef.current.height = height;
      }
      if (overlayRef.current) {
        overlayRef.current.width = width;
        overlayRef.current.height = height;
      }
      // Persistent canvas redraws via useCanvasRenderer on next render,
      // but we need to trigger it manually here by forcing a re-render isn't trivial.
      // Instead, redraw inline.
      if (persistentRef.current) {
        const ctx = persistentRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          strokes.forEach((s) => drawStroke(ctx, s));
        }
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw persistent canvas when strokes change (resize may clear it)
  useEffect(() => {
    const canvas = persistentRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((s) => drawStroke(ctx, s));
  }, [strokes]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  const drawPreview = useCallback((currentX: number, currentY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    const { startX, startY, points } = drawState.current;

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.save();
    ctx.strokeStyle = activeColor;
    ctx.fillStyle = activeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (activeTool) {
      case 'pencil': {
        if (points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
        break;
      }
      case 'eraser': {
        if (points.length < 2) break;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
        break;
      }
      case 'line': {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        break;
      }
      case 'arrow': {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        // Draw arrowhead preview
        const angle = Math.atan2(currentY - startY, currentX - startX);
        const len = 14;
        const spread = (Math.PI / 180) * 25;
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(currentX - len * Math.cos(angle - spread), currentY - len * Math.sin(angle - spread));
        ctx.lineTo(currentX - len * Math.cos(angle + spread), currentY - len * Math.sin(angle + spread));
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'rectangle': {
        ctx.beginPath();
        ctx.rect(startX, startY, currentX - startX, currentY - startY);
        ctx.stroke();
        break;
      }
      case 'circle': {
        const rx = Math.abs(currentX - startX) / 2;
        const ry = Math.abs(currentY - startY) / 2;
        const cx = startX + (currentX - startX) / 2;
        const cy = startY + (currentY - startY) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      default:
        break;
    }

    ctx.restore();
  }, [activeTool, activeColor]);

  const commitStroke = useCallback((endX: number, endY: number) => {
    const { startX, startY, points } = drawState.current;

    switch (activeTool) {
      case 'pencil':
      case 'eraser': {
        if (points.length < 2) break;
        const freehand: FreehandStroke = {
          id: crypto.randomUUID(),
          tool: activeTool,
          color: activeTool === 'eraser' ? '#ffffff' : activeColor,
          points: [...points],
        };
        onStrokeComplete(freehand);
        break;
      }
      case 'line': {
        const line: LineStroke = {
          id: crypto.randomUUID(),
          tool: 'line',
          color: activeColor,
          x1: startX, y1: startY, x2: endX, y2: endY,
        };
        onStrokeComplete(line);
        break;
      }
      case 'arrow': {
        const arrow: LineStroke = {
          id: crypto.randomUUID(),
          tool: 'arrow',
          color: activeColor,
          x1: startX, y1: startY, x2: endX, y2: endY,
        };
        onStrokeComplete(arrow);
        break;
      }
      case 'rectangle': {
        const rect: RectStroke = {
          id: crypto.randomUUID(),
          tool: 'rectangle',
          color: activeColor,
          x: startX,
          y: startY,
          width: endX - startX,
          height: endY - startY,
        };
        onStrokeComplete(rect);
        break;
      }
      case 'circle': {
        const circle: CircleStroke = {
          id: crypto.randomUUID(),
          tool: 'circle',
          color: activeColor,
          cx: startX + (endX - startX) / 2,
          cy: startY + (endY - startY) / 2,
          rx: Math.abs(endX - startX) / 2,
          ry: Math.abs(endY - startY) / 2,
        };
        onStrokeComplete(circle);
        break;
      }
      default:
        break;
    }
  }, [activeTool, activeColor, onStrokeComplete]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'text') return; // handled by click
    const { x, y } = getPos(e);
    drawState.current = { isDrawing: true, startX: x, startY: y, points: [{ x, y }] };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawState.current.isDrawing) return;
    const { x, y } = getPos(e);
    if (activeTool === 'pencil' || activeTool === 'eraser') {
      drawState.current.points.push({ x, y });
    }
    drawPreview(x, y);
    onCursorMove?.(x, y);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawState.current.isDrawing) return;
    const { x, y } = getPos(e);
    commitStroke(x, y);
    clearOverlay();
    drawState.current.isDrawing = false;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawState.current.isDrawing) return;
    const { x, y } = getPos(e);
    commitStroke(x, y);
    clearOverlay();
    drawState.current.isDrawing = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'text') return;
    const { x, y } = getPos(e);
    setTextInput({ x, y, visible: true });
    setTimeout(() => textRef.current?.focus(), 0);
  };

  const commitText = () => {
    const value = textRef.current?.value?.trim() ?? '';
    if (value) {
      const text: TextStroke = {
        id: crypto.randomUUID(),
        tool: 'text',
        color: activeColor,
        x: textInput.x,
        y: textInput.y,
        text: value,
        fontSize: 18,
      };
      onStrokeComplete(text);
    }
    setTextInput({ x: 0, y: 0, visible: false });
    if (textRef.current) textRef.current.value = '';
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText();
    } else if (e.key === 'Escape') {
      setTextInput({ x: 0, y: 0, visible: false });
      if (textRef.current) textRef.current.value = '';
    }
  };

  const cursorStyle = activeTool === 'eraser' ? 'cursor-cell' : activeTool === 'text' ? 'cursor-text' : 'cursor-crosshair';

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-white">
      {/* Persistent canvas — committed strokes */}
      <canvas
        ref={persistentRef}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />
      {/* Overlay canvas — live preview + event capture */}
      <canvas
        ref={overlayRef}
        className={`absolute inset-0 ${cursorStyle}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      {/* Text input overlay */}
      {textInput.visible && (
        <input
          ref={textRef}
          type="text"
          className="absolute bg-transparent outline-none border-b border-dashed border-gray-400 text-lg min-w-[100px]"
          style={{
            left: textInput.x,
            top: textInput.y - 18,
            color: activeColor,
            fontSize: '18px',
          }}
          onBlur={commitText}
          onKeyDown={handleTextKeyDown}
        />
      )}
    </div>
  );
}
