import { useState, useCallback } from 'react';
import { Stroke } from '../types/stroke';

export interface HistoryState {
  strokes: Stroke[];
  redoStack: Stroke[];
  addStroke: (s: Stroke) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistory(): HistoryState {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  const addStroke = useCallback((s: Stroke) => {
    setStrokes((prev) => [...prev, s]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      setRedoStack((r) => [...r, prev[prev.length - 1]]);
      return next;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const stroke = prev[prev.length - 1];
      setStrokes((s) => [...s, stroke]);
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
  }, []);

  return {
    strokes,
    redoStack,
    addStroke,
    undo,
    redo,
    clear,
    canUndo: strokes.length > 0,
    canRedo: redoStack.length > 0,
  };
}
