import { useCallback, useState, useRef, useEffect } from "react";
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
  drawAxisLabels,
  drawWaveform,
  defaultRenderParams,
  worldToScreen,
} from "@/renderer/CanvasCore";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const sig1 = generateSignal(signalType1);
  const sig2 = generateSignal(signalType2);
  const totalSteps = sig1.samples.length + sig2.samples.length - 1;

  const stepData = convolveStepByStep(sig1, sig2, Math.min(step, totalSteps - 1));

  const drawOverlap = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: -1, xMax: 2, yMin: -0.2, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "τ", "幅值", "s", "");

      const padding = 40;

      // 1. Draw x(tau)
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < sig1.samples.length; i++) {
        const tau = i / sig1.sampleRate;
        const { sx, sy } = worldToScreen(tau, sig1.samples[i], params.viewport, w, h, padding);
        if (first) {
          ctx.moveTo(sx, sy);
          first = false;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      if (params.glowEnabled) {
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 6;
      }
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2. Draw h(t - tau)
      const t = step / sig1.sampleRate;
      ctx.beginPath();
      first = true;
      for (let i = 0; i < sig2.samples.length; i++) {
        const tau = t - i / sig2.sampleRate;
        const { sx, sy } = worldToScreen(tau, sig2.samples[i], params.viewport, w, h, padding);
        if (first) {
          ctx.moveTo(sx, sy);
          first = false;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      if (params.glowEnabled) {
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 6;
      }
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Draw overlapping area (product)
      if (stepData.overlapStart <= stepData.overlapEnd) {
        ctx.beginPath();
        
        const startTau = stepData.overlapStart / sig1.sampleRate;
        const { sx: sx0, sy: sy0 } = worldToScreen(startTau, 0, params.viewport, w, h, padding);
        ctx.moveTo(sx0, sy0);
        
        for (let k = stepData.overlapStart; k <= stepData.overlapEnd; k++) {
          const tau = k / sig1.sampleRate;
          const hIndex = step - k;
          const prod = sig1.samples[k] * sig2.samples[hIndex];
          const { sx, sy } = worldToScreen(tau, prod, params.viewport, w, h, padding);
          ctx.lineTo(sx, sy);
        }
        
        const endTau = stepData.overlapEnd / sig1.sampleRate;
        const { sx: sxEnd, sy: syEnd } = worldToScreen(endTau, 0, params.viewport, w, h, padding);
        ctx.lineTo(sxEnd, syEnd);
        ctx.closePath();
        
        ctx.fillStyle = "rgba(255, 145, 0, 0.4)";
        ctx.fill();
        ctx.strokeStyle = "#ff9100";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        const midTau = (startTau + endTau) / 2;
        const { sx: midX } = worldToScreen(midTau, 0, params.viewport, w, h, padding);
        ctx.fillStyle = "#ff9100";
        ctx.font = "bold 11px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText("积分面积", midX, padding + 16);
        ctx.font = "10px JetBrains Mono";
        ctx.fillText(`= y(${(t).toFixed(2)})`, midX, padding + 30);
        ctx.textAlign = "start";
      }

      ctx.fillStyle = "#00e5ff";
      ctx.font = "11px JetBrains Mono";
      ctx.fillText("x(τ)", padding + 4, padding + 16);

      ctx.fillStyle = "#00ff88";
      ctx.fillText("h(t-τ)", padding + 4, padding + 30);
    },
    [sig1, sig2, step, stepData]
  );

  const drawOutput = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      const maxDur = 2;
      params.viewport = { xMin: 0, xMax: maxDur, yMin: -0.1, yMax: 0.6 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "t", "y(t)", "s", "");

      const padding = 40;
      const drawWidth = w - padding * 2;

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

      if (step > 0 && step < totalSteps) {
        const currentT = step / sig1.sampleRate;
        const sx =
          padding +
          (currentT / maxDur) * drawWidth;
        const currentVal = stepData.outputSample;
        const { sy } = (() => {
          const dy = h - padding * 2;
          const sy =
            padding +
            ((params.viewport.yMax - currentVal) /
              (params.viewport.yMax - params.viewport.yMin)) *
              dy;
          return { sy };
        })();

        ctx.fillStyle = "#ff4080";
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ff4080";
        ctx.font = "10px JetBrains Mono";
        ctx.fillText(
          `y(${(currentT).toFixed(2)})=${currentVal.toFixed(3)}`,
          sx + 8,
          sy - 6
        );
      }

      ctx.fillStyle = "#ff9100";
      ctx.font = "11px JetBrains Mono";
      const p = 40;
      ctx.fillText("y(t) = x(t) * h(t)", p + 4, p + 16);
    },
    [sig1, sig2, step, totalSteps, stepData]
  );

  const insight =
    step === 0
      ? "第一步：h(τ) 被翻转为 h(-τ)，向右滑动。当前还未与 x(τ) 重叠。"
      : stepData.overlapStart <= stepData.overlapEnd
        ? `重叠区域 τ ∈ [${(stepData.overlapStart / sig1.sampleRate).toFixed(2)}s, ${(stepData.overlapEnd / sig1.sampleRate).toFixed(2)}s] — 橙色高亮区域中 x(τ)·h(t-τ) 的积分 = y(t) = ${stepData.outputSample.toFixed(3)}`
        : "两个信号不重叠 — 卷积输出为 0。继续滑动，等待它们重叠。";

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
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                  }
                } else {
                  setPlaying(true);
                  const interval = setInterval(() => {
                    setStep((prev) => {
                      if (prev >= totalSteps - 1) {
                        clearInterval(interval);
                        intervalRef.current = null;
                        setPlaying(false);
                        return prev;
                      }
                      return prev + 1;
                    });
                  }, 30);
                  intervalRef.current = interval;
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
            <button
              onClick={() => {
                setPlaying(false);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                setStep(0);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lab-bg text-lab-muted border border-lab-border text-xs font-mono hover:border-lab-amber/30 hover:text-lab-amber transition-colors"
            >
              <RotateCcw size={14} />
              重置
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
        <div>
          <div className="text-xs text-lab-muted mb-1 font-mono uppercase tracking-wider">
            x(τ) 与 h(t-τ) 的卷积过程 — 橙色区域 = 重叠 = 积分区间
          </div>
          <SignalCanvas draw={drawOverlap} height={280} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-1 font-mono uppercase tracking-wider">
            卷积输出 y(t) — 粉色圆点标记当前时刻的输出值
          </div>
          <SignalCanvas draw={drawOutput} height={220} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}
