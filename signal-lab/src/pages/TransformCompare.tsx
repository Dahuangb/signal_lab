import { useCallback, useState } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { drawGrid, drawAxes, drawAxisLabels, defaultRenderParams } from "@/renderer/CanvasCore";

export default function TransformCompare() {
  const [sigma, setSigma] = useState(-0.5);
  const [omega, setOmega] = useState(1);
  const Ts = 1; // Normalized sampling period for simplicity

  const drawSPlane = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "σ (实部)", "jω (虚部)", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      // Force 1:1 aspect ratio for Z plane
      const size = Math.min(drawWidth, drawHeight);
      const offsetX = padding + (drawWidth - size) / 2;
      const offsetY = padding + (drawHeight - size) / 2;

      const mapPoint = (xVal: number, yVal: number) => {
        const x = offsetX + ((xVal - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * size;
        const y = offsetY + size - ((yVal - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * size;
        return { x, y };
      };

      // Highlight jw axis (Fourier Transform)
      const top = mapPoint(0, params.viewport.yMax);
      const bottom = mapPoint(0, params.viewport.yMin);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.strokeStyle = "rgba(0, 255, 136, 0.5)"; // FT Green
      ctx.lineWidth = 4;
      ctx.stroke();

      // Highlight left half plane (Stable region)
      ctx.fillStyle = "rgba(136, 146, 176, 0.1)";
      ctx.fillRect(padding, padding, top.x - padding, drawHeight);

      // Draw the point s = sigma + jw
      const pt = mapPoint(sigma, -omega); // Invert Y axis for canvas drawing
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffaa00"; // LT Orange
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#ffaa00";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText(`s = ${sigma.toFixed(2)} + j${omega.toFixed(2)}`, pt.x + 10, pt.y - 10);
      
      ctx.fillStyle = "rgba(0, 255, 136, 0.8)";
      ctx.fillText("傅里叶变换 (FT)", top.x + 10, padding + 20);
    },
    [sigma, omega]
  );

  const drawZPlane = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "Re", "Im", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      // Force 1:1 aspect ratio for Z plane
      const size = Math.min(drawWidth, drawHeight);
      const offsetX = padding + (drawWidth - size) / 2;
      const offsetY = padding + (drawHeight - size) / 2;

      const mapPoint = (xVal: number, yVal: number) => {
        const x = offsetX + ((xVal - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * size;
        const y = offsetY + size - ((yVal - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * size;
        return { x, y };
      };

      // Highlight Unit Circle (DTFT)
      const center = mapPoint(0, 0);
      const rightEdge = mapPoint(1, 0);
      const radiusX = Math.abs(rightEdge.x - center.x);

      // Highlight inside unit circle (Stable region)
      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusX, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(136, 146, 176, 0.1)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusX, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(0, 255, 136, 0.5)"; // DTFT Green
      ctx.lineWidth = 4;
      ctx.stroke();

      // Calculate z = e^{sTs}
      const r = Math.exp(sigma * Ts);
      const theta = omega * Ts;
      const zRe = r * Math.cos(theta);
      const zIm = r * Math.sin(theta);
      const pt = mapPoint(zRe, -zIm); // Invert Y axis for canvas drawing

      // Draw the mapped point z
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "#00e5ff"; // ZT Cyan
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw line from origin to z
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#00e5ff";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText(`z = ${zRe.toFixed(2)} + j${zIm.toFixed(2)}`, pt.x + 10, pt.y - 10);
      ctx.fillText(`|z| = ${r.toFixed(2)}`, pt.x + 10, pt.y + 5);

      ctx.fillStyle = "rgba(0, 255, 136, 0.8)";
      ctx.fillText("离散时间傅里叶 (DTFT)", center.x + radiusX + 10, center.y - 10);
    },
    [sigma, omega]
  );

  const ftFormula = katex.renderToString("F(\\omega) = \\int_{-\\infty}^{\\infty} f(t) e^{-j\\omega t} dt", { throwOnError: false });
  const ltFormula = katex.renderToString("F(s) = \\int_{-\\infty}^{\\infty} f(t) e^{-st} dt", { throwOnError: false });
  const ztFormula = katex.renderToString("X(z) = \\sum_{n=-\\infty}^{\\infty} x[n] z^{-n}", { throwOnError: false });
  const mappingFormula = katex.renderToString("z = e^{sT_s} = e^{\\sigma T_s} \\cdot e^{j\\omega T_s}", { throwOnError: false });

  const insight = (() => {
    if (sigma === 0) {
      return "【傅里叶变换状态】此时 σ=0（S 平面的虚轴），没有指数衰减因子。对应地，在 Z 平面上 |z|=1（单位圆），这就是最经典的稳态频率响应（FT / DTFT）！";
    }
    if (sigma < 0) {
      return `【稳定系统区域】因为 σ=${sigma.toFixed(2)} < 0，信号包含一个指数衰减因子（逐渐归零）。在 S 平面上处于左半平面；经过映射后，|z|=e^{'{'}${sigma.toFixed(2)}{'}'} < 1，它完美地落在了 Z 平面的单位圆内部！`;
    }
    return `【发散系统区域】警告：σ=${sigma.toFixed(2)} > 0！信号包含指数放大因子，随时间发散爆炸。在 S 平面它位于右半平面；在 Z 平面 |z| > 1，跑到了单位圆外部。这种系统是不稳定的。`;
  })();

  return (
    <ModuleLayout
      title="三大变换的统一 (FT / LT / ZT)"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs font-mono uppercase tracking-wider text-[#00ff88] mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ff88]"></span>
              傅里叶变换 (FT) — "只看稳态"
            </div>
            <div className="text-sm font-mono katex-wrapper mb-2" dangerouslySetInnerHTML={{ __html: ftFormula }} />
            <p className="text-xs text-lab-text leading-relaxed">
              核心变量：<strong className="text-[#00ff88]">jω</strong>。它假设信号永远存在，且只用纯粹的等幅正弦波去拟合信号。只能分析稳定的、能量有限的系统。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs font-mono uppercase tracking-wider text-[#ffaa00] mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffaa00]"></span>
              拉普拉斯变换 (LT) — "连续世界的全貌"
            </div>
            <div className="text-sm font-mono katex-wrapper mb-2" dangerouslySetInnerHTML={{ __html: ltFormula }} />
            <p className="text-xs text-lab-text leading-relaxed">
              核心变量：<strong className="text-[#ffaa00]">s = σ + jω</strong>。在正弦波的基础上强行乘上了一个指数衰减因子 <span className="katex-wrapper" dangerouslySetInnerHTML={{ __html: katex.renderToString("e^{-\\sigma t}", { throwOnError: false }) }} />，让原本发散的信号也能被分析（瞬态分析）。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs font-mono uppercase tracking-wider text-[#00e5ff] mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00e5ff]"></span>
              Z 变换 (ZT) — "离散世界的全貌"
            </div>
            <div className="text-sm font-mono katex-wrapper mb-2" dangerouslySetInnerHTML={{ __html: ztFormula }} />
            <p className="text-xs text-lab-text leading-relaxed">
              核心变量：<strong className="text-[#00e5ff]">z = r e^{'{'}jω{'}'}</strong>。LT 的离散化版本。处理计算机中的离散序列，分析数字滤波器的稳定性和瞬态响应。
            </p>
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-lab-surface/50 border border-lab-border rounded-lg mb-2">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase">神奇的映射公式</div>
            <div className="text-sm font-mono katex-wrapper" dangerouslySetInnerHTML={{ __html: mappingFormula }} />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-xs text-lab-muted">实部 σ (衰减因子)</span>
              <span className="text-xs font-mono text-[#ffaa00]">{sigma.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="1"
              step="0.1"
              value={sigma}
              onChange={(e) => setSigma(Number(e.target.value))}
              className="accent-[#ffaa00]"
            />
            <p className="text-[10px] text-lab-muted/70 mt-1">
              决定信号是衰减(稳定)还是发散(不稳定)。它直接映射为 Z 平面的半径 <span className="katex-wrapper" dangerouslySetInnerHTML={{ __html: katex.renderToString("r = e^{\\sigma T_s}", { throwOnError: false }) }} />。
            </p>
            <div className="flex justify-between mt-1">
              <button 
                onClick={() => setSigma(0)} 
                className="text-[10px] text-lab-muted hover:text-[#00ff88] border border-lab-border px-2 py-0.5 rounded"
              >
                归零 (退化为FT)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-4">
            <div className="flex justify-between">
              <span className="text-xs text-lab-muted">虚部 ω (频率)</span>
              <span className="text-xs font-mono text-[#00e5ff]">{omega.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-3.14"
              max="3.14"
              step="0.1"
              value={omega}
              onChange={(e) => setOmega(Number(e.target.value))}
              className="accent-[#00e5ff]"
            />
            <p className="text-[10px] text-lab-muted/70 mt-1">
              决定信号的振荡频率。在 Z 平面上，它控制的是点旋转的角度 <span className="katex-wrapper" dangerouslySetInnerHTML={{ __html: katex.renderToString("\\theta = \\omega T_s", { throwOnError: false }) }} />。
            </p>
          </div>
        </div>
      }
      insight={insight}
    >
      <div className="flex-1 flex gap-4 h-full">
        <div className="flex-1 flex flex-col">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider text-center">
            S 平面 (连续世界 Laplace)
          </div>
          <SignalCanvas draw={drawSPlane} height={400} className="w-full h-full min-h-[400px]" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider text-center">
            Z 平面 (离散世界 Z-Transform)
          </div>
          <SignalCanvas draw={drawZPlane} height={400} className="w-full h-full min-h-[400px]" />
        </div>
      </div>
    </ModuleLayout>
  );
}