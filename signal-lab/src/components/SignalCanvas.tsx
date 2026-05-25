import { useEffect, useRef, useCallback } from "react";

interface SignalCanvasProps {
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  width?: number;
  height?: number;
  className?: string;
}

export default function SignalCanvas({
  draw,
  width = 800,
  height = 400,
  className = "",
}: SignalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height);
  }, [draw, width, height, dpr]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg border border-lab-border ${className}`}
      style={{ background: "#0a0e27" }}
    />
  );
}
