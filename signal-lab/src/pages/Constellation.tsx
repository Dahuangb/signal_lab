import { useCallback, useRef, useEffect } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import { useParamsStore, ModulationType } from "@/store/useParamsStore";
import {
  generateConstellation,
  addAWGN,
  generateDecisionBoundaries,
} from "@/engine/constellation";
import { drawGrid, drawAxes } from "@/renderer/CanvasCore";

const constellationFormula = katex.renderToString(
  "s(t) = I \\cdot \\cos(\\omega_c t) - Q \\cdot \\sin(\\omega_c t)",
  { throwOnError: false }
);

export default function Constellation() {
  const { constellation, setConstellation } = useParamsStore();
  const { modulationType, noisePower, showDecisionBoundary } = constellation;
  const pointsRef = useRef<ReturnType<typeof addAWGN>>([]);

  useEffect(() => {
    const clean = generateConstellation(modulationType);
    pointsRef.current = addAWGN(clean, noisePower);
  }, [modulationType, noisePower]);

  const drawConstellation = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const padding = 40;
      const range = modulationType === "16QAM" ? 5 : 2.5;
      const viewport = { xMin: -range, xMax: range, yMin: -range, yMax: range };

      drawGrid(ctx, viewport, w, h, {
        viewport,
        gridColor: "#1e2a4a",
        gridAlpha: 0.4,
        axisColor: "#334466",
        waveColor: "#00e5ff",
        glowColor: "#00e5ff",
        glowEnabled: true,
      });

      ctx.strokeStyle = "#445566";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const cx = w / 2;
      const cy = h / 2;
      ctx.moveTo(padding, cy);
      ctx.lineTo(w - padding, cy);
      ctx.moveTo(cx, padding);
      ctx.lineTo(cx, h - padding);
      ctx.stroke();

      if (showDecisionBoundary) {
        const boundaries = generateDecisionBoundaries(modulationType);
        const drawWidth = w - padding * 2;
        const drawHeight = h - padding * 2;

        ctx.strokeStyle = "rgba(255, 145, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);

        for (const bx of boundaries.vertical) {
          const sx = padding + ((bx - viewport.xMin) / (viewport.xMax - viewport.xMin)) * drawWidth;
          ctx.beginPath();
          ctx.moveTo(sx, padding);
          ctx.lineTo(sx, padding + drawHeight);
          ctx.stroke();
        }

        for (const by of boundaries.horizontal) {
          const sy = padding + ((viewport.yMax - by) / (viewport.yMax - viewport.yMin)) * drawHeight;
          ctx.beginPath();
          ctx.moveTo(padding, sy);
          ctx.lineTo(padding + drawWidth, sy);
          ctx.stroke();
        }

        ctx.setLineDash([]);
      }

      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      for (const p of pointsRef.current) {
        const sx = padding + ((p.i - viewport.xMin) / (viewport.xMax - viewport.xMin)) * drawWidth;
        const sy = padding + ((viewport.yMax - p.q) / (viewport.yMax - viewport.yMin)) * drawHeight;

        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#00e5ff";
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#e0e0e0";
        ctx.font = "10px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText(p.symbol, sx, sy - 12);
      }
    },
    [modulationType, showDecisionBoundary]
  );

  const insight = (() => {
    const names: Record<ModulationType, string> = {
      BPSK: "BPSK",
      QPSK: "QPSK",
      "16QAM": "16QAM",
    };
    if (noisePower < 0.02)
      return `${names[modulationType]}：噪声很小，星座点紧密聚集在理想位置附近。判决边界清晰，几乎不会误判。`;
    if (noisePower < 0.1)
      return `${names[modulationType]}：噪声增大，星座点开始扩散。注意 I/Q 两路是独立的——噪声同时影响两路，点云呈圆形扩散。`;
    return `${names[modulationType]}：高噪声下，点云严重扩散并跨越判决边界。这就是误码的来源——接收端无法判断原始发送的是哪个符号。`;
  })();

  return (
    <ModuleLayout
      title="星座图"
      formula={
        <div dangerouslySetInnerHTML={{ __html: constellationFormula }} />
      }
      controls={
        <>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-lab-muted">调制方式</span>
            <div className="flex gap-2">
              {(["BPSK", "QPSK", "16QAM"] as ModulationType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setConstellation({ modulationType: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    modulationType === t
                      ? "bg-lab-green/20 text-lab-green border border-lab-green/40"
                      : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-green/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ParamSlider
            label="噪声功率"
            value={noisePower}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => setConstellation({ noisePower: v })}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDecisionBoundary}
              onChange={(e) =>
                setConstellation({ showDecisionBoundary: e.target.checked })
              }
              className="w-4 h-4 rounded accent-lab-amber"
            />
            <span className="text-xs text-lab-muted">显示判决边界</span>
          </label>
        </>
      }
      insight={insight}
    >
      <SignalCanvas draw={drawConstellation} height={500} className="w-full h-full" />
    </ModuleLayout>
  );
}
