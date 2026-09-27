import { useEffect, RefObject } from 'react';
import { Stroke } from '../types/stroke';
import { drawStroke } from '../lib/drawStroke';

export function useCanvasRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  strokes: Stroke[]
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
  }, [canvasRef, strokes]);
}
