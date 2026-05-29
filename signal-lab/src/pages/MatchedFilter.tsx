import InlineMath from "@/components/InlineMath";
import { useCallback, useState, useEffect } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { drawGrid, drawAxes, drawAxisLabels, defaultRenderParams } from "@/renderer/CanvasCore";
import { generateAWGN } from "@/engine/noise";

const BARKER_13 = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];

export default function MatchedFilter() {
  const [snr, setSnr] = useState(5); // dB
  const [filterType, setFilterType] = useState<"matched" | "rect">("matched");

  const sr = 1;
  const N = 100;
  const signalStart = 40;

  const [noise, setNoise] = useState<Float64Array>(new Float64Array(N));

  useEffect(() => {
    const noisePower = 1 / Math.pow(10, snr / 10);
    setNoise(generateAWGN(N, noisePower));
  }, [snr]);

  const getReceivedSignal = useCallback(() => {
    const rx = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let s = 0;
      if (i >= signalStart && i < signalStart + BARKER_13.length) {
        s = BARKER_13[i - signalStart];
      }
      rx[i] = s + noise[i];
    }
    return rx;
  }, [noise]);

  const getFilterResponse = useCallback(() => {
    const h = new Float64Array(BARKER_13.length);
    for (let i = 0; i < BARKER_13.length; i++) {
      if (filterType === "matched") {
        // h(t) = s(T-t)
        h[i] = BARKER_13[BARKER_13.length - 1 - i];
      } else {
        h[i] = 1; // Simple moving average (Rect)
      }
    }
    return h;
  }, [filterType]);

  const getOutput = useCallback(() => {
    const rx = getReceivedSignal();
    const h = getFilterResponse();
    const y = new Float64Array(N);

    // Linear Convolution
    for (let n = 0; n < N; n++) {
      let sum = 0;
      for (let k = 0; k < h.length; k++) {
        if (n - k >= 0) {
          sum += rx[n - k] * h[k];
        }
      }
      y[n] = sum;
    }
    return y;
  }, [getReceivedSignal, getFilterResponse]);

  const drawReceived = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const rx = getReceivedSignal();
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: N, yMin: -3, yMax: 3 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "时间 t", "r(t)", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const mapPoint = (i: number, val: number) => {
        const x = padding + (i / N) * drawWidth;
        const y = padding + drawHeight - ((val - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;
        return { x, y };
      };

      // Draw pure signal in background
      ctx.strokeStyle = "rgba(0, 229, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        let s = 0;
        if (i >= signalStart && i < signalStart + BARKER_13.length) {
          s = BARKER_13[i - signalStart];
        }
        const { x, y } = mapPoint(i, s);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw received (noisy) signal
      ctx.strokeStyle = "rgba(136, 146, 176, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const { x, y } = mapPoint(i, rx[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(136, 146, 176, 0.8)";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText("带噪接收信号 r(t)", padding + 10, padding + 20);
      ctx.fillStyle = "rgba(0, 229, 255, 0.5)";
      ctx.fillText("理想无噪信号 s(t)", padding + 10, padding + 40);
    },
    [getReceivedSignal]
  );

  const drawOutput = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const y = getOutput();
      const params = defaultRenderParams();
      // Matched filter output for Barker 13 peaks at 13
      params.viewport = { xMin: 0, xMax: N, yMin: -5, yMax: 15 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "时间 t", "y(t)", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const mapPoint = (i: number, val: number) => {
        const x = padding + (i / N) * drawWidth;
        const y = padding + drawHeight - ((val - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;
        return { x, y };
      };

      ctx.strokeStyle = filterType === "matched" ? "#ff9100" : "#00ff88";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let maxVal = -Infinity;
      let maxIdx = -1;
      
      for (let i = 0; i < N; i++) {
        const { x, y: py } = mapPoint(i, y[i]);
        if (i === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
        
        if (y[i] > maxVal) {
          maxVal = y[i];
          maxIdx = i;
        }
      }
      ctx.stroke();

      // Highlight peak
      if (maxVal > 5) {
        const { x, y: py } = mapPoint(maxIdx, maxVal);
        ctx.beginPath();
        ctx.arc(x, py, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 145, 0, 0.3)";
        ctx.fill();
        ctx.strokeStyle = filterType === "matched" ? "#ff9100" : "#00ff88";
        ctx.stroke();

        ctx.fillStyle = filterType === "matched" ? "#ff9100" : "#00ff88";
        ctx.font = "12px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText(`Peak: ${maxVal.toFixed(1)}`, x, py - 12);
        ctx.textAlign = "start";
      }

      ctx.fillStyle = filterType === "matched" ? "#ff9100" : "#00ff88";
      ctx.fillText(filterType === "matched" ? "匹配滤波器输出 (最大化瞬时信噪比)" : "普通矩形窗输出", padding + 10, padding + 20);
    },
    [getOutput, filterType]
  );

  const formula = katex.renderToString("h(t) = s(T-t)", { throwOnError: false });
  const snrFormula = katex.renderToString("SNR_{max} = \\frac{2E}{N_0}", { throwOnError: false });

  const insight = (() => {
    if (snr < 0 && filterType === "matched") {
      return "【雷达/通信的神奇之处】即使信噪比小于 0dB（信号已经完全被噪声淹没，上图肉眼根本看不出波形），匹配滤波器依然能在信号结束的瞬间积聚所有能量，产生一个巨大的尖峰！";
    }
    if (filterType === "rect") {
      return "【普通滤波器】如果随便用一个矩形滤波器，它不仅无法产生尖锐的自相关峰值，还会让噪声随意通过，你很难设定一个阈值来准确判断信号在哪里。";
    }
    return "【匹配滤波器原理】将滤波器设计为输入信号的时间反转。当信号进入滤波器时，就像钥匙插入锁孔，在完全重合的瞬间（自相关函数的峰值），输出达到最大，完美实现理论上的最大信噪比。";
  })();

  return (
    <ModuleLayout
      title="匹配滤波器 (Matched Filter)"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              冲激响应设计
            </div>
            <div className="text-sm font-mono katex-wrapper mb-3" dangerouslySetInnerHTML={{ __html: formula }} />
            <p className="text-xs text-lab-text leading-relaxed mt-2">
              要让输出端的<strong className="text-lab-cyan">瞬时信噪比最大</strong>，滤波器的冲激响应 <InlineMath math="h(t)" /> 必须是输入信号 <InlineMath math="s(t)" /> 的<strong className="text-[#ff9100]">时间反转 (Time-reversed)</strong>，如果是复数还要取共轭。
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              最大输出信噪比
            </div>
            <div className="text-sm font-mono katex-wrapper mb-3" dangerouslySetInnerHTML={{ __html: snrFormula }} />
            <p className="text-xs text-lab-text leading-relaxed mt-2">
              神奇的物理结论：匹配滤波器的最大输出信噪比<strong className="text-[#00ff88]">只与信号的总能量 E 有关</strong>，而与信号的具体形状无关！这就是为什么雷达喜欢用又长又复杂的 Barker 码（能量大，且自相关峰值尖锐）。
            </p>
          </div>
        </div>
      }
      controls={
        <>
          <div className="flex gap-2 border-b border-lab-border pb-4 mb-2">
            <button
              onClick={() => setFilterType("matched")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filterType === "matched"
                  ? "bg-[#ff9100]/20 text-[#ff9100] border border-[#ff9100]/40"
                  : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#ff9100]/30"
              }`}
            >
              匹配滤波器
            </button>
            <button
              onClick={() => setFilterType("rect")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filterType === "rect"
                  ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                  : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#00ff88]/30"
              }`}
            >
              普通矩形滤波器
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs text-lab-muted">信噪比 (SNR)</span>
                <span className={`text-xs font-mono ${snr < 0 ? 'text-[#ff3366]' : 'text-lab-cyan'}`}>
                  {snr} dB
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="20"
                step="1"
                value={snr}
                onChange={(e) => setSnr(Number(e.target.value))}
                className={`accent-${snr < 0 ? '[#ff3366]' : 'lab-cyan'}`}
              />
              <p className="text-[10px] text-lab-muted/70 mt-1">
                尝试将 SNR 调到负数，看看在肉眼无法分辨信号的情况下，匹配滤波器是否还能找出目标！
              </p>
            </div>
            
            <button
              onClick={() => setNoise(generateAWGN(N, 1 / Math.pow(10, snr / 10)))}
              className="w-full py-2 rounded-lg text-xs font-mono bg-lab-cyan/10 text-lab-cyan border border-lab-cyan/30 hover:bg-lab-cyan/20 transition-all mt-2"
            >
              刷新噪声
            </button>
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1">
          <SignalCanvas draw={drawReceived} height={200} className="w-full" />
        </div>
        <div className="flex-1">
          <SignalCanvas draw={drawOutput} height={200} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}