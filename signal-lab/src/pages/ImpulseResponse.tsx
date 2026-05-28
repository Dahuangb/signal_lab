import { useCallback, useEffect, useMemo, useState } from "react";
import katex from "katex";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import {
  drawGrid,
  drawAxes,
  drawAxisLabels,
  drawStem,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

type InputType = "step" | "pulse" | "ramp";
type SystemType = "exponential" | "oscillation" | "moving_average";

const INPUT_LENGTH = 20;
const SYSTEM_LENGTH = 20;
const TOTAL_LENGTH = 40;

export default function ImpulseResponse() {
  const navigate = useNavigate();
  const [inputType, setInputType] = useState<InputType>("pulse");
  const [systemType, setSystemType] = useState<SystemType>("exponential");
  const [timeIndex, setTimeIndex] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate x[n]
  const x = useMemo(() => {
    const data = [];
    for (let n = 0; n < TOTAL_LENGTH; n++) {
      let val = 0;
      if (inputType === "step") {
        val = n >= 5 && n < 15 ? 1 : 0;
      } else if (inputType === "pulse") {
        val = n === 5 ? 1 : 0;
      } else if (inputType === "ramp") {
        val = n >= 5 && n < 15 ? (n - 5) / 10 : 0;
      }
      data.push({ n, val });
    }
    return data;
  }, [inputType]);

  // Generate h[n]
  const h = useMemo(() => {
    const data = [];
    for (let n = 0; n < SYSTEM_LENGTH; n++) {
      let val = 0;
      if (systemType === "exponential") {
        val = Math.pow(0.8, n);
      } else if (systemType === "oscillation") {
        val = Math.pow(0.9, n) * Math.cos(0.5 * Math.PI * n);
      } else if (systemType === "moving_average") {
        val = n < 5 ? 0.3 : 0;
      }
      data.push(val);
    }
    return data;
  }, [systemType]);

  // Compute total output y[n] and current accumulated output up to timeIndex
  const { totalY, currentY, tails } = useMemo(() => {
    const totalY = Array(TOTAL_LENGTH).fill(0);
    const currentY = Array(TOTAL_LENGTH).fill(0);
    const tails: { n: number; val: number }[][] = [];

    for (let k = 0; k < TOTAL_LENGTH; k++) {
      const x_k = x[k].val;
      const tail = [];
      for (let n = 0; n < TOTAL_LENGTH; n++) {
        let val = 0;
        if (n >= k && n - k < SYSTEM_LENGTH) {
          val = x_k * h[n - k];
        }
        tail.push({ n, val });
        totalY[n] += val;
        if (k <= timeIndex) {
          currentY[n] += val;
        }
      }
      tails.push(tail);
    }

    return {
      totalY: totalY.map((val, n) => ({ n, val })),
      currentY: currentY.map((val, n) => ({ n, val })),
      tails,
    };
  }, [x, h, timeIndex]);

  useEffect(() => {
    let timer: number;
    if (isPlaying) {
      timer = window.setInterval(() => {
        setTimeIndex((prev) => {
          if (prev >= 25) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const drawInput = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: -2, xMax: 30, yMin: -0.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "n", "x[n]", "", "");

      drawStem(ctx, x, params.viewport, w, h, "#00e5ff", "#00e5ff", true, 2, 3, new Set([timeIndex]));
    },
    [x, timeIndex]
  );

  const drawDecomposition = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: -2, xMax: 30, yMin: -1.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "n", "x[k]h[n-k]", "", "");

      // Draw all tails up to timeIndex
      for (let k = 0; k <= timeIndex; k++) {
        if (x[k].val === 0) continue;
        const isCurrent = k === timeIndex;
        const color = isCurrent ? "#ff9100" : "rgba(255, 145, 0, 0.3)";
        drawStem(ctx, tails[k], params.viewport, w, h, color, color, isCurrent, 2, 2);
      }
    },
    [tails, timeIndex, x]
  );

  const drawOutput = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: -2, xMax: 30, yMin: -2, yMax: 3.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "n", "y[n]", "", "");

      // Draw the total future y in faded color
      drawStem(ctx, totalY, params.viewport, w, h, "rgba(51, 204, 102, 0.4)", "rgba(51, 204, 102, 0.4)", false, 2, 3);
      // Draw accumulated current y
      drawStem(ctx, currentY, params.viewport, w, h, "#33cc66", "#33cc66", true, 2, 3);
    },
    [totalY, currentY]
  );

  return (
    <div className="min-h-screen bg-lab-bg flex flex-col">
      <header className="flex-none p-4 border-b border-lab-border bg-lab-bg/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-lab-border text-lab-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-mono font-bold text-lab-text">
              LTI 系统与冲激响应
            </h1>
            <p className="text-xs text-lab-muted">
              LTI Systems & Impulse Response
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-lab-bg/50 border border-lab-border rounded-xl p-4 relative min-h-[200px]">
            <div className="absolute top-4 left-4 z-10 text-xs font-mono text-lab-cyan bg-lab-bg/80 px-2 py-1 rounded">
              输入信号 x[n]
            </div>
            <SignalCanvas draw={drawInput} className="w-full h-full" />
          </div>
          <div className="bg-lab-bg/50 border border-lab-border rounded-xl p-4 relative min-h-[200px]">
            <div className="absolute top-4 left-4 z-10 text-xs font-mono text-lab-amber bg-lab-bg/80 px-2 py-1 rounded">
              冲激分解与缩放平移 x[k]h[n-k]
            </div>
            <SignalCanvas draw={drawDecomposition} className="w-full h-full" />
          </div>
          <div className="bg-lab-bg/50 border border-lab-border rounded-xl p-4 relative min-h-[200px]">
            <div className="absolute top-4 left-4 z-10 text-xs font-mono text-lab-green bg-lab-bg/80 px-2 py-1 rounded">
              累加输出 y[n] = Σ x[k]h[n-k]
            </div>
            <SignalCanvas draw={drawOutput} className="w-full h-full" />
          </div>
        </div>

        <div className="w-full lg:w-80 flex-none flex flex-col gap-6">
          <div className="p-5 rounded-xl border border-lab-border bg-lab-bg/50">
            <h3 className="text-sm font-mono text-lab-text mb-4">原理解析</h3>
            <div
              className="text-sm font-mono katex-wrapper mb-4"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(
                  "x[n] = \\sum_{k=-\\infty}^{\\infty} x[k]\\delta[n-k]",
                  { throwOnError: false, displayMode: true }
                ),
              }}
            />
            <p className="text-xs text-lab-muted mb-4 leading-relaxed">
              任何离散信号都可以看作是无数个加权延迟的冲激信号的叠加。
            </p>
            <div
              className="text-sm font-mono katex-wrapper mb-4"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(
                  "y[n] = \\sum_{k=-\\infty}^{\\infty} x[k]h[n-k]",
                  { throwOnError: false, displayMode: true }
                ),
              }}
            />
            <p className="text-xs text-lab-muted leading-relaxed">
              根据线性时不变(LTI)系统的特性，系统对输入的响应，等于系统对每一个分解出的冲激信号的响应之和。这就是离散卷积的物理本质！
            </p>
          </div>

          <div className="p-5 rounded-xl border border-lab-border bg-lab-bg/50">
            <h3 className="text-sm font-mono text-lab-text mb-4">参数控制</h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-lab-muted mb-2 block">输入信号 x[n]</span>
                <div className="flex gap-2">
                  {(["pulse", "step", "ramp"] as InputType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setInputType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        inputType === t
                          ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                          : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
                      }`}
                    >
                      {t === "pulse" ? "单脉冲" : t === "step" ? "矩形窗" : "斜坡"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-lab-muted mb-2 block">系统冲激响应 h[n]</span>
                <div className="flex gap-2">
                  {(["exponential", "oscillation", "moving_average"] as SystemType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSystemType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        systemType === t
                          ? "bg-lab-amber/20 text-lab-amber border border-lab-amber/40"
                          : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-amber/30"
                      }`}
                    >
                      {t === "exponential" ? "指数衰减" : t === "oscillation" ? "振荡" : "移动平均"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-lab-border">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-mono text-lab-text">当前时刻: k = {timeIndex}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsPlaying(!isPlaying);
                        if (timeIndex >= 25) setTimeIndex(0);
                      }}
                      className="p-1.5 rounded-lg border border-lab-border hover:bg-lab-border text-lab-text transition-colors"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setTimeIndex(0);
                      }}
                      className="p-1.5 rounded-lg border border-lab-border hover:bg-lab-border text-lab-text transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
                <ParamSlider
                  label="推进时间 k"
                  value={timeIndex}
                  min={0}
                  max={25}
                  step={1}
                  onChange={(v) => {
                    setTimeIndex(v);
                    setIsPlaying(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}