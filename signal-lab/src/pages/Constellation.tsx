import { useCallback, useRef, useEffect, useMemo } from "react";
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

  const cleanPoints = useMemo(() => generateConstellation(modulationType), [modulationType]);

  // Use useMemo instead of useEffect+ref so that it recalculates synchronously during render.
  // This fixes the bug where switching modulation types leaves the old point cloud on screen.
  const noisyPoints = useMemo(() => addAWGN(cleanPoints, noisePower, 150), [cleanPoints, noisePower]);

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

      // Draw Axis Labels
      ctx.fillStyle = "#ff9100";
      ctx.font = "12px JetBrains Mono";
      ctx.textAlign = "right";
      ctx.fillText("I (In-phase / Cosine)", w - padding, cy - 10);
      
      ctx.fillStyle = "#00e5ff";
      ctx.textAlign = "left";
      ctx.fillText("Q (Quadrature / Sine)", cx + 10, padding);

      if (showDecisionBoundary) {
        const boundaries = generateDecisionBoundaries(modulationType);
        const drawWidth = w - padding * 2;
        const drawHeight = h - padding * 2;

        ctx.strokeStyle = "rgba(255, 145, 0, 0.8)";
        ctx.lineWidth = 2;
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

      // Draw point cloud (noisy points)
      ctx.fillStyle = "rgba(0, 229, 255, 0.4)";
      for (const p of noisyPoints) {
        const sx = padding + ((p.i - viewport.xMin) / (viewport.xMax - viewport.xMin)) * drawWidth;
        const sy = padding + ((viewport.yMax - p.q) / (viewport.yMax - viewport.yMin)) * drawHeight;

        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw ideal points and labels
      for (const p of cleanPoints) {
        const sx = padding + ((p.i - viewport.xMin) / (viewport.xMax - viewport.xMin)) * drawWidth;
        const sy = padding + ((viewport.yMax - p.q) / (viewport.yMax - viewport.yMin)) * drawHeight;

        // Draw center cross
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy);
        ctx.lineTo(sx + 4, sy);
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx, sy + 4);
        ctx.stroke();

        ctx.fillStyle = "#ff9100";
        ctx.font = "14px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText(p.symbol, sx, sy - 15);
      }
    },
    [modulationType, showDecisionBoundary, cleanPoints, noisyPoints]
  );

  const insight = (() => {
    const names: Record<ModulationType, string> = {
      BPSK: "BPSK (二相相移键控)：只用了一维 I 路，Q 路为 0。抗干扰极强，但每符号只能传 1 bit。",
      QPSK: "QPSK (四相相移键控)：I/Q 两路独立调制，形成了 4 个点。在相同抗干扰能力下，传输速率翻倍 (2 bits/symbol)。",
      "16QAM": "16QAM (正交幅度调制)：不仅调相位还调幅度。I/Q 两路各有 4 个电平，组合成 16 个点。速率极高 (4 bits/symbol)，但点间距变小，极易受噪声影响越界。",
    };
    if (noisePower < 0.02)
      return `${names[modulationType]} 此时噪声很小，星座点紧密聚集在理想位置附近。判决边界清晰，几乎不会发生误判。`;
    if (noisePower < 0.1)
      return `${names[modulationType]} 此时噪声增大，点云呈二维高斯分布扩散。只要点没有越过橙色的虚线（判决边界），系统依然能 100% 纠正。`;
    return `${names[modulationType]} 此时在高噪声下，点云严重扩散并大量跨越判决边界。这就是【误码】——接收机把本该属于某个区域的点，误判给了隔壁。`;
  })();

  const amFormula = katex.renderToString(
    "A = \\sqrt{I^2 + Q^2}, \\quad \\phi = \\arctan\\left(\\frac{Q}{I}\\right)",
    { throwOnError: false }
  );

  return (
    <ModuleLayout
      title="星座图与正交调制 (I/Q)"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              1. 为什么要拆分正交信号 (I/Q)？
            </div>
            <p className="text-xs text-lab-text leading-relaxed">
              在单路载波（如单纯的 $A\cos(\omega_c t)$）中，我们只能改变幅度（AM）或频率/相位（FM/PM）。
              但数学上，<strong className="text-lab-cyan">余弦和正弦是正交的</strong>，这意味着把它们叠加后一起发送，在接收端通过相乘积分可以完全无干扰地把它们拆分开来。
              这样相当于在同一个频带上建立了两条独立的高速公路：<strong className="text-[#ff9100]">同相路 (I, In-phase)</strong> 和 <strong className="text-[#00e5ff]">正交路 (Q, Quadrature)</strong>。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              2. 星座点代表了什么？
            </div>
            <div 
              className="text-sm font-mono katex-wrapper mb-3" 
              dangerouslySetInnerHTML={{ __html: constellationFormula }} 
            />
            <p className="text-xs text-lab-text leading-relaxed mt-2">
              星座图就是一个以 I 为横轴、Q 为纵轴的复平面。图上的每一个<strong className="text-lab-cyan">点 (Symbol)</strong>，代表了这一时刻发射信号的具体形态：
            </p>
            <ul className="text-xs text-lab-text list-disc pl-4 mt-2 space-y-1">
              <li>横坐标：代表了发射波形中 <strong className="text-[#ff9100]">$\cos(\omega_c t)$</strong> 分量的幅度 (I)。</li>
              <li>纵坐标：代表了发射波形中 <strong className="text-[#00e5ff]">$-\sin(\omega_c t)$</strong> 分量的幅度 (Q)。</li>
            </ul>
            <div 
              className="text-sm font-mono katex-wrapper my-2" 
              dangerouslySetInnerHTML={{ __html: amFormula }} 
            />
            <ul className="text-xs text-lab-text list-disc pl-4 space-y-1">
              <li>该点到原点的<strong className="text-lab-green">距离</strong>：代表了合成信号的总幅度 $A$。</li>
              <li>该点与原点的<strong className="text-lab-amber">连线角度</strong>：代表了合成信号的总相位 $\phi$。</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              3. 误码是如何产生的？
            </div>
            <p className="text-xs text-lab-text leading-relaxed">
              发送端发出的点是完美的。但在传输过程中叠加了<strong className="text-lab-muted">高斯白噪声 (AWGN)</strong>，导致接收端收到的点发生了随机偏移（变成了图中的“云团”）。
              如果偏移量过大，点越过了<strong className="text-lab-amber">判决边界</strong>，接收机就会把它误认为隔壁的符号，这就是“误码”。
            </p>
          </div>
        </div>
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
