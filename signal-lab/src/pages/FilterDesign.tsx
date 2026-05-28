import { useCallback, useState, useEffect } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { drawGrid, drawAxes, drawAxisLabels, defaultRenderParams } from "@/renderer/CanvasCore";

export default function FilterDesign() {
  const [filterType, setFilterType] = useState<"FIR" | "IIR">("FIR");
  const [order, setOrder] = useState(5); // FIR order (M)
  const [alpha, setAlpha] = useState(0.8); // IIR coefficient (alpha)
  
  const N = 200; // Number of samples

  // Generate noisy signal once
  const [rawSignal, setRawSignal] = useState<Float64Array>(new Float64Array(N));
  useEffect(() => {
    const sig = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      // Low freq signal + high freq noise
      const t = i / N;
      const clean = Math.sin(2 * Math.PI * 2 * t);
      const noise = 0.5 * (Math.random() * 2 - 1) + 0.3 * Math.sin(2 * Math.PI * 40 * t);
      sig[i] = clean + noise;
    }
    setRawSignal(sig);
  }, []);

  const getFilteredSignal = useCallback(() => {
    if (rawSignal.length === 0) return new Float64Array();
    
    const filtered = new Float64Array(N);
    
    if (filterType === "FIR") {
      // Moving Average (FIR)
      const M = order;
      for (let n = 0; n < N; n++) {
        let sum = 0;
        let count = 0;
        for (let k = 0; k < M; k++) {
          if (n - k >= 0) {
            sum += rawSignal[n - k];
            count++;
          }
        }
        filtered[n] = sum / count; // normalize to preserve DC gain
      }
    } else {
      // First order IIR (Exponential Smoothing): y[n] = (1-a)*x[n] + a*y[n-1]
      filtered[0] = (1 - alpha) * rawSignal[0];
      for (let n = 1; n < N; n++) {
        filtered[n] = (1 - alpha) * rawSignal[n] + alpha * filtered[n - 1];
      }
    }
    
    return filtered;
  }, [rawSignal, filterType, order, alpha]);

  const drawTimeDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const filtered = getFilteredSignal();
      if (filtered.length === 0) return;

      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: N, yMin: -2, yMax: 2 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "样本 n", "幅度", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const mapPoint = (i: number, val: number) => {
        const x = padding + (i / N) * drawWidth;
        const y = padding + drawHeight - ((val - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;
        return { x, y };
      };

      // Draw Raw
      ctx.strokeStyle = "rgba(136, 146, 176, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const { x, y } = mapPoint(i, rawSignal[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Filtered
      ctx.strokeStyle = filterType === "FIR" ? "#00e5ff" : "#ff9100";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const { x, y } = mapPoint(i, filtered[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Legend
      ctx.fillStyle = "rgba(136, 146, 176, 0.8)";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText("带噪原信号 x[n]", padding + 10, padding + 20);
      
      ctx.fillStyle = filterType === "FIR" ? "#00e5ff" : "#ff9100";
      ctx.fillText(`滤波后信号 y[n]`, padding + 10, padding + 40);
    },
    [rawSignal, getFilteredSignal, filterType]
  );

  const drawFreqResponse = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: Math.PI, yMin: 0, yMax: 1.1 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "频率 ω", "|H(e^jω)|", "rad", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      ctx.strokeStyle = filterType === "FIR" ? "#00e5ff" : "#ff9100";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const numPts = 200;
      for (let i = 0; i <= numPts; i++) {
        const omega = (i / numPts) * Math.PI;
        let mag = 0;

        if (filterType === "FIR") {
          // Moving average magnitude response
          const M = order;
          if (omega === 0) {
            mag = 1;
          } else {
            mag = Math.abs(Math.sin(M * omega / 2) / (M * Math.sin(omega / 2)));
          }
        } else {
          // IIR magnitude response
          // H(z) = (1-a) / (1 - a*z^-1)
          const num = 1 - alpha;
          const denRe = 1 - alpha * Math.cos(omega);
          const denIm = alpha * Math.sin(omega);
          const denMag = Math.sqrt(denRe * denRe + denIm * denIm);
          mag = num / denMag;
        }

        const x = padding + (omega / Math.PI) * drawWidth;
        const y = padding + drawHeight - ((mag - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
    [filterType, order, alpha]
  );

  const firFormula = katex.renderToString("y[n] = \\frac{1}{M}\\sum_{k=0}^{M-1} x[n-k]", { throwOnError: false });
  const iirFormula = katex.renderToString("y[n] = (1-\\alpha)x[n] + \\alpha y[n-1]", { throwOnError: false });

  const insight = (() => {
    if (filterType === "FIR") {
      return `【FIR 滤波器】(M=${order})。FIR 只有零点没有极点，绝对稳定且能实现线性相位。但要达到很陡的截止频率，需要非常大的阶数（M变大），导致计算量大且时域延迟明显。`;
    } else {
      return `【IIR 滤波器】(α=${alpha.toFixed(2)})。IIR 包含反馈（极点），可以用极低的阶数（当前为 1 阶）实现极强的低通滤波效果。但 α 太大时系统可能接近不稳定，且相位是非线性的（会使波形变形）。`;
    }
  })();

  return (
    <ModuleLayout
      title="数字滤波器设计"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              FIR (有限长冲激响应)
            </div>
            <div className="text-sm font-mono katex-wrapper mb-3" dangerouslySetInnerHTML={{ __html: firFormula }} />
            <p className="text-xs text-lab-text leading-relaxed mt-2">
              <strong className="text-lab-cyan">滑动平均：</strong> 
              当前输出仅依赖于当前和过去的<strong className="text-lab-cyan">输入</strong>。绝对稳定，线性相位。
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              IIR (无限长冲激响应)
            </div>
            <div className="text-sm font-mono katex-wrapper mb-3" dangerouslySetInnerHTML={{ __html: iirFormula }} />
            <p className="text-xs text-lab-text leading-relaxed mt-2">
              <strong className="text-[#ff9100]">指数平滑：</strong> 
              当前输出依赖于当前输入和<strong className="text-[#ff9100]">过去的输出(反馈)</strong>。阶数低，效率高，但有不稳定风险。
            </p>
          </div>
        </div>
      }
      controls={
        <>
          <div className="flex gap-2 border-b border-lab-border pb-4 mb-2">
            <button
              onClick={() => setFilterType("FIR")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filterType === "FIR"
                  ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                  : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
              }`}
            >
              FIR 滤波器
            </button>
            <button
              onClick={() => setFilterType("IIR")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filterType === "IIR"
                  ? "bg-[#ff9100]/20 text-[#ff9100] border border-[#ff9100]/40"
                  : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#ff9100]/30"
              }`}
            >
              IIR 滤波器
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {filterType === "FIR" ? (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-xs text-lab-muted">阶数 (窗口大小 M)</span>
                  <span className="text-xs text-[#00e5ff] font-mono">{order}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="accent-lab-cyan"
                />
                <p className="text-[10px] text-lab-muted/70 mt-1">
                  M 越大，低通截止频率越低（滤除高频越干净），但时域延迟越明显。
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-xs text-lab-muted">反馈系数 (α)</span>
                  <span className="text-xs text-[#ff9100] font-mono">{alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.99"
                  step="0.01"
                  value={alpha}
                  onChange={(e) => setAlpha(Number(e.target.value))}
                  className="accent-[#ff9100]"
                />
                <p className="text-[10px] text-lab-muted/70 mt-1">
                  α 越接近 1，对过去的记忆越强，滤波越平滑，但响应也会变得迟钝。
                </p>
              </div>
            )}
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            幅频响应 |H(e^jω)|
          </div>
          <SignalCanvas draw={drawFreqResponse} height={200} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            时域滤波效果
          </div>
          <SignalCanvas draw={drawTimeDomain} height={250} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}