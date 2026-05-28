import { useCallback, useMemo } from "react";
import katex from "katex";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, ArrowRight, FlaskConical } from "lucide-react";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import { useParamsStore, SignalType } from "@/store/useParamsStore";
import {
  generateSine,
  generateSquare,
  generateSawtooth,
  generateTriangle,
  addSignals,
} from "@/engine/signals";
import { computeSpectrum } from "@/engine/fft";
import {
  drawGrid,
  drawAxes,
  drawAxisLabels,
  drawWaveform,
  drawSpectrum,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

const SERIES_FORMULAS: Record<SignalType, { latex: string; harmonics: string; decay: string }> = {
  square: {
    latex:
      "f(t)=\\frac{4}{\\pi}\\sum_{k=1}^{\\infty}\\frac{\\sin\\big((2k-1)\\omega t\\big)}{2k-1}",
    harmonics: "只有奇次谐波 (n=1,3,5,7,…)，偶次谐波系数为零",
    decay: "幅度按 1/n 递减：第3次谐波幅度是基波的 1/3，第5次是 1/5",
  },
  sawtooth: {
    latex:
      "f(t)=\\frac{2}{\\pi}\\sum_{k=1}^{\\infty}(-1)^{k+1}\\frac{\\sin(k\\omega t)}{k}",
    harmonics: "包含所有谐波 (n=1,2,3,4,…)，但奇偶符号交替",
    decay: "幅度按 1/n 递减：第2次谐波幅度是基波的 1/2，第 n 次是 1/n",
  },
  triangle: {
    latex:
      "f(t)=\\frac{8}{\\pi^2}\\sum_{k=0}^{\\infty}\\frac{(-1)^k\\sin\\big((2k+1)\\omega t\\big)}{(2k+1)^2}",
    harmonics: "只有奇次谐波 (n=1,3,5,7,…)，且幅度按 1/n² 快速衰减",
    decay: "幅度按 1/n² 递减：第3次谐波幅度仅为基波的 1/9，收敛极快",
  },
};

const FOURIER_TRANSFORM = katex.renderToString(
  "F(\\omega)=\\int_{-\\infty}^{\\infty}f(t)e^{-j\\omega t}dt",
  { throwOnError: false }
);

export default function FourierLab() {
  const navigate = useNavigate();
  const { fourier, setFourier } = useParamsStore();
  const { signalType, baseFrequency, harmonicCount } = fourier;

  const seriesInfo = SERIES_FORMULAS[signalType];

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

  const individualHarmonics = useMemo(() => {
    const freq = baseFrequency;
    const sr = 2048;
    const dur = 1;
    const harmonics: ReturnType<typeof generateSine>[] = [];

    if (signalType === "square") {
      for (let k = 1; k <= harmonicCount; k++) {
        const n = 2 * k - 1;
        const amp = (4 / Math.PI) / n;
        harmonics.push(generateSine(freq * n, sr, dur, amp));
      }
    } else if (signalType === "sawtooth") {
      for (let k = 1; k <= harmonicCount; k++) {
        const sign = k % 2 === 0 ? -1 : 1;
        const amp = (2 / Math.PI) * sign / k;
        harmonics.push(generateSine(freq * k, sr, dur, amp));
      }
    } else {
      for (let k = 0; k < harmonicCount; k++) {
        const n = 2 * k + 1;
        const sign = k % 2 === 0 ? 1 : -1;
        const amp = (8 / (Math.PI * Math.PI)) * sign / (n * n);
        harmonics.push(generateSine(freq * n, sr, dur, amp));
      }
    }

    return harmonics;
  }, [signalType, baseFrequency, harmonicCount]);

  const drawTimeDomain = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 1, yMin: -1.8, yMax: 1.8 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "时间", "幅值", "s", "");

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
      const maxFreq = baseFrequency * (signalType === "triangle" ? 30 : 50);
      params.viewport = { xMin: 0, xMax: maxFreq, yMin: 0, yMax: 0.8 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "频率", "|F(f)|", "Hz", "");

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

      const harmonicColors = ["#00e5ff", "#00c4d4", "#00a3aa", "#008280", "#006160"];
      const signalColors: Record<SignalType, number[]> = {
        square: Array.from({ length: harmonicCount }, (_, i) => 2 * i + 1),
        sawtooth: Array.from({ length: harmonicCount }, (_, i) => i + 1),
        triangle: Array.from({ length: harmonicCount }, (_, i) => 2 * i + 1),
      };

      const padding = 40;
      const drawWidth = w - padding * 2;
      const indices = signalColors[signalType];
      for (let idx = 0; idx < Math.min(indices.length, harmonicCount); idx++) {
        const n = indices[idx];
        const fPos = n * baseFrequency;
        if (fPos < maxFreq) {
          const sx = padding + (fPos / maxFreq) * drawWidth;
          ctx.fillStyle = harmonicColors[idx % harmonicColors.length];
          ctx.font = "9px JetBrains Mono";
          ctx.textAlign = "center";
          ctx.fillText(`n=${n}`, sx, h - padding + 4);
        }
      }
      ctx.textAlign = "start";
    },
    [generateSignal, baseFrequency, signalType, harmonicCount]
  );

  const drawHarmonicDecomp = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 0.3, yMin: -1.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "时间", "幅值", "s", "");

      const padding = 40;
      const legendColors = ["#00e5ff", "#ff9100", "#00ff88", "#ff4080", "#b388ff", "#80d8ff"];
      const maxShow = Math.min(6, harmonicCount);

      for (let i = 0; i < maxShow; i++) {
        const harmonic = individualHarmonics[i];
        const color = legendColors[i % legendColors.length];
        const alpha = 1 - i * 0.12;
        ctx.globalAlpha = alpha;
        drawWaveform(
          ctx,
          harmonic.samples,
          harmonic.sampleRate,
          params.viewport,
          w,
          h,
          color,
          color,
          false,
          1.5
        );
        ctx.globalAlpha = 1;

        const n = signalType === "sawtooth" ? i + 1 : 2 * i + 1;
        ctx.fillStyle = color;
        ctx.font = "10px JetBrains Mono";
        ctx.fillText(
          `第${n}次谐波`,
          padding + 10,
          padding + 16 + i * 18
        );
      }

      const sum = addSignals(...individualHarmonics.slice(0, maxShow));
      drawWaveform(
        ctx,
        sum.samples,
        sum.sampleRate,
        params.viewport,
        w,
        h,
        "#ffffff",
        "#ffffff",
        true,
        2.5
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = "11px JetBrains Mono";
      ctx.fillText("叠加结果", padding + 10, padding + 16 + maxShow * 18);
    },
    [individualHarmonics, harmonicCount, signalType]
  );

  const signalName = signalType === "square" ? "方波" : signalType === "sawtooth" ? "锯齿波" : "三角波";

  const insight = (() => {
    if (harmonicCount <= 1)
      return `只有基频正弦波 → 频谱上只有一个峰在 ${baseFrequency}Hz。增加谐波数，看${signalName}如何从正弦波"生长"出来。`;
    if (harmonicCount <= 5)
      return `${harmonicCount} 个谐波叠加 → ${signalName}轮廓初现！但边缘仍有波纹（这就是吉布斯现象）。频谱上能清晰看到谐波峰的分布规律。`;
    return `${harmonicCount} 个谐波 → ${signalName}已经很接近理想波形了。注意观察：${
      signalType === "triangle" ? "三角波的谐波幅度按 1/n² 衰减，远快于方波的 1/n，所以收敛更平滑" : "谐波峰值按公式中的系数规律递减——这就是傅里叶级数系数的物理含义"
    }。`;
  })();

  return (
    <div className="min-h-screen bg-lab-bg flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-lab-border bg-lab-surface/50">
        <button
          onClick={() => navigate("/fourier")}
          className="p-2 rounded-lg hover:bg-lab-border/50 transition-colors text-lab-muted hover:text-lab-cyan"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-mono text-lab-cyan tracking-wide">
          动手实验
        </h1>
        <span className="text-xs text-lab-muted font-mono">返回公式推导</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate("/gibbs")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lab-amber/10 border border-lab-amber/30 text-lab-amber text-xs font-mono hover:bg-lab-amber/20 transition-colors"
          >
            <Info size={14} />
            吉布斯现象
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col xl:flex-row gap-0">
        <div className="xl:w-96 p-6 border-r border-lab-border bg-lab-surface/30 flex flex-col gap-4 overflow-y-auto">
          <div className="p-4 rounded-lg border border-lab-cyan/20 bg-lab-cyan/5">
            <div className="text-xs text-lab-cyan mb-3 font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-lab-cyan" />
              傅里叶级数 — {signalName}
            </div>
            <div
              className="text-sm font-mono katex-wrapper mb-3"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(seriesInfo.latex, {
                  throwOnError: false,
                }),
              }}
            />
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                <span className="shrink-0 w-2 h-2 rounded-full bg-[#00e5ff] mt-1.5" />
                <div>
                  <span className="text-xs text-[#00e5ff] font-mono">k</span>
                  <span className="text-xs text-lab-muted ml-1">求和指标，从 1 开始遍历所有谐波项</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                <span className="shrink-0 w-2 h-2 rounded-full bg-[#00ff88] mt-1.5" />
                <div>
                  <span className="text-xs text-[#00ff88] font-mono">(2k−1)ωt</span>
                  <span className="text-xs text-lab-muted ml-1">第 k 个谐波的频率 → 频谱横轴</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                <span className="shrink-0 w-2 h-2 rounded-full bg-[#ff9100] mt-1.5" />
                <div>
                  <span className="text-xs text-[#ff9100] font-mono">1/(2k−1)</span>
                  <span className="text-xs text-lab-muted ml-1">谐波幅度系数 → 频谱柱高</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-lab-border bg-lab-bg/50">
            <div className="text-xs text-lab-muted mb-3 font-mono uppercase tracking-wider">
              奇次谐波与偶次谐波
            </div>
            <p className="text-xs text-lab-text leading-relaxed mb-2">
              <span className="text-[#00e5ff] font-mono">奇次谐波</span>
              ：频率为基频的奇数倍 (1f, 3f, 5f, 7f…)
            </p>
            <p className="text-xs text-lab-text leading-relaxed mb-2">
              <span className="text-lab-muted font-mono">偶次谐波</span>
              ：频率为基频的偶数倍 (2f, 4f, 6f…)
            </p>
            <div className="mt-3 p-3 rounded bg-lab-bg/60 border border-lab-border/50">
              <p className="text-xs text-lab-text leading-relaxed">
                {signalType === "square"
                  ? `方波只含奇次谐波，因为方波是"奇函数 + 半波对称"——这种对称性使得偶次谐波的积分恰好为零。数学上：∫f(t)·sin(2k·ωt)dt = 0。`
                  : signalType === "sawtooth"
                    ? `锯齿波包含所有谐波（奇次+偶次），因为它没有半波对称性。但奇偶项的符号交替 (±)，幅度按 1/n 递减。`
                    : `三角波只含奇次谐波，幅度按 1/n² 递减——比方波快得多，所以三角波只需要很少的谐波就能完美逼近。`}
              </p>
            </div>
            <p className="text-xs text-lab-muted mt-2 leading-relaxed">
              对照频谱图观察：频谱上出现的峰就是公式里实际存在的谐波项。
              {signalType === "square" ? "注意只有 1f、3f、5f… 位置有峰！" : signalType === "sawtooth" ? "注意 1f、2f、3f、4f… 每个位置都有峰。" : "注意只有 1f、3f、5f… 位置有峰，且衰减极快。"}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-lab-border bg-lab-bg/50">
            <div className="text-xs text-lab-muted mb-3 font-mono uppercase tracking-wider">
              傅里叶变换（通用形式）
            </div>
            <div
              className="text-sm font-mono katex-wrapper"
              dangerouslySetInnerHTML={{ __html: FOURIER_TRANSFORM }}
            />
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-lab-muted">
                <span className="text-[#00e5ff] font-mono">F(ω)</span> = 频谱函数，即图中频域的纵轴
              </p>
              <p className="text-xs text-lab-muted">
                <span className="text-[#00ff88] font-mono">f(t)</span> = 原始时域信号，即图中时域的波形
              </p>
              <p className="text-xs text-lab-muted">
                <span className="text-[#ff9100] font-mono">e⁻ʲωᵗ</span> = 旋转向量，用频率 ω "扫描"信号，匹配度高则频谱峰值大
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-lab-border bg-lab-bg/50">
            <div className="text-xs text-lab-muted mb-3 font-mono uppercase tracking-wider">
              参数控制
            </div>
            <div className="flex flex-col gap-4">
              <ParamSlider
                label="基频"
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
                          ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40"
                          : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#00e5ff]/30"
                      }`}
                    >
                      {t === "square" ? "方波" : t === "sawtooth" ? "锯齿波" : "三角波"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#00ff88]/30 bg-[#00ff88]/5">
            <div className="text-xs text-[#00ff88] mb-1 font-mono uppercase tracking-wider">
              物理直觉
            </div>
            <p className="text-xs text-lab-text leading-relaxed">{insight}</p>
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4 overflow-auto">
          <div>
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              时域波形 — f(t) 对应傅里叶级数公式的左侧
            </div>
            <SignalCanvas draw={drawTimeDomain} height={280} className="w-full" />
          </div>
          <div>
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              频谱 — 每个峰 = 公式中的一个谐波项，峰高 = 系数值
            </div>
            <SignalCanvas draw={drawFreqDomain} height={250} className="w-full" />
          </div>
          <div>
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              谐波分解 — 各次谐波独立绘制，观察它们如何叠加成最终波形
            </div>
            <SignalCanvas draw={drawHarmonicDecomp} height={300} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
