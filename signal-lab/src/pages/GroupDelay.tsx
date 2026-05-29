import InlineMath from "@/components/InlineMath";
import { useCallback, useState } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import {
  drawGrid,
  drawAxes,
  drawAxisLabels,
  defaultRenderParams,
  worldToScreen,
} from "@/renderer/CanvasCore";
import { fft, ifft } from "@/engine/fft";

export default function GroupDelay() {
  const [filterType, setFilterType] = useState<"fir" | "bessel" | "butterworth" | "chebyshev">("butterworth");

  const N = 1024;
  const fs = 1000; // 1000 Hz
  const dt = 1 / fs;

  // Signal parameters
  const f_low = 10;
  const f_high = 50;
  const t0 = 0.2;
  const sigma = 0.05;

  // Precomputed 4th-order filter coefficients (fc = 80 Hz, fs = 1000 Hz)
  const filters = {
    fir: {
      // 31-tap Windowed Sinc Lowpass
      b: [0.0016, 0.0014, 0.0007, -0.0011, -0.0046, -0.0094, -0.0138, -0.0150, -0.0098, 0.0045, 0.0287, 0.0608, 0.0963, 0.1286, 0.1513, 0.1594, 0.1513, 0.1286, 0.0963, 0.0608, 0.0287, 0.0045, -0.0098, -0.0150, -0.0138, -0.0094, -0.0046, -0.0011, 0.0007, 0.0014, 0.0016],
      a: [1]
    },
    bessel: {
      b: [0.00202, 0.00809, 0.01213, 0.00809, 0.00202],
      a: [1.0, -2.54796, 2.53337, -1.15658, 0.20351]
    },
    butterworth: {
      b: [0.00223, 0.00894, 0.01341, 0.00894, 0.00223],
      a: [1.0, -2.69261, 2.86740, -1.40348, 0.26445]
    },
    chebyshev: {
      b: [0.000788, 0.003153, 0.004730, 0.003153, 0.000788],
      a: [1.0, -3.29284, 4.29423, -2.60738, 0.62015]
    }
  };

  const computeFreqResponse = (b: number[], a: number[], f: number) => {
    const w = 2 * Math.PI * (f / fs);
    let reB = 0, imB = 0;
    for (let k = 0; k < b.length; k++) {
      reB += b[k] * Math.cos(-k * w);
      imB += b[k] * Math.sin(-k * w);
    }
    let reA = 0, imA = 0;
    for (let k = 0; k < a.length; k++) {
      reA += a[k] * Math.cos(-k * w);
      imA += a[k] * Math.sin(-k * w);
    }
    // Complex division: B / A
    const den = reA * reA + imA * imA;
    return {
      re: (reB * reA + imB * imA) / den,
      im: (imB * reA - reB * imA) / den
    };
  };

  const getPhase = (b: number[], a: number[], f: number) => {
    const H = computeFreqResponse(b, a, f);
    return Math.atan2(H.im, H.re);
  };

  const generateSignals = useCallback(() => {
    const time = new Float64Array(N);
    const x = new Float64Array(N);
    
    // Generate input signal: Gaussian envelope * (low_freq + high_freq)
    for (let i = 0; i < N; i++) {
      const t = i * dt;
      time[i] = t;
      const envelope = Math.exp(-Math.pow((t - t0) / sigma, 2));
      x[i] = envelope * (Math.sin(2 * Math.PI * f_low * t) + Math.sin(2 * Math.PI * f_high * t));
    }

    // FFT of input
    const real = new Float64Array(x);
    const imag = new Float64Array(N);
    fft(real, imag);

    const { b, a } = filters[filterType];
    const gdArr = new Float64Array(N / 2);
    
    // To make the delay visually obvious (0.2s - 0.4s), we simulate cascading the filter K times.
    // 4th order Butterworth at 80Hz has ~5ms delay. We multiply phase by 40 to get ~200ms delay.
    const phaseScale = 40; 

    // Apply Filter Phase & Magnitude in Frequency Domain
    for (let i = 0; i < N; i++) {
      let f = i < N / 2 ? i * (fs / N) : (i - N) * (fs / N);
      
      const H = computeFreqResponse(b, a, Math.abs(f));
      // For negative frequencies, phase is inverted
      let phase = Math.atan2(H.im, H.re);
      if (f < 0) phase = -phase;
      
      const mag = Math.sqrt(H.re * H.re + H.im * H.im);

      // Scale phase for visual exaggeration
      phase *= phaseScale;

      // Compute Group Delay numerically for the plot
      if (i < N / 2) {
        const df = 0.1;
        const p1 = getPhase(b, a, f - df);
        const p2 = getPhase(b, a, f + df);
        let dPhase = p2 - p1;
        if (dPhase > Math.PI) dPhase -= 2 * Math.PI; 
        if (dPhase < -Math.PI) dPhase += 2 * Math.PI;
        gdArr[i] = -(dPhase * phaseScale) / (2 * Math.PI * (2 * df));
      }

      // Apply H(f) to X(f)
      const r = real[i];
      const im = imag[i];
      
      // X * H = (r + j*im) * mag * e^{j*phase}
      const cosP = mag * Math.cos(phase);
      const sinP = mag * Math.sin(phase);

      real[i] = r * cosP - im * sinP;
      imag[i] = r * sinP + im * cosP;
    }

    // IFFT
    ifft(real, imag);

    const y = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      y[i] = real[i];
    }

    return { time, x, y, gdArr };
  }, [filterType, dt]);

  const drawTimeDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const { time, x, y } = generateSignals();
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 1, yMin: -2.5, yMax: 2.5 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "t (s)", "Amplitude", "", "");

      const padding = 40;

      // Draw input x(t)
      ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const { sx, sy } = worldToScreen(time[i], x[i], params.viewport, w, h, padding);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Draw output y(t)
      ctx.strokeStyle = filterType === "fir" ? "#00ff88" : "#ff3366";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const { sx, sy } = worldToScreen(time[i], y[i], params.viewport, w, h, padding);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Labels
      ctx.fillStyle = "rgba(0, 229, 255, 0.8)";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText("输入信号 x(t) (高低频混合包络)", padding + 10, padding + 10);
      
      ctx.fillStyle = filterType === "fir" ? "#00ff88" : "#ff3366";
      let filterName = "";
      if (filterType === "fir") filterName = "FIR Sinc 低通 (完美平移)";
      else if (filterType === "bessel") filterName = "IIR Bessel (近似线性, 轻微变形)";
      else if (filterType === "butterworth") filterName = "IIR Butterworth (非线性, 明显色散)";
      else if (filterType === "chebyshev") filterName = "IIR Chebyshev (严重非线性, 包络撕裂)";

      ctx.fillText(`输出信号 y(t) (${filterName})`, padding + 10, padding + 28);
    },
    [generateSignals, filterType]
  );

  const drawGroupDelay = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const { gdArr } = generateSignals();
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 100, yMin: 0, yMax: 1 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "f (Hz)", "τ_g(f) (s)", "", "");

      const padding = 40;

      // Highlight frequency bands
      const lowSx = worldToScreen(f_low, 0, params.viewport, w, h, padding).sx;
      const highSx = worldToScreen(f_high, 0, params.viewport, w, h, padding).sx;
      
      ctx.fillStyle = "rgba(0, 229, 255, 0.1)";
      ctx.fillRect(lowSx - 10, padding, 20, h - 2 * padding);
      ctx.fillStyle = "rgba(0, 229, 255, 0.5)";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText("低频成分", lowSx - 20, padding + 10);

      ctx.fillStyle = "rgba(255, 145, 0, 0.1)";
      ctx.fillRect(highSx - 10, padding, 20, h - 2 * padding);
      ctx.fillStyle = "rgba(255, 145, 0, 0.5)";
      ctx.fillText("高频成分", highSx - 20, padding + 10);

      // Draw Group Delay Curve
      ctx.strokeStyle = filterType === "fir" ? "#00ff88" : "#ff3366";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < gdArr.length; i++) {
        const f = i * (fs / N);
        if (f > 100) break;
        const { sx, sy } = worldToScreen(f, gdArr[i], params.viewport, w, h, padding);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    },
    [generateSignals, filterType]
  );

  const phaseKatex = katex.renderToString("\\phi(\\omega) = -\\omega t_d", { throwOnError: false });
  const gdKatex = katex.renderToString("\\tau_g(\\omega) = -\\frac{d\\phi(\\omega)}{d\\omega}", { throwOnError: false });

  return (
    <ModuleLayout
      title="相位延迟与群延迟 (Phase & Group Delay)"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              线性相位 vs 非线性相位
            </div>
            <p className="text-xs text-lab-text leading-relaxed mb-2">
              信号的“形状（包络）”是由多个不同频率的正弦波叠加而成的。为了在通过滤波器后<strong className="text-[#00ff88]">保持形状不失真</strong>，所有频率成分必须被延迟<strong className="text-lab-cyan">相同的时间</strong>。
            </p>
            <div className="text-sm font-mono katex-wrapper my-2" dangerouslySetInnerHTML={{ __html: phaseKatex }} />
            <p className="text-xs text-lab-text leading-relaxed">
              这就要求相位 <InlineMath math="\\phi(\\omega)" /> 必须是频率 <InlineMath math="\\omega" /> 的线性函数（线性相位 FIR 滤波器的特长）。
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              群延迟 (Group Delay)
            </div>
            <div className="text-sm font-mono katex-wrapper my-2" dangerouslySetInnerHTML={{ __html: gdKatex }} />
            <p className="text-xs text-lab-text leading-relaxed mt-2">
              群延迟代表了信号<strong className="text-[#ff9100]">能量包络</strong>的延迟时间。
            </p>
            <ul className="text-xs text-lab-text list-disc pl-4 mt-2 space-y-1">
              <li><strong className="text-[#00ff88]">FIR 线性相位</strong>：群延迟是常数，所有频率同步到达，包络完美还原。</li>
              <li><strong className="text-[#ff3366]">IIR 非线性相位</strong>：群延迟随频率变化，高低频到达时间不同，导致包络发生严重的<strong className="text-[#ff3366]">色散 (Dispersion)</strong>变形。</li>
              <li className="text-lab-muted mt-2">注：为了让短信号的色散效果在视觉上更明显，本实验在频域将经典滤波器的相位延迟特性放大了 40 倍（相当于级联了 40 个同类滤波器）。</li>
            </ul>
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-lab-muted">经典滤波器类型 (fc = 80 Hz)</span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setFilterType("fir")}
                className={`py-2 rounded-lg text-xs font-mono transition-all ${
                  filterType === "fir"
                    ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#00ff88]/30"
                }`}
              >
                FIR Sinc (31-tap) - 绝对线性相位
              </button>
              <button
                onClick={() => setFilterType("bessel")}
                className={`py-2 rounded-lg text-xs font-mono transition-all ${
                  filterType === "bessel"
                    ? "bg-[#ff9100]/20 text-[#ff9100] border border-[#ff9100]/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#ff9100]/30"
                }`}
              >
                IIR Bessel (4th) - 最平坦群延迟
              </button>
              <button
                onClick={() => setFilterType("butterworth")}
                className={`py-2 rounded-lg text-xs font-mono transition-all ${
                  filterType === "butterworth"
                    ? "bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#ff3366]/30"
                }`}
              >
                IIR Butterworth (4th) - 非线性相位
              </button>
              <button
                onClick={() => setFilterType("chebyshev")}
                className={`py-2 rounded-lg text-xs font-mono transition-all ${
                  filterType === "chebyshev"
                    ? "bg-[#ff0000]/20 text-[#ff0000] border border-[#ff0000]/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#ff0000]/30"
                }`}
              >
                IIR Chebyshev (4th) - 严重色散
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-[3]">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            时域波形 (输入与输出对比)
          </div>
          <SignalCanvas draw={drawTimeDomain} height={280} className="w-full" />
        </div>
        <div className="flex-[2]">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            频域群延迟特性 (Group Delay vs Frequency)
          </div>
          <SignalCanvas draw={drawGroupDelay} height={180} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}
