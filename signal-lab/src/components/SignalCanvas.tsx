import { useEffect, useRef, useCallback, useState } from "react";

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
  
  // Track the actual display size
  const [displaySize, setDisplaySize] = useState({ w: width, h: height });

  // 1. Observe the canvas element to get its actual CSS display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isResponsive = className.includes("w-full") || className.includes("h-full") || className.includes("flex-1");

    if (isResponsive) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          // entry.contentRect gives the layout size in CSS pixels
          const newW = entry.contentRect.width;
          const newH = entry.contentRect.height;
          if (newW > 0 && newH > 0) {
            // Only update if there's a significant change to avoid micro-loops
            setDisplaySize(prev => {
              if (Math.abs(prev.w - newW) > 1 || Math.abs(prev.h - newH) > 1) {
                return { w: newW, h: newH };
              }
              return prev;
            });
          }
        }
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }
  }, [className]);

  // 2. Draw whenever the display size, draw function, or dpr changes
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set internal buffer size to match display size * DPR
    canvas.width = displaySize.w * dpr;
    canvas.height = displaySize.h * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displaySize.w, displaySize.h);
    draw(ctx, displaySize.w, displaySize.h);
    ctx.restore();
  }, [draw, displaySize, dpr]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg border border-lab-border ${className}`}
      style={{ 
        background: "#0a0e27",
        width: className.includes("w-full") ? "100%" : `${width}px`,
        height: className.includes("h-full") || className.includes("flex-1") ? "100%" : `${height}px`,
        display: "block"
      }}
    />
  );
}
