import { useCallback, useState } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { generateSine } from "@/engine/signals";
import { fftFromSignal } from "@/engine/fft";
import {
  drawGrid,
  drawAxes,
  drawAxisLabels,
  drawWaveform,
  drawSpectrum,
  defaultRenderParams,
  worldToScreen,
} from "@/renderer/CanvasCore";

export default function DSP() {
  const [freq, setFreq] = useState(10.5); // Default to a non-integer frequency to show leakage
  const [windowType, setWindowType] = useState<"rect" | "hamming">("rect");
  
  const sr = 128;
  const N = 128; // Basic block size
  const paddedN = N;

  const generateData = useCallback(() => {
    const raw = generateSine(freq, sr, N / sr, 1);
    const windowed = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let w = 1;
      if (windowType === "hamming") {
        w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
      }
      windowed[i] = raw.samples[i] * w;
    }

    const padded = new Float64Array(paddedN);
    for (let i = 0; i < N; i++) {
      padded[i] = windowed[i];
    }

    const { real, imag } = fftFromSignal(padded);
    const halfN = paddedN / 2;
    const mags = new Float64Array(halfN);
    const freqs = new Float64Array(halfN);
    const resolution = sr / paddedN;

    for (let i = 0; i < halfN; i++) {
      mags[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / paddedN;
      freqs[i] = i * resolution;
    }
    
    if (mags[0] > 0) mags[0] /= 2;

    return { time: windowed, freqs, mags, resolution };
  }, [freq, windowType, paddedN]);

  const drawTime = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const data = generateData();
      const params = defaultRenderParams();
      // Show 2.5 periods (0 to 2.5 seconds) to make the jump obvious
      params.viewport = { xMin: 0, xMax: 2.5, yMin: -1.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "t", "x(t)", "s", "");

      // Create extended time data
      const extendedTime = new Float64Array(N * 3);
      for (let i = 0; i < N * 3; i++) {
        extendedTime[i] = data.time[i % N];
      }

      drawWaveform(
        ctx,
        extendedTime,
        sr,
        params.viewport,
        w,
        h,
        "#00e5ff",
        "#00e5ff",
        true
      );
      
      const padding = 40;
      
      // Draw vertical lines at t=1, t=2
      for (const t of [1, 2]) {
        const { sx } = worldToScreen(t, 0, params.viewport, w, h, padding);
        ctx.strokeStyle = "#ff0033";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, padding);
        ctx.lineTo(sx, h - padding);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = "#ff0033";
        ctx.font = "10px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText("截断跳变", sx, padding - 10);
      }
      
      ctx.textAlign = "start";
      ctx.fillStyle = "#00e5ff";
      ctx.fillText(`N = ${N} (截断长度, 1秒)`, padding + 4, padding + 14);
      if (windowType === "hamming") {
        ctx.fillStyle = "#ff9100";
        ctx.fillText("加窗：Hamming Window (平滑了边缘跳变)", padding + 4, padding + 28);
      } else {
        ctx.fillStyle = "#ff0033";
        ctx.fillText("加窗：Rectangular (拼接处存在明显跳变)", padding + 4, padding + 28);
      }
    },
    [generateData, windowType]
  );

  const drawFreq = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const data = generateData();
      const params = defaultRenderParams();
      const maxFreq = 25; // Extend to 25Hz to clearly see side lobes
      
      const maxMag = Math.max(...Array.from(data.mags).filter((_, i) => data.freqs[i] <= maxFreq), 0.1);
      const yMax = Math.ceil(maxMag * 10) / 10;
      
      params.viewport = { xMin: 0, xMax: maxFreq, yMin: 0, yMax: yMax };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "f", "|X(k)|", "Hz", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const mainLobeWidth = windowType === "rect" ? 1 : 2;

      // Draw stems manually to color them based on leakage
      for (let i = 0; i < data.freqs.length && data.freqs[i] <= maxFreq; i++) {
        const f = data.freqs[i];
        const mag = data.mags[i];
        
        // Check if this bin is part of the main lobe or if it's leakage
        const isLeakage = Math.abs(f - freq) > mainLobeWidth + 0.5;
        const color = isLeakage ? "#ff0033" : "#00ff88"; // Red for leakage, Green for main lobe
        
        const { sx, sy } = worldToScreen(f, mag, params.viewport, w, h, padding);
        const zeroY = worldToScreen(0, 0, params.viewport, w, h, padding).sy;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, zeroY);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw actual frequency marker
      const actualX = padding + (freq / maxFreq) * drawWidth;
      ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(actualX, padding);
      ctx.lineTo(actualX, padding + drawHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = "#00e5ff";
      ctx.font = "10px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(`真实频率 f=${freq}Hz`, actualX, padding - 15);
      ctx.textAlign = "start";
      
      // Legend
      ctx.fillStyle = "#00ff88";
      ctx.fillText("● 主瓣 (有效能量)", padding + 4, padding + 14);
      ctx.fillStyle = "#ff0033";
      ctx.fillText("● 旁瓣 (泄漏的虚假高频)", padding + 4, padding + 28);
    },
    [generateData, freq, windowType]
  );

  const leakageKatex = katex.renderToString("x(t) \\cdot w(t) \\xrightarrow{\\mathcal{F}} X(f) * W(f)", { throwOnError: false });

  const insight = (() => {
    if (freq % 1 === 0 && windowType === "rect") {
      return "此时真实频率正好是 Δf (1Hz) 的整数倍，频谱完美地落在一个 bin 上，没有任何泄漏！";
    }
    if (windowType === "rect") {
      return "【频谱泄漏】真实频率不落在采样点(bin)上，相当于时域被矩形窗突然截断，频域上矩形窗的 sinc 谱与信号谱卷积，导致能量泄漏到了整个频段！";
    }
    return "【加窗抑制泄漏】Hamming 窗在时域边缘平滑过渡，大大降低了频域旁瓣的泄漏，但主瓣变宽了（峰值变得没那么尖锐）。这是工程中的经典权衡。";
  })();

  return (
    <ModuleLayout
      title="频谱泄漏与加窗"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              频谱泄漏 (Spectrum Leakage)
            </div>
            <div className="mt-2 mb-3 text-sm font-mono katex-wrapper" dangerouslySetInnerHTML={{ __html: leakageKatex }} />
            <p className="text-xs text-lab-text leading-relaxed">
              <strong className="text-lab-cyan">为什么会泄漏？</strong><br/>
              DFT 隐含地假设信号在时域是周期延拓的。如果截断长度 N 不是信号周期的整数倍，首尾拼接处就会出现“跳变”。这种不连续性在频域中表现为高频能量的扩散。
            </p>
            <p className="text-xs text-lab-text leading-relaxed mt-2">
              <strong className="text-[#ff9100]">加窗的权衡：</strong><br/>
              时域相乘 = 频域卷积。矩形窗的主瓣窄但旁瓣高（严重泄漏）；Hamming 窗旁瓣极低（抑制泄漏），但主瓣变宽（降低了频率分辨率）。
            </p>
          </div>
        </div>
      }
      controls={
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs text-lab-muted">真实频率 (Hz)</span>
                <span className="text-xs text-[#00e5ff] font-mono">{freq} Hz</span>
              </div>
              <input
                type="range"
                min="5"
                max="15"
                step="0.1"
                value={freq}
                onChange={(e) => setFreq(Number(e.target.value))}
                className="accent-lab-cyan"
              />
              <div className="flex justify-between mt-1">
                <button 
                  onClick={() => setFreq(10)} 
                  className="text-[10px] text-lab-muted hover:text-[#00e5ff] border border-lab-border px-2 py-0.5 rounded"
                >
                  设为 10Hz (无泄漏)
                </button>
                <button 
                  onClick={() => setFreq(10.5)} 
                  className="text-[10px] text-lab-muted hover:text-[#ff9100] border border-lab-border px-2 py-0.5 rounded"
                >
                  设为 10.5Hz (最严重泄漏)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-lab-muted">截断加窗处理</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setWindowType("rect")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    windowType === "rect"
                      ? "bg-lab-amber/20 text-lab-amber border border-lab-amber/40"
                      : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-amber/30"
                  }`}
                >
                  Rectangular (矩形窗)
                </button>
                <button
                  onClick={() => setWindowType("hamming")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    windowType === "hamming"
                      ? "bg-lab-green/20 text-lab-green border border-lab-green/40"
                      : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-green/30"
                  }`}
                >
                  Hamming Window
                </button>
              </div>
            </div>
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            时域信号 (N={N}点 + 补零到 {paddedN}点)
          </div>
          <SignalCanvas draw={drawTime} height={250} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            DFT 频谱图 (|X(k)|)
          </div>
          <SignalCanvas draw={drawFreq} height={300} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}
