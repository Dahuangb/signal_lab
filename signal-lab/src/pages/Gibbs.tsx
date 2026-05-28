import { useCallback, useMemo, useState } from "react";
import katex from "katex";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import {
  generateSquare,
} from "@/engine/signals";
import {
  drawGrid,
  drawAxes,
  drawWaveform,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

export default function Gibbs() {
  const navigate = useNavigate();
  const [harmonicCount, setHarmonicCount] = useState(5);
  const [zoom, setZoom] = useState(false);

  const signal = useMemo(() => {
    const sr = 4096;
    const dur = 1;
    return generateSquare(1, sr, dur, harmonicCount);
  }, [harmonicCount]);

  const overshootPercent = useMemo(() => {
    const samples = signal.samples;
    const sr = signal.sampleRate;

    const jumpIdx = Math.floor(0.5 * sr);
    let maxVal = 0;
    for (let i = jumpIdx - 20; i <= jumpIdx + 20 && i < samples.length; i++) {
      if (samples[i] > maxVal) maxVal = samples[i];
    }
    const steadyVal = 1;
    return Math.round(((maxVal - steadyVal) / steadyVal) * 1000) / 10;
  }, [signal]);

  const drawOverview = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 1, yMin: -1.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const padding = 40;
      ctx.fillStyle = "#8892b0";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText("t", w - padding - 20, h - padding + 16);
      ctx.fillText("f(t)", padding + 4, padding - 6);

      drawWaveform(
        ctx,
        signal.samples,
        signal.sampleRate,
        params.viewport,
        w,
        h,
        "#00e5ff",
        "#00e5ff",
        true
      );

      const jumpX =
        padding +
        ((0.5 - params.viewport.xMin) /
          (params.viewport.xMax - params.viewport.xMin)) *
          (w - padding * 2);

      ctx.strokeStyle = "rgba(255, 145, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(jumpX, padding);
      ctx.lineTo(jumpX, h - padding);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ff9100";
      ctx.font = "10px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText("跳变点", jumpX, padding - 8);
      ctx.textAlign = "start";
    },
    [signal]
  );

  const drawZoomed = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = {
        xMin: 0.48,
        xMax: 0.52,
        yMin: 0.85,
        yMax: 1.25,
      };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const padding = 40;
      ctx.fillStyle = "#8892b0";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText("t", w - padding - 20, h - padding + 16);

      drawWaveform(
        ctx,
        signal.samples,
        signal.sampleRate,
        params.viewport,
        w,
        h,
        "#00e5ff",
        "#00e5ff",
        true,
        2.5
      );

      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;
      const idealY =
        padding +
        ((params.viewport.yMax - 1.0) /
          (params.viewport.yMax - params.viewport.yMin)) *
          drawHeight;
      ctx.strokeStyle = "rgba(255, 145, 0, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding, idealY);
      ctx.lineTo(w - padding, idealY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff9100";
      ctx.font = "9px JetBrains Mono";
      ctx.fillText("理想值 = 1.0", padding + 4, idealY - 4);

      const samples = signal.samples;
      const sr = signal.sampleRate;
      const jumpIdx = Math.floor(0.5 * sr);
      let peakVal = 0;
      let peakIdx = jumpIdx;
      for (let i = jumpIdx - 15; i <= jumpIdx + 15 && i < samples.length; i++) {
        if (samples[i] > peakVal) {
          peakVal = samples[i];
          peakIdx = i;
        }
      }

      const peakT = peakIdx / sr;
      const { sx, sy } = (() => {
        const dx = w - padding * 2;
        const dy = h - padding * 2;
        return {
          sx:
            padding +
            ((peakT - params.viewport.xMin) /
              (params.viewport.xMax - params.viewport.xMin)) *
              dx,
          sy:
            padding +
            ((params.viewport.yMax - peakVal) /
              (params.viewport.yMax - params.viewport.yMin)) *
              dy,
        };
      })();

      ctx.fillStyle = "#ff4080";
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ff4080";
      ctx.font = "9px JetBrains Mono";
      ctx.fillText(
        `峰值 ${peakVal.toFixed(3)}`,
        sx + 8,
        sy - 4
      );

      const overshoot = peakVal - 1.0;
      const percent = ((overshoot / 1.0) * 100).toFixed(1);
      ctx.fillText(
        `过冲 ${percent}%`,
        sx + 8,
        sy + 14
      );

      const arrowY = (idealY + sy) / 2;
      ctx.strokeStyle = "#ff4080";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(sx + 30, idealY);
      ctx.lineTo(sx + 30, sy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(sx + 26, idealY + 4);
      ctx.lineTo(sx + 30, idealY);
      ctx.lineTo(sx + 34, idealY + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 26, sy - 4);
      ctx.lineTo(sx + 30, sy);
      ctx.lineTo(sx + 34, sy - 4);
      ctx.stroke();
    },
    [signal]
  );

  const gibbsLimit = 8.95;
  const isApproaching = Math.abs(overshootPercent - gibbsLimit) < 1;

  return (
    <div className="min-h-screen bg-lab-bg flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-lab-border bg-lab-surface/50">
        <button
          onClick={() => navigate("/fourier")}
          className="p-2 rounded-lg hover:bg-lab-border/50 transition-colors text-lab-muted hover:text-lab-cyan"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-mono text-lab-amber tracking-wide">
          吉布斯现象
        </h1>
        <span className="text-xs text-lab-muted font-mono ml-2">
          返回傅里叶变换
        </span>
      </header>

      <div className="flex-1 flex flex-col xl:flex-row gap-0">
        <div className="xl:w-96 p-6 border-r border-lab-border bg-lab-surface/30 flex flex-col gap-4 overflow-y-auto">
          <div className="p-4 rounded-lg border border-lab-amber/20 bg-lab-amber/5">
            <div className="text-xs text-lab-amber mb-3 font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-lab-amber animate-pulse" />
              什么是吉布斯现象？
            </div>
            <p className="text-xs text-lab-text leading-relaxed mb-3">
              用有限项傅里叶级数逼近具有跳变的不连续信号（如方波）时，在跳变点附近会出现"过冲"和"波纹"。
              <span className="text-lab-amber font-mono">无论取多少项，过冲幅度始终约为跳变幅度的 9%</span>
              ，不会消失。
            </p>
            <div className="p-3 rounded bg-lab-bg/60 border border-lab-border/50">
              <p className="text-xs text-lab-text leading-relaxed">
                <span className="text-lab-amber font-mono">核心结论</span>：
                增加谐波数量 → 波纹频率变高、宽度变窄 → 但峰值始终约 9% 过冲 →
                在均方意义下收敛，但不是逐点一致收敛。
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-lab-border bg-lab-bg/50">
            <div className="text-xs text-lab-muted mb-3 font-mono uppercase tracking-wider">
              数学解释
            </div>
            <div
              className="text-sm font-mono katex-wrapper mb-3"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(
                  "\\text{过冲} \\approx \\frac{1}{\\pi}\\int_{\\pi}^{\\infty}\\frac{\\sin t}{t}dt \\approx 0.0895",
                  { throwOnError: false }
                ),
              }}
            />
            <p className="text-xs text-lab-text leading-relaxed mb-2">
              这个积分与"正弦积分函数" Si(x) 相关。当谐波数 N → ∞ 时，过冲极限约为跳变幅度的
              <span className="text-lab-amber font-mono"> 8.95%</span>。
            </p>
            <p className="text-xs text-lab-muted leading-relaxed">
              物理含义：傅里叶级数在跳变点的收敛不是"逐点"的（pointwise），而是"均方"的（L²）。
              波形在跳变处的能量需要无穷多谐波才能精确表示，有限项总有残余波纹。
            </p>
          </div>

          <div className="p-4 rounded-lg border border-lab-border bg-lab-bg/50">
            <div className="text-xs text-lab-muted mb-3 font-mono uppercase tracking-wider">
              参数控制
            </div>
            <div className="flex flex-col gap-4">
              <ParamSlider
                label="谐波数量 N"
                value={harmonicCount}
                min={1}
                max={200}
                step={1}
                onChange={(v) => setHarmonicCount(v)}
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-lab-muted">显示模式</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setZoom(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      !zoom
                        ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                        : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
                    }`}
                  >
                    全景
                  </button>
                  <button
                    onClick={() => setZoom(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      zoom
                        ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                        : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
                    }`}
                  >
                    放大跳变点
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-lab-amber/30 bg-lab-amber/5">
            <div className="text-xs text-lab-amber mb-2 font-mono uppercase tracking-wider">
              实时测量
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-mono text-lab-text">
                {overshootPercent}%
              </span>
              <span className="text-xs text-lab-muted">当前过冲</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-mono text-lab-amber">≈ 8.95%</span>
              <span className="text-xs text-lab-muted">理论极限 (N→∞)</span>
            </div>
            {isApproaching && (
              <p className="text-xs text-lab-green mt-2">
                当前过冲已非常接近理论极限 8.95%！
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4 overflow-auto">
          {!zoom ? (
            <div>
              <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
                全貌：N={harmonicCount} 项傅里叶级数逼近 — 橙色虚线标记跳变点
              </div>
              <SignalCanvas draw={drawOverview} height={400} className="w-full" />
            </div>
          ) : (
            <div>
              <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
                放大跳变点：N={harmonicCount} — 粉色标记为峰值，橙色虚线为理想值
              </div>
              <SignalCanvas draw={drawZoomed} height={400} className="w-full" />
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            {[
              { n: 1, desc: "纯正弦波" },
              { n: 3, desc: "轮廓初现" },
              { n: 10, desc: "波纹明显" },
              { n: 100, desc: "接近极限 9%" },
            ].map(({ n, desc }) => (
              <button
                key={n}
                onClick={() => setHarmonicCount(n)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  harmonicCount === n
                    ? "border-lab-amber/50 bg-lab-amber/10"
                    : "border-lab-border bg-lab-bg/30 hover:border-lab-amber/30"
                }`}
              >
                <div className="text-sm font-mono text-lab-amber">N={n}</div>
                <div className="text-xs text-lab-muted mt-1">{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
