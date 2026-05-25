import { useCallback } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import { useParamsStore } from "@/store/useParamsStore";
import { generateSine } from "@/engine/signals";
import { generateSampledSignal } from "@/engine/sampling";
import { computeSpectrum } from "@/engine/fft";
import {
  drawGrid,
  drawAxes,
  drawWaveform,
  drawSpectrum,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

const samplingFormula = katex.renderToString(
  "x[n] = x(nT_s), \\quad f_s \\geq 2f_{\\max}",
  { throwOnError: false }
);

export default function Sampling() {
  const { sampling, setSampling } = useParamsStore();
  const { signalFrequency, sampleFrequency, mode } = sampling;

  const actualSampleFreq =
    mode === "undersample" ? signalFrequency * 1.2 : sampleFrequency;

  const drawTimeDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 0.5, yMin: -1.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const original = generateSine(signalFrequency, 4096, 0.5);
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
      const signal = generateSine(signalFrequency, 4096, 1);
      const spectrum = computeSpectrum(signal.samples, 4096);
      const maxFreq = 60;
      params.viewport = { xMin: 0, xMax: maxFreq, yMin: 0, yMax: 0.8 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawSpectrum(
        ctx,
        spectrum.magnitudes,
        spectrum.frequencies,
        maxFreq,
        w,
        h,
        "#00e5ff",
        true
      );

      const padding = 40;
      const drawWidth = w - padding * 2;
      const fs = actualSampleFreq;
      const nyquist = fs / 2;

      ctx.strokeStyle = "rgba(255, 145, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const nx =
        padding +
        (nyquist / maxFreq) * drawWidth;
      ctx.beginPath();
      ctx.moveTo(nx, padding);
      ctx.lineTo(nx, h - padding);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "#ff9100";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText(`f_s/2 = ${nyquist.toFixed(1)}Hz`, nx + 4, padding + 14);

      if (mode === "undersample") {
        ctx.fillStyle = "rgba(255, 145, 0, 0.9)";
        ctx.font = "12px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText("⚠ 混叠！采样频率不足", w / 2, h - padding - 8);
      }
    },
    [signalFrequency, actualSampleFreq, mode]
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
            label="信号频率"
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
          <div className="flex flex-col gap-1">
            <span className="text-xs text-lab-muted">演示模式</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSampling({ mode: "normal" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  mode === "normal"
                    ? "bg-lab-green/20 text-lab-green border border-lab-green/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-green/30"
                }`}
              >
                正常采样
              </button>
              <button
                onClick={() => setSampling({ mode: "undersample" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  mode === "undersample"
                    ? "bg-lab-amber/20 text-lab-amber border border-lab-amber/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-amber/30"
                }`}
              >
                欠采样混叠
              </button>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-lab-bg/40 border border-lab-border/50">
            <div className="text-xs text-lab-muted">
              奈奎斯特频率：<span className="font-mono text-lab-cyan">f_s/2 = {(actualSampleFreq / 2).toFixed(1)} Hz</span>
            </div>
            <div className="text-xs text-lab-muted mt-1">
              信号频率：<span className="font-mono text-lab-cyan">{signalFrequency} Hz</span>
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
            时域：原始信号 + 采样点
          </div>
          <SignalCanvas draw={drawTimeDomain} height={280} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            频域：频谱 + 奈奎斯特频率标记
          </div>
          <SignalCanvas draw={drawFreqDomain} height={250} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}
