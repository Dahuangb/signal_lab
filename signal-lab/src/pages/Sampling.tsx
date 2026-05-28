import { useCallback } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import { useParamsStore } from "@/store/useParamsStore";
import { generateSine } from "@/engine/signals";
import { generateSampledSignal } from "@/engine/sampling";
import {
  drawGrid,
  drawAxes,
  drawWaveform,
  drawStem,
  drawAxisLabels,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

const samplingFormula = katex.renderToString(
  "x[n] = x(nT_s), \\quad f_s \\geq 2f_{\\max}",
  { throwOnError: false }
);

export default function Sampling() {
  const { sampling, setSampling } = useParamsStore();
  const { signalFrequency, sampleFrequency } = sampling;

  const actualSampleFreq = sampleFrequency;

  const generateBandlimited = useCallback((fMax: number, sr: number, dur: number) => {
    const len = Math.floor(sr * dur);
    const samples = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Synthesize a bandlimited signal by summing a few harmonics up to fMax
      samples[i] = (
        Math.sin(2 * Math.PI * fMax * t) +
        0.8 * Math.sin(2 * Math.PI * (fMax * 0.6) * t + 1) +
        0.5 * Math.cos(2 * Math.PI * (fMax * 0.3) * t)
      ) / 2.3;
    }
    return { samples, sampleRate: sr, duration: dur, label: "Bandlimited Signal" };
  }, []);

  const drawTimeDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 0.5, yMin: -1.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const original = generateBandlimited(signalFrequency, 4096, 0.5);
      drawWaveform(
        ctx,
        original.samples,
        original.sampleRate,
        params.viewport,
        w,
        h,
        "#334466",
        "#334466",
        false,
        1
      );

      const { sampled, timeAxis } = generateSampledSignal(
        original,
        actualSampleFreq,
        4096
      );

      const padding = 40;
      for (let i = 0; i < sampled.length; i++) {
        if (sampled[i] !== 0) {
          const t = timeAxis[i];
          const drawWidth = w - padding * 2;
          const drawHeight = h - padding * 2;
          const sx =
            padding +
            ((t - params.viewport.xMin) /
              (params.viewport.xMax - params.viewport.xMin)) *
              drawWidth;
          const sy =
            padding +
            ((params.viewport.yMax - sampled[i]) /
              (params.viewport.yMax - params.viewport.yMin)) *
              drawHeight;

          ctx.strokeStyle = "#00e5ff";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#00e5ff";
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.moveTo(sx, h / 2);
          ctx.lineTo(sx, sy);
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#00e5ff";
          ctx.fill();
        }
      }
    },
    [signalFrequency, actualSampleFreq]
  );

  const drawFreqDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      const maxFreq = 60;
      // Change xMin from -5 to something that shows the negative half of the baseband triangle well
      params.viewport = { xMin: -35, xMax: maxFreq, yMin: 0, yMax: 1.2 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "f", "|X(f)|", "Hz", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;
      const fs = actualSampleFreq;
      const nyquist = fs / 2;

      // Draw Nyquist limit and shaded region
      ctx.strokeStyle = "rgba(255, 145, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const nx = padding + ((nyquist - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
      const originX = padding + ((0 - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
      const negNx = padding + ((-nyquist - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
      
      // Shade Nyquist band (Baseband) from -fs/2 to fs/2
      ctx.fillStyle = "rgba(0, 229, 255, 0.05)";
      ctx.fillRect(negNx, padding, nx - negNx, drawHeight);

      // Draw positive Nyquist limit line
      ctx.beginPath();
      ctx.moveTo(nx, padding);
      ctx.lineTo(nx, h - padding);
      ctx.stroke();

      // Draw negative Nyquist limit line
      ctx.beginPath();
      ctx.moveTo(negNx, padding);
      ctx.lineTo(negNx, h - padding);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "#ff9100";
      ctx.font = "10px JetBrains Mono";
      ctx.textAlign = "left";
      ctx.fillText(`f_s/2 = ${nyquist.toFixed(1)}Hz`, nx + 4, padding + 14);
      ctx.textAlign = "right";
      ctx.fillText(`-f_s/2`, negNx - 4, padding + 14);

      // Helper to draw a triangle representing a bandlimited spectrum
      const drawTriangle = (centerFreq: number, bandwidth: number, strokeColor: string, fillColor: string, isAlias: boolean = false) => {
        const sxCenter = padding + ((centerFreq - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
        const sxLeft = padding + ((centerFreq - bandwidth - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
        const sxRight = padding + ((centerFreq + bandwidth - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
        const syTop = padding + ((params.viewport.yMax - 0.8) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;
        const syBottom = padding + ((params.viewport.yMax - 0) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

        ctx.beginPath();
        ctx.moveTo(sxLeft, syBottom);
        ctx.lineTo(sxCenter, syTop);
        ctx.lineTo(sxRight, syBottom);
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // Label aliases
        if (isAlias && centerFreq >= -maxFreq && centerFreq <= maxFreq) {
          ctx.fillStyle = strokeColor;
          ctx.font = "10px JetBrains Mono";
          ctx.textAlign = "center";
          ctx.fillText(`k=${Math.round(centerFreq / fs)}`, sxCenter, syTop - 5);
        }
      };

      // Draw baseband triangle
      const f0 = signalFrequency;
      
      // Setup globalCompositeOperation to make overlapping regions visually distinct (aliasing effect)
      ctx.globalCompositeOperation = "screen";

      // Draw aliases first so they are behind the baseband
      for (let k = -10; k <= 10; k++) {
        if (k === 0) continue;
        const center = k * fs;
        // Only draw if part of it is in viewport
        if (center + f0 > params.viewport.xMin && center - f0 < params.viewport.xMax) {
          drawTriangle(center, f0, "#ff0033", "rgba(255, 0, 51, 0.4)", true);
        }
      }

      // Draw baseband (cyan)
      drawTriangle(0, f0, "#00e5ff", "rgba(0, 229, 255, 0.6)");
      
      // Reset composite operation for text
      ctx.globalCompositeOperation = "source-over";

      ctx.font = "10px JetBrains Mono";
      ctx.textAlign = "center";
      const baseSx = padding + ((0 - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
      const baseSy = padding + ((params.viewport.yMax - 0.8) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;
      ctx.fillStyle = "#00e5ff";
      ctx.fillText("基带", baseSx, baseSy - 10);

      if (actualSampleFreq < 2 * signalFrequency) {
        ctx.fillStyle = "rgba(255, 0, 51, 0.9)";
        ctx.font = "12px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText("⚠ 混叠！高频成分落入基带区域", w / 2, h - padding - 8);
      }
    },
    [signalFrequency, actualSampleFreq]
  );

  const nyquistOk = actualSampleFreq >= 2 * signalFrequency;
  const insight = nyquistOk
    ? `采样频率 ${actualSampleFreq}Hz ≥ 2×${signalFrequency}Hz，满足奈奎斯特条件。频谱中信号峰清晰独立，没有混叠。`
    : `采样频率 ${actualSampleFreq.toFixed(1)}Hz < 2×${signalFrequency}Hz，不满足奈奎斯特条件！频谱发生混叠——高频信号"伪装"成了低频信号，这就是混叠的物理本质。`;

  return (
    <ModuleLayout
      title="采样定理"
      formula={
        <div dangerouslySetInnerHTML={{ __html: samplingFormula }} />
      }
      controls={
        <>
          <ParamSlider
            label="信号最高频率 (Bandwidth)"
            value={signalFrequency}
            min={1}
            max={30}
            step={1}
            onChange={(v) => setSampling({ signalFrequency: v })}
            unit="Hz"
          />
          <ParamSlider
            label="采样频率"
            value={sampleFrequency}
            min={5}
            max={100}
            step={1}
            onChange={(v) => setSampling({ sampleFrequency: v })}
            unit="Hz"
          />
          <div className="p-3 rounded-lg bg-lab-bg/40 border border-lab-border/50">
            <div className="text-xs text-lab-muted">
              奈奎斯特频率：<span className="font-mono text-lab-cyan">f_s/2 = {(actualSampleFreq / 2).toFixed(1)} Hz</span>
            </div>
            <div className="text-xs text-lab-muted mt-1">
              信号带宽：<span className="font-mono text-lab-cyan">{signalFrequency} Hz</span>
              <span className={nyquistOk ? "text-lab-green ml-2" : "text-lab-amber ml-2"}>
                {nyquistOk ? "✓ 满足条件" : "✗ 发生混叠"}
              </span>
            </div>
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            时域：单频信号 + 采样点
          </div>
          <SignalCanvas draw={drawTimeDomain} height={280} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            频域：带限信号频谱（经典三角模型） + 周期搬移
          </div>
          <SignalCanvas draw={drawFreqDomain} height={250} className="w-full" />
        </div>
        <div className="p-4 rounded-lg bg-lab-bg/50 border border-lab-border text-sm text-lab-muted leading-relaxed">
          <h4 className="text-lab-text font-bold mb-2">为什么时域采样 = 频域周期复制？</h4>
          <div className="space-y-4 text-xs text-lab-muted leading-relaxed">
            <p>1. <strong>时域相乘</strong>：理想采样可以看作是连续信号 $x(t)$ 与一个冲激序列（梳状函数）相乘：</p>
            <div
              className="text-sm font-mono katex-wrapper"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(
                  "x_s(t) = x(t) \\cdot \\sum_{n=-\\infty}^{\\infty} \\delta(t - nT_s)",
                  { throwOnError: false, displayMode: true }
                ),
              }}
            />
            <p>2. <strong>频域卷积</strong>：根据傅里叶变换的性质，时域的乘积等于频域的卷积。冲激序列的傅里叶变换仍然是冲激序列（间隔为 $f_s$）：</p>
            <div
              className="text-sm font-mono katex-wrapper"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(
                  "X_s(f) = X(f) * \\left( f_s \\sum_{k=-\\infty}^{\\infty} \\delta(f - kf_s) \\right)",
                  { throwOnError: false, displayMode: true }
                ),
              }}
            />
            <p>3. <strong>周期搬移</strong>：任何频谱与冲激函数卷积，相当于把该频谱平移到冲激所在的位置。因此，采样后的频谱就是原频谱以 $f_s$ 为周期进行无数次复制拼接：</p>
            <div
              className="text-sm font-mono katex-wrapper"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(
                  "X_s(f) = f_s \\sum_{k=-\\infty}^{\\infty} X(f - kf_s)",
                  { throwOnError: false, displayMode: true }
                ),
              }}
            />
          </div>
          
          <h4 className="text-lab-text font-bold mt-6 mb-2">频域混叠的直观理解：</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <span className="text-lab-cyan">基带信号（Cyan）：</span>原始连续信号的真实频谱成分。
            </li>
            <li>
              <span className="text-lab-amber text-red-500">混叠/镜像成分（Red）：</span>
              上述公式推导出的<span className="font-bold text-lab-text">周期性搬移频谱</span>。
            </li>
            <li>
              <span className="font-mono text-lab-amber bg-lab-amber/10 px-1 rounded">Nyquist 带宽 [-f_s/2, f_s/2]：</span>
              实际数字系统能“看”到的频率范围。如果采样率 $f_s$ 较低（{"$f_s < 2f_{\\max}$"}），红色的“镜像频谱”就会侵入这个淡蓝色的观测区间内，导致<span className="font-bold text-lab-amber">频谱混叠（Aliasing）</span>，高频信号在数字域中被错误地“看作”了低频信号。
            </li>
          </ul>
        </div>
      </div>
    </ModuleLayout>
  );
}
