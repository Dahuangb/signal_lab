import InlineMath from "@/components/InlineMath";
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
} from "@/renderer/CanvasCore";

export default function PicketFence() {
  const [freq, setFreq] = useState(10.5); // Default to a non-integer frequency
  const [zeroPadding, setZeroPadding] = useState<1 | 2 | 4 | 8>(1);

  const sr = 128;
  const N = 128; // Basic block size
  const paddedN = N * zeroPadding;

  const generateData = useCallback(() => {
    const raw = generateSine(freq, sr, N / sr, 1);
    const windowed = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      windowed[i] = raw.samples[i]; // No windowing for this experiment to focus on zero-padding
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
  }, [freq, zeroPadding, paddedN]);

  const drawTime = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const data = generateData();
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: 1, yMin: -1.5, yMax: 1.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "t", "x(t)", "s", "");

      drawWaveform(
        ctx,
        data.time,
        sr,
        params.viewport,
        w,
        h,
        "#00e5ff",
        "#00e5ff",
        true
      );
      
      const padding = 40;
      ctx.fillStyle = "#00e5ff";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText(`N = ${N} (原始截断长度)`, padding + 4, padding + 14);
      if (zeroPadding > 1) {
        ctx.fillStyle = "#00ff88";
        ctx.fillText(`补零后总长度 = ${paddedN}`, padding + 4, padding + 28);
      }
    },
    [generateData, zeroPadding, paddedN]
  );

  const drawFreq = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const data = generateData();
      const params = defaultRenderParams();
      const maxFreq = 20;
      params.viewport = { xMin: 0, xMax: maxFreq, yMin: 0, yMax: 0.6 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "f", "|X(k)|", "Hz", "");

      drawSpectrum(
        ctx,
        data.mags,
        data.freqs,
        maxFreq,
        w,
        h,
        "#ff9100",
        true
      );

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;
      
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
      ctx.fillText(`真实频率 f=${freq}Hz`, actualX, padding - 8);
      ctx.textAlign = "start";
      
      ctx.fillStyle = "#8892b0";
      ctx.fillText(`频率分辨率 Δf = ${data.resolution} Hz`, padding + 4, padding + 14);
    },
    [generateData, freq]
  );

  const dftKatex = katex.renderToString("X[k] = \\sum_{n=0}^{N-1} x[n]e^{-j\\frac{2\\pi}{N}kn}", { throwOnError: false });
  const zeroPaddingKatex1 = katex.renderToString("x_{zp}[n] = \\begin{cases} x[n], & 0 \\le n < N \\\\ 0, & N \\le n < M \\end{cases}", { throwOnError: false });
  const zeroPaddingKatex2 = katex.renderToString("X_{zp}[k] = \\sum_{n=0}^{M-1} x_{zp}[n] e^{-j\\frac{2\\pi}{M}kn} = \\sum_{n=0}^{N-1} x[n] e^{-j\\frac{2\\pi}{M}kn}", { throwOnError: false });
  const zeroPaddingKatex3 = katex.renderToString("X_{zp}[k] = X(e^{j\\omega}) \\Big|_{\\omega = \\frac{2\\pi k}{M}}", { throwOnError: false });

  return (
    <ModuleLayout
      title="栅栏效应与补零"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              栅栏效应 (Picket-fence Effect)
            </div>
            <p className="text-xs text-lab-text leading-relaxed">
              <strong className="text-lab-cyan">什么是栅栏效应？</strong><br/>
              DFT 只是对连续的 DTFT 频谱在频域上的离散采样（采样间隔 <InlineMath math="\\Delta f = f_s / N" />）。如果信号的真实频率恰好落在两个采样点之间，我们就无法在 DFT 结果中看到真实的峰值，就像透过栅栏看风景被挡住了一样。
            </p>
            <p className="text-xs text-lab-text leading-relaxed mt-2 border-t border-lab-border/50 pt-2">
              <strong className="text-[#00ff88]">如何解决？（补零）</strong><br/>
              在时域信号尾部补零（Zero-padding），增加了 N 的长度，使得 <InlineMath math="\\Delta f" /> 变小。它<span className="text-lab-amber">没有提高真实的物理分辨率</span>（主瓣宽度没变），但它在频域进行了更密集的插值，帮我们“看清”了原本栅栏缝隙间的峰值形状。
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
                min={8}
                max={15}
                step={0.5}
                value={freq}
                onChange={(e) => setFreq(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <button 
                  onClick={() => setFreq(10)} 
                  className="text-[10px] text-lab-muted hover:text-[#00e5ff] border border-lab-border px-2 py-0.5 rounded"
                >
                  设为 10Hz (在栅栏上)
                </button>
                <button 
                  onClick={() => setFreq(10.5)} 
                  className="text-[10px] text-lab-muted hover:text-[#ff9100] border border-lab-border px-2 py-0.5 rounded"
                >
                  设为 10.5Hz (在缝隙里)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-lab-muted">时域末尾补零 (Zero-padding)</span>
              <div className="flex gap-2">
                {([1, 2, 4, 8] as const).map((z) => (
                  <button
                    key={z}
                    onClick={() => setZeroPadding(z)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      zeroPadding === z
                        ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                        : "bg-lab-bg text-lab-muted border border-lab-border hover:border-[#00ff88]/30"
                    }`}
                  >
                    {z}x 长度
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      }
    >
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            时域信号 (原始信号 + 补零)
          </div>
          <SignalCanvas draw={drawTime} height={180} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            频域响应 (DFT结果)
          </div>
          <SignalCanvas draw={drawFreq} height={200} className="w-full" />
        </div>
        <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border text-xs text-lab-muted leading-relaxed">
            {zeroPadding === 1 ? (
              <span className="text-lab-amber">
                【栅栏效应】就像透过栅栏看风景，由于 N={N}，我们只能看到 1Hz 整数倍处的频谱，漏掉了栅栏缝隙间（如10.5Hz）的真实峰值。
              </span>
            ) : (
              <span className="text-[#00ff88]">
                【补零插值】时域补零到 {zeroPadding} 倍长，相当于频域插值。"栅栏"变密了，让我们能看清原本隐藏在缝隙中的真实波峰（如10.5Hz）。注意主瓣宽度并未改变，物理分辨率依然取决于原始长度 N={N}！
              </span>
            )}
        </div>

        {/* 补零推导 */}
        <div className="p-6 rounded-lg bg-lab-surface/30 border border-lab-border mt-2">
          <div className="mb-4 border-b border-lab-border/50 pb-2">
            <strong className="text-[#00ff88] text-sm">数学推导：为什么补零能实现频域插值？</strong>
          </div>
          <p className="text-sm text-lab-muted leading-relaxed mb-2">
            假设原信号长度为 <InlineMath math="N" />，我们在其末尾补零到长度 <InlineMath math="M" /> (<InlineMath math="M &gt; N" />)，得到新序列：
          </p>
          <div className="katex-wrapper text-center my-4 text-[#00ff88] text-lg" dangerouslySetInnerHTML={{ __html: zeroPaddingKatex1 }} />
          <p className="text-sm text-lab-muted leading-relaxed mb-2">
            对补零后的序列做 <InlineMath math="M" /> 点 DFT：
          </p>
          <div className="katex-wrapper text-center my-4 text-lab-cyan text-lg" dangerouslySetInnerHTML={{ __html: zeroPaddingKatex2 }} />
          <p className="text-sm text-lab-muted leading-relaxed mb-2">
            由于大于 <InlineMath math="N" /> 的部分都是 <InlineMath math="0" />，所以求和上限依然是 <InlineMath math="N-1" />。这意味着**信号的物理能量和信息根本没有变**。改变的只是旋转因子中采样的分母变成了 <InlineMath math="M" />：
          </p>
          <div className="katex-wrapper text-center my-4 text-[#ff9100] text-lg" dangerouslySetInnerHTML={{ __html: zeroPaddingKatex3 }} />
          <p className="text-sm text-lab-text leading-relaxed mt-4 border-t border-lab-border/50 pt-4">
            <strong className="text-lab-amber">结论：</strong><br/>
            补零前，我们在连续的 DTFT 频谱 <InlineMath math="X(e^&#123;j\\omega&#125;)" /> 上采了 <InlineMath math="N" /> 个点。<br/>
            补零后，我们在<strong className="text-[#00ff88]">同一个连续频谱</strong>上采了 <InlineMath math="M" /> 个点。它<span className="text-lab-amber">没有提高真实的物理分辨率</span>（主瓣没变窄），但它在频域进行了更密集的插值，帮我们“看清”了原本栅栏缝隙间的真实波形。
          </p>
        </div>
      </div>
    </ModuleLayout>
  );
}
