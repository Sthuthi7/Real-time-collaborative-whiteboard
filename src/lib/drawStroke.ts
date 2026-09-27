import { Stroke } from '../types/stroke';
import { arrowHead } from './arrowHead';

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (stroke.tool) {
    case 'pencil': {
      if (stroke.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      break;
    }

    case 'eraser': {
      if (stroke.points.length < 2) break;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      break;
    }

    case 'line': {
      ctx.beginPath();
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      // Draw the line shaft
      ctx.beginPath();
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
      ctx.stroke();

      // Draw the arrowhead
      const [tip, leftWing, rightWing] = arrowHead(stroke);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(leftWing.x, leftWing.y);
      ctx.lineTo(rightWing.x, rightWing.y);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'rectangle': {
      ctx.beginPath();
      ctx.rect(stroke.x, stroke.y, stroke.width, stroke.height);
      ctx.stroke();
      break;
    }

    case 'circle': {
      ctx.beginPath();
      ctx.ellipse(stroke.cx, stroke.cy, Math.abs(stroke.rx), Math.abs(stroke.ry), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'text': {
      ctx.font = `${stroke.fontSize}px sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.fillText(stroke.text, stroke.x, stroke.y);
      break;
    }

    default: {
      // Exhaustive check — TypeScript will error if a case is missing
      const _exhaustive: never = stroke;
      void _exhaustive;
    }
  }

  ctx.restore();
}
