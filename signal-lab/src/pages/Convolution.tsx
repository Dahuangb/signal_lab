import { useCallback, useState } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { useParamsStore } from "@/store/useParamsStore";
import {
  generateRectangularPulse,
  generateGaussianPulse,
} from "@/engine/signals";
import { convolveStepByStep } from "@/engine/convolution";
import {
  drawGrid,
  drawAxes,
  drawWaveform,
  defaultRenderParams,
} from "@/renderer/CanvasCore";
import { Play, Pause, SkipForward } from "lucide-react";

const convolutionFormula = katex.renderToString(
  "y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) \\, h(t - \\tau) \\, d\\tau",
  { throwOnError: false }
);

function generateSignal(type: string) {
  const sr = 512;
  const dur = 1;
  switch (type) {
    case "gaussian":
      return generateGaussianPulse(0.5, 0.05, sr, dur);
    case "exponential": {
      const samples = new Float64Array(sr);
      for (let i = 0; i < sr; i++) {
        const t = i / sr;
        samples[i] = t < 0.5 ? Math.exp(-t * 20) : 0;
      }
      return { samples, sampleRate: sr, duration: dur, label: "exponential" };
    }
    default:
      return generateRectangularPulse(0.1, 0.4, sr, dur);
  }
}

export default function Convolution() {
  const { convolution, setConvolution } = useParamsStore();
  const { signalType1, signalType2 } = convolution;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const sig1 = generateSignal(signalType1);
  const sig2 = generateSignal(signalType2);
  const totalSteps = sig1.samples.length + sig2.samples.length - 1;

  const stepData = convolveStepByStep(sig1, sig2, Math.min(step, totalSteps - 1));

  const drawTopSignal = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 1, yMin: -0.2, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const overlapStart = stepData.overlapStart / sig1.sampleRate;
      const overlapEnd = stepData.overlapEnd / sig1.sampleRate;

      if (stepData.overlapStart <= stepData.overlapEnd) {
        const sx =
          padding +
          (overlapStart / (params.viewport.xMax - params.viewport.xMin)) *
            drawWidth;
        const ex =
          padding +
          (overlapEnd / (params.viewport.xMax - params.viewport.xMin)) *
            drawWidth;
        ctx.fillStyle = "rgba(0, 229, 255, 0.15)";
        ctx.fillRect(sx, padding, ex - sx, drawHeight);
      }

      drawWaveform(
        ctx,
        sig1.samples,
        sig1.sampleRate,
        params.viewport,
        w,
        h,
        "#00e5ff",
        "#00e5ff",
        true
      );

      ctx.fillStyle = "#8892b0";
      ctx.font = "11px JetBrains Mono";
      ctx.fillText("x(τ)", padding + 4, padding + 16);
    },
    [sig1, stepData]
  );

  const drawBottomSignal = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 1, yMin: -0.2, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const reversed = new Float64Array(sig2.samples.length);
      for (let i = 0; i < sig2.samples.length; i++) {
        reversed[i] = sig2.samples[sig2.samples.length - 1 - i];
      }

      const shift = step / sig2.sampleRate;
      const shiftedSamples = new Float64Array(reversed.length + Math.floor(shift * sig2.sampleRate));
      const offset = Math.floor(shift * sig2.sampleRate);
      for (let i = 0; i < reversed.length; i++) {
        const idx = i + offset;
        if (idx < shiftedSamples.length) {
          shiftedSamples[idx] = reversed[i];
        }
      }

      drawWaveform(
        ctx,
        shiftedSamples,
        sig2.sampleRate,
        params.viewport,
        w,
        h,
        "#00ff88",
        "#00ff88",
        true
      );

      ctx.fillStyle = "#8892b0";
      ctx.font = "11px JetBrains Mono";
      const padding = 40;
      ctx.fillText("h(t-τ)  [翻转+滑动]", padding + 4, padding + 16);
    },
    [sig2, step]
  );

  const drawOutput = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 2, yMin: -0.2, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const outputSamples = new Float64Array(totalSteps);
      for (let s = 0; s <= step && s < totalSteps; s++) {
        const d = convolveStepByStep(sig1, sig2, s);
        outputSamples[s] = d.outputSample;
      }

      drawWaveform(
        ctx,
        outputSamples,
        sig1.sampleRate,
        params.viewport,
        w,
        h,
        "#ff9100",
        "#ff9100",
        true
      );

      ctx.fillStyle = "#8892b0";
      ctx.font = "11px JetBrains Mono";
      const padding = 40;
      ctx.fillText("y(t)  卷积输出", padding + 4, padding + 16);
    },
    [sig1, sig2, step, totalSteps]
  );

  const insight =
    step === 0
      ? "卷积的第一步：h(τ) 被翻转为 h(-τ)，然后向右滑动。当前 h(t-τ) 还未与 x(τ) 重叠。"
      : stepData.overlapStart <= stepData.overlapEnd
        ? `h(t-τ) 与 x(τ) 正在重叠（τ ∈ [${(stepData.overlapStart / sig1.sampleRate).toFixed(2)}, ${(stepData.overlapEnd / sig1.sampleRate).toFixed(2)}]s）！重叠区域的乘积积分 = 卷积在该时刻的输出值。`
        : "卷积的本质：翻转一个信号，滑动它穿过另一个信号，在每个位置计算重叠区域的积分。";

  return (
    <ModuleLayout
      title="卷积"
      formula={
        <div dangerouslySetInnerHTML={{ __html: convolutionFormula }} />
      }
      controls={
        <>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-lab-muted">信号 x(τ) 类型</span>
            <div className="flex gap-2">
              {(["rectangular", "gaussian", "exponential"] as const).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setConvolution({ signalType1: t })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      signalType1 === t
                        ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                        : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
                    }`}
                  >
                    {t === "rectangular"
                      ? "矩形"
                      : t === "gaussian"
                        ? "高斯"
                        : "指数"}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-lab-muted">信号 h(τ) 类型</span>
            <div className="flex gap-2">
              {(["rectangular", "gaussian", "exponential"] as const).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setConvolution({ signalType2: t })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      signalType2 === t
                        ? "bg-lab-green/20 text-lab-green border border-lab-green/40"
                        : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-green/30"
                    }`}
                  >
                    {t === "rectangular"
                      ? "矩形"
                      : t === "gaussian"
                        ? "高斯"
                        : "指数"}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  setPlaying(true);
                  const interval = setInterval(() => {
                    setStep((prev) => {
                      if (prev >= totalSteps - 1) {
                        clearInterval(interval);
                        setPlaying(false);
                        return prev;
                      }
                      return prev + 1;
                    });
                  }, 30);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40 text-xs font-mono hover:bg-lab-cyan/30 transition-colors"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? "暂停" : "播放动画"}
            </button>
            <button
              onClick={() => setStep((s) => Math.min(s + 1, totalSteps - 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lab-bg text-lab-muted border border-lab-border text-xs font-mono hover:border-lab-cyan/30 transition-colors"
            >
              <SkipForward size={14} />
              单步前进
            </button>
          </div>

          <div className="text-xs text-lab-muted font-mono">
            步骤：{step + 1} / {totalSteps}
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-3">
        <SignalCanvas draw={drawTopSignal} height={200} className="w-full" />
        <SignalCanvas
          draw={drawBottomSignal}
          height={200}
          className="w-full"
        />
        <SignalCanvas draw={drawOutput} height={200} className="w-full" />
      </div>
    </ModuleLayout>
  );
}
