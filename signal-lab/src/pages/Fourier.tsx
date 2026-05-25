import { useCallback } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import { useParamsStore } from "@/store/useParamsStore";
import {
  generateSquare,
  generateSawtooth,
  generateTriangle,
} from "@/engine/signals";
import { computeSpectrum } from "@/engine/fft";
import {
  drawGrid,
  drawAxes,
  drawWaveform,
  drawSpectrum,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

const fourierFormula = katex.renderToString(
  "F(\\omega) = \\int_{-\\infty}^{\\infty} f(t) \\, e^{-j\\omega t} \\, dt",
  { throwOnError: false }
);

export default function Fourier() {
  const { fourier, setFourier } = useParamsStore();
  const { signalType, baseFrequency, harmonicCount } = fourier;

  const generateSignal = useCallback(() => {
    const freq = baseFrequency;
    const sr = 2048;
    const dur = 1;
    switch (signalType) {
      case "square":
        return generateSquare(freq, sr, dur, harmonicCount);
      case "sawtooth":
        return generateSawtooth(freq, sr, dur, harmonicCount);
      case "triangle":
        return generateTriangle(freq, sr, dur, harmonicCount);
      default:
        return generateSquare(freq, sr, dur, harmonicCount);
    }
  }, [signalType, baseFrequency, harmonicCount]);

  const drawTimeDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 1, yMin: -1.8, yMax: 1.8 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      const signal = generateSignal();
      drawWaveform(
        ctx,
        signal.samples,
        signal.sampleRate,
        params.viewport,
        w,
        h,
        params.waveColor,
        params.glowColor,
        params.glowEnabled
      );
    },
    [generateSignal]
  );

  const drawFreqDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      const signal = generateSignal();
      const spectrum = computeSpectrum(signal.samples, signal.sampleRate);
      const maxFreq = 50;
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
        params.waveColor,
        params.glowEnabled
      );
    },
    [generateSignal]
  );

  const insight = (() => {
    if (harmonicCount <= 1)
      return "只有基频正弦波 → 频谱上只有一个峰。增加谐波数，看方波如何从正弦波\"生长\"出来。";
    if (harmonicCount <= 5)
      return `${harmonicCount} 个谐波叠加 → 波形开始接近方波，但边缘仍有波纹（吉布斯现象）。频谱上出现了 ${harmonicCount} 个奇次谐波峰。`;
    return `${harmonicCount} 个谐波 → 方波越来越陡峭！注意频谱峰值按 1/n 递减——这就是傅里叶级数系数的物理含义。`;
  })();

  return (
    <ModuleLayout
      title="傅里叶变换"
      formula={
        <div dangerouslySetInnerHTML={{ __html: fourierFormula }} />
      }
      controls={
        <>
          <ParamSlider
            label="基频 (Hz)"
            value={baseFrequency}
            min={1}
            max={10}
            step={1}
            onChange={(v) => setFourier({ baseFrequency: v })}
            unit="Hz"
          />
          <ParamSlider
            label="谐波数量"
            value={harmonicCount}
            min={1}
            max={30}
            step={1}
            onChange={(v) => setFourier({ harmonicCount: v })}
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-lab-muted">信号类型</span>
            <div className="flex gap-2">
              {(["square", "sawtooth", "triangle"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFourier({ signalType: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    signalType === t
                      ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                      : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
                  }`}
                >
                  {t === "square" ? "方波" : t === "sawtooth" ? "锯齿波" : "三角波"}
                </button>
              ))}
            </div>
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            时域波形
          </div>
          <SignalCanvas draw={drawTimeDomain} height={300} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            频谱 (幅度谱)
          </div>
          <SignalCanvas draw={drawFreqDomain} height={250} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}
