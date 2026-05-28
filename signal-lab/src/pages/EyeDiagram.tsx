import { useCallback, useState, useEffect } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { drawGrid, drawAxes, drawAxisLabels, defaultRenderParams } from "@/renderer/CanvasCore";
import { generateAWGN } from "@/engine/noise";

export default function EyeDiagram() {
  const [alpha, setAlpha] = useState(0.5); // Roll-off factor
  const [snr, setSnr] = useState(20); // SNR in dB
  const [bandwidthLimit, setBandwidthLimit] = useState(false);

  const [activeDiagram, setActiveDiagram] = useState<'ISI' | 'Nyquist' | 'RollOff' | null>(null);

  const T = 1; // Symbol period
  const oversampling = 32; // Samples per symbol
  const numSymbols = 100; // Number of symbols to simulate

  // Generate raised cosine pulse
  const getRaisedCosine = useCallback((t: number, a: number) => {
    if (t === 0) return 1;
    const pi_t_T = Math.PI * t / T;
    
    // Handle singularity at t = +/- T/(2a)
    if (Math.abs(Math.abs(t) - T / (2 * a)) < 1e-6) {
      return (Math.PI / 4) * Math.sin(Math.PI / (2 * a)) / (Math.PI / (2 * a));
    }

    const num = Math.sin(pi_t_T) * Math.cos(a * pi_t_T);
    const den = pi_t_T * (1 - Math.pow(2 * a * t / T, 2));
    return num / den;
  }, []);

  const generateEyeData = useCallback(() => {
    // Generate random bits: +/- 1
    const bits = Array.from({ length: numSymbols }, () => (Math.random() > 0.5 ? 1 : -1));
    
    const totalSamples = numSymbols * oversampling;
    let signal = new Float64Array(totalSamples);
    
    // Generate pulse shaped signal
    for (let i = 0; i < numSymbols; i++) {
      const bit = bits[i];
      const centerIndex = i * oversampling;
      
      // Convolve with pulse shape (truncate to +/- 4 symbols for performance)
      for (let j = -4 * oversampling; j <= 4 * oversampling; j++) {
        const idx = centerIndex + j;
        if (idx >= 0 && idx < totalSamples) {
          const t = j / oversampling * T;
          
          let pulseVal = 0;
          if (bandwidthLimit) {
            // Simple sinc pulse (alpha = 0)
            pulseVal = getRaisedCosine(t, 0.001);
          } else {
            pulseVal = getRaisedCosine(t, alpha);
          }
          
          signal[idx] += bit * pulseVal;
        }
      }
    }

    // Add noise
    const noisePower = 1 / Math.pow(10, snr / 10);
    const noise = generateAWGN(totalSamples, noisePower);
    for (let i = 0; i < totalSamples; i++) {
      signal[i] += noise[i];
    }

    return signal;
  }, [alpha, snr, bandwidthLimit, getRaisedCosine]);

  const [signal, setSignal] = useState<Float64Array>(new Float64Array());

  useEffect(() => {
    setSignal(generateEyeData());
  }, [generateEyeData]);

  const drawEye = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (signal.length === 0) return;

      const params = defaultRenderParams();
      params.viewport = { xMin: -1, xMax: 1, yMin: -2, yMax: 2 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "时间 (T)", "幅度", "T", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(padding, padding, drawWidth, drawHeight);
      ctx.clip();

      ctx.strokeStyle = "rgba(0, 229, 255, 0.3)";
      ctx.lineWidth = 1;

      // Draw eye diagram (slice signal into 2T chunks)
      const samplesPerChunk = 2 * oversampling;
      // Start a bit late to avoid edge transients
      for (let startIdx = 4 * oversampling; startIdx < signal.length - samplesPerChunk - 4 * oversampling; startIdx += oversampling) {
        ctx.beginPath();
        for (let i = 0; i <= samplesPerChunk; i++) {
          const t = (i / oversampling) - 1; // map 0..2T to -1..1
          const val = signal[startIdx + i];
          
          const x = padding + ((t - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
          const y = padding + drawHeight - ((val - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.restore();
      
      // Draw ideal sampling point
      ctx.strokeStyle = "rgba(255, 145, 0, 0.8)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const zeroX = padding + (0 - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin) * drawWidth;
      ctx.moveTo(zeroX, padding);
      ctx.lineTo(zeroX, padding + drawHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = "#ff9100";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText("最佳判决时刻 (t=0)", zeroX + 10, padding + 20);
    },
    [signal]
  );

  const formulaModel = katex.renderToString("y(t) = \\sum_{k=-\\infty}^{\\infty} a_k p(t-kT) + n(t)", { throwOnError: false });
  const formulaRC = katex.renderToString("p(t) = \\mathrm{sinc}\\left(\\frac{t}{T}\\right) \\frac{\\cos(\\pi \\alpha t / T)}{1 - (2\\alpha t / T)^2}", { throwOnError: false });

  const drawISIDiagram = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const params = defaultRenderParams();
    params.viewport = { xMin: -2.5, xMax: 2.5, yMin: -1.5, yMax: 1.5 };
    drawGrid(ctx, params.viewport, w, h, params);
    drawAxes(ctx, params.viewport, w, h, params);
    drawAxisLabels(ctx, params.viewport, w, h, "时间", "幅度", "T", "");

    const padding = 40;
    const drawWidth = w - padding * 2;
    const drawHeight = h - padding * 2;

    const mapX = (t: number) => padding + ((t - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
    const mapY = (v: number) => padding + drawHeight - ((v - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

    const bits = [{ t: -1, v: 1 }, { t: 0, v: -1 }, { t: 1, v: 1 }];
    const a = 0.3; // use a specific alpha for illustration

    // Draw individual pulses
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    bits.forEach((bit, i) => {
      ctx.strokeStyle = i === 0 ? "#ff9100" : i === 1 ? "#00e5ff" : "#00e676";
      ctx.beginPath();
      for (let t = params.viewport.xMin; t <= params.viewport.xMax; t += 0.05) {
        const val = bit.v * getRaisedCosine(t - bit.t, a);
        if (t === params.viewport.xMin) ctx.moveTo(mapX(t), mapY(val));
        else ctx.lineTo(mapX(t), mapY(val));
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw sum
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = params.viewport.xMin; t <= params.viewport.xMax; t += 0.05) {
      let sum = 0;
      bits.forEach(bit => { sum += bit.v * getRaisedCosine(t - bit.t, a); });
      if (t === params.viewport.xMin) ctx.moveTo(mapX(t), mapY(sum));
      else ctx.lineTo(mapX(t), mapY(sum));
    }
    ctx.stroke();

    // Annotations
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.fillText("总波形 (合成信号)", mapX(0.5), mapY(1.2));
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("当前码元 (t=0)", mapX(-0.8), mapY(-1.2));
  }, [getRaisedCosine]);

  const drawNyquistDiagram = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const params = defaultRenderParams();
    params.viewport = { xMin: -3.5, xMax: 3.5, yMin: -0.5, yMax: 1.2 };
    drawGrid(ctx, params.viewport, w, h, params);
    drawAxes(ctx, params.viewport, w, h, params);
    drawAxisLabels(ctx, params.viewport, w, h, "时间", "幅度", "T", "");

    const padding = 40;
    const drawWidth = w - padding * 2;
    const drawHeight = h - padding * 2;
    const mapX = (t: number) => padding + ((t - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
    const mapY = (v: number) => padding + drawHeight - ((v - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

    const a = 0.5;

    // Adjacent pulses
    const adj = [-1, 1];
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    adj.forEach((offset, idx) => {
      ctx.strokeStyle = idx === 0 ? "rgba(255, 145, 0, 0.8)" : "rgba(188, 0, 255, 0.8)";
      ctx.beginPath();
      for (let t = params.viewport.xMin; t <= params.viewport.xMax; t += 0.05) {
        const val = getRaisedCosine(t - offset, a);
        if (t === params.viewport.xMin) ctx.moveTo(mapX(t), mapY(val));
        else ctx.lineTo(mapX(t), mapY(val));
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Main pulse
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let t = params.viewport.xMin; t <= params.viewport.xMax; t += 0.05) {
      const val = getRaisedCosine(t, a);
      if (t === params.viewport.xMin) ctx.moveTo(mapX(t), mapY(val));
      else ctx.lineTo(mapX(t), mapY(val));
    }
    ctx.stroke();

    // Draw zero crossings
    [-3, -2, -1, 1, 2, 3].forEach(t => {
      ctx.beginPath();
      ctx.arc(mapX(t), mapY(0), 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9100";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      
      // Vertical dashed line
      ctx.beginPath();
      ctx.moveTo(mapX(t), mapY(0));
      ctx.lineTo(mapX(t), mapY(1.2));
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255, 145, 0, 0.3)";
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw t=0 peak
    ctx.beginPath();
    ctx.arc(mapX(0), mapY(1), 6, 0, Math.PI * 2);
    ctx.fillStyle = "#00e676";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    ctx.fillStyle = "#00e676";
    ctx.font = "14px sans-serif";
    ctx.fillText("最佳采样点", mapX(0.2), mapY(1.05));
    
    ctx.fillStyle = "#ff9100";
    ctx.fillText("绝对过零点 (无串扰)", mapX(1.2), mapY(-0.2));
  }, [getRaisedCosine]);

  const drawRollOffDiagram = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const params = defaultRenderParams();
    params.viewport = { xMin: -4, xMax: 4, yMin: -0.5, yMax: 1.2 };
    drawGrid(ctx, params.viewport, w, h, params);
    drawAxes(ctx, params.viewport, w, h, params);
    drawAxisLabels(ctx, params.viewport, w, h, "时间", "幅度", "T", "");

    const padding = 40;
    const drawWidth = w - padding * 2;
    const drawHeight = h - padding * 2;
    const mapX = (t: number) => padding + ((t - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
    const mapY = (v: number) => padding + drawHeight - ((v - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

    const alphas = [
      { a: 0.01, color: "#ff9100", label: "α = 0 (Sinc)" },
      { a: 0.3, color: "#ffd740", label: "α = 0.3" },
      { a: 0.6, color: "#00e5ff", label: "α = 0.6" },
      { a: 1.0, color: "#00e676", label: "α = 1.0" },
    ];
    
    alphas.forEach(({ a, color }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = params.viewport.xMin; t <= params.viewport.xMax; t += 0.05) {
        const val = getRaisedCosine(t, a);
        if (t === params.viewport.xMin) ctx.moveTo(mapX(t), mapY(val));
        else ctx.lineTo(mapX(t), mapY(val));
      }
      ctx.stroke();
    });

    // Legend
    alphas.forEach((item, i) => {
      ctx.fillStyle = item.color;
      ctx.font = "12px sans-serif";
      ctx.fillText(item.label, mapX(2.0), mapY(1.0 - i * 0.15));
    });
  }, [getRaisedCosine]);

  const insight = (() => {
    if (bandwidthLimit) {
      return "【码间串扰 (ISI)】当系统带宽严重受限（相当于矩形滤波），脉冲展宽，导致相邻码元相互重叠。眼图完全闭合，接收端无法正确判决 1 还是 0。";
    }
    if (snr < 10) {
      return "【噪声影响】信噪比过低，随机噪声使得迹线变得非常模糊，\"眼线\"变粗，眼睛张开度减小，误码率急剧上升。";
    }
    if (alpha < 0.2) {
      return "【滚降系数极小】脉冲在时域衰减很慢，如果采样时刻有轻微的抖动（Timing Jitter），就会引入严重的码间串扰。眼图的\"眼皮\"很厚。";
    }
    return "【理想眼图】\"眼睛\"张得越大，表示抗噪声和抗定时抖动的能力越强。最佳采样点在眼睛张开最大的时刻（t=0）。";
  })();

  return (
    <ModuleLayout
      title="眼图与码间串扰 (ISI)"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              什么是眼图？
            </div>
            <p className="text-xs text-lab-text leading-relaxed">
              将接收到的连续波形，按照<strong className="text-lab-cyan">符号周期 (T)</strong>进行分段切片，并叠加显示在示波器上。因形状像眼睛而得名。
              <br/><br/>
              眼图是直观评估数字通信系统信号质量（ISI 与噪声影响）的最佳工具。
            </p>
          </div>
        </div>
      }
      controls={
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs text-lab-muted">滚降系数 (Roll-off α)</span>
                <span className="text-xs text-[#00e5ff] font-mono">{alpha.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={alpha}
                onChange={(e) => {
                  setAlpha(Number(e.target.value));
                  setBandwidthLimit(false);
                }}
                disabled={bandwidthLimit}
                className={`accent-lab-cyan ${bandwidthLimit ? 'opacity-50' : ''}`}
              />
              <p className="text-[10px] text-lab-muted/70 mt-1">
                α 越大，频域带宽越宽，但时域衰减越快（抗抖动能力强）。
              </p>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <div className="flex justify-between">
                <span className="text-xs text-lab-muted">信噪比 (SNR)</span>
                <span className="text-xs text-[#ff9100] font-mono">{snr} dB</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={snr}
                onChange={(e) => setSnr(Number(e.target.value))}
                className="accent-[#ff9100]"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-lab-border">
              <button
                onClick={() => setBandwidthLimit(!bandwidthLimit)}
                className={`w-full py-2 rounded-lg text-xs font-mono transition-all ${
                  bandwidthLimit
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-red-500/30"
                }`}
              >
                {bandwidthLimit ? "解除带宽限制" : "模拟信道严重带宽受限"}
              </button>
            </div>
            
            <button
              onClick={() => setSignal(generateEyeData())}
              className="w-full py-2 rounded-lg text-xs font-mono bg-lab-cyan/10 text-lab-cyan border border-lab-cyan/30 hover:bg-lab-cyan/20 transition-all mt-2"
            >
              重新生成随机序列
            </button>
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col w-full h-full relative overflow-y-auto">
        {/* Top Section: Formulas and 3 Cards */}
        <div className="w-full max-w-5xl mx-auto p-4 shrink-0 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row justify-center items-center gap-6 bg-lab-surface/30 p-4 rounded-lg border border-lab-border">
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-lab-muted mb-2 uppercase">1. 接收信号模型</div>
              <div dangerouslySetInnerHTML={{ __html: formulaModel }} className="katex-wrapper text-sm" />
            </div>
            <div className="hidden xl:block w-px h-12 bg-lab-border"></div>
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-lab-muted mb-2 uppercase">2. 升余弦滚降成型脉冲 p(t)</div>
              <div dangerouslySetInnerHTML={{ __html: formulaRC }} className="katex-wrapper text-sm" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-lab-surface/20 border border-lab-border flex flex-col items-center text-center">
              <h4 className="text-sm font-mono text-[#00e5ff] mb-2">1. 码间串扰 (ISI)</h4>
              <p className="text-xs text-lab-muted flex-1">脉冲拖尾叠加到当前码元判决时刻造成的幅度干扰。</p>
              <button onClick={() => setActiveDiagram('ISI')} className="mt-3 text-xs text-[#00e5ff] hover:text-white underline opacity-80">[查看图解]</button>
            </div>
            <div className="p-4 rounded-lg bg-lab-surface/20 border border-lab-border flex flex-col items-center text-center">
              <h4 className="text-sm font-mono text-lab-green mb-2">2. 最佳判决 (t=0)</h4>
              <p className="text-xs text-lab-muted flex-1">t=0 时，其他码元的波形幅度绝对过零，无串扰。</p>
              <button onClick={() => setActiveDiagram('Nyquist')} className="mt-3 text-xs text-lab-green hover:text-white underline opacity-80">[查看图解]</button>
            </div>
            <div className="p-4 rounded-lg bg-lab-surface/20 border border-lab-border flex flex-col items-center text-center">
              <h4 className="text-sm font-mono text-[#ff9100] mb-2">3. 滚降系数 (α)</h4>
              <p className="text-xs text-lab-muted flex-1">决定频带与拖尾权衡。α越大拖尾越短，但越耗带宽。</p>
              <button onClick={() => setActiveDiagram('RollOff')} className="mt-3 text-xs text-[#ff9100] hover:text-white underline opacity-80">[查看图解]</button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Canvas */}
        <div className="flex-1 w-full min-h-0 flex flex-col justify-center items-center pb-6">
          <SignalCanvas draw={drawEye} height={380} className="w-full max-w-2xl" />
          
          <div className="w-full max-w-2xl grid grid-cols-3 gap-4 mt-6">
            <div className="p-3 bg-lab-surface/30 rounded border border-lab-border">
              <div className="text-[10px] text-lab-muted mb-1">纵向眼开度</div>
              <div className="text-sm font-mono text-lab-text">反映抗噪能力</div>
            </div>
            <div className="p-3 bg-lab-surface/30 rounded border border-lab-border">
              <div className="text-[10px] text-lab-muted mb-1">横向眼开度</div>
              <div className="text-sm font-mono text-lab-text">反映抗抖动能力</div>
            </div>
            <div className="p-3 bg-lab-surface/30 rounded border border-lab-border">
              <div className="text-[10px] text-lab-muted mb-1">迹线宽度</div>
              <div className="text-sm font-mono text-lab-text">受噪声和 ISI 影响</div>
            </div>
          </div>
        </div>
      </div>

      {activeDiagram && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-lab-bg/80 backdrop-blur-sm p-4 sm:p-8">
          <div className="w-full max-w-4xl bg-lab-surface border border-lab-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-lab-border bg-lab-surface/50">
              <h3 className="text-sm font-mono text-white">
                {activeDiagram === 'ISI' ? '图解：码间串扰 (ISI) 的形成' :
                 activeDiagram === 'Nyquist' ? '图解：奈奎斯特绝对过零点' :
                 '图解：不同 α 下的脉冲拖尾对比'}
              </h3>
              <button 
                onClick={() => setActiveDiagram(null)}
                className="text-lab-muted hover:text-white transition-colors text-xs font-mono px-3 py-1 border border-lab-border rounded hover:bg-lab-border/50"
              >
                关闭 (Esc)
              </button>
            </div>
            <div className="p-6 bg-lab-bg flex-1 flex flex-col items-center">
              <SignalCanvas 
                draw={
                  activeDiagram === 'ISI' ? drawISIDiagram :
                  activeDiagram === 'Nyquist' ? drawNyquistDiagram :
                  drawRollOffDiagram
                } 
                height={400} 
                className="w-full max-w-3xl" 
              />
              <div className="mt-4 text-xs text-lab-muted max-w-2xl text-center leading-relaxed">
                {activeDiagram === 'ISI' && "如图所示，由于系统带宽受限，每个符号的脉冲（虚线）都会在时间上向两侧延伸（拖尾）。当连续发送多个符号时，这些拖尾会相互叠加，导致在判决时刻的波形幅度偏离理想值。这就是码间串扰 (ISI)。"}
                {activeDiagram === 'Nyquist' && "奈奎斯特第一准则：为了实现无码间串扰，脉冲必须在所有非零的整数倍周期处幅度为 0。图中青色为主码元，橙色/紫色虚线为相邻码元。您可以清晰地看到，在最佳采样点 (t=0) 处，所有相邻码元的波形正好全部经过 0 点！因此合成信号在这一瞬间完全没有 ISI 干扰。"}
                {activeDiagram === 'RollOff' && "升余弦滚降滤波器公式如屏幕上方所示。滚降系数 α 决定了带宽与时域拖尾的权衡：α 越小（偏橙色），频带利用率越高，但时域拖尾振荡极长，对采样时钟抖动极度敏感；α 越大（偏绿色），拖尾迅速衰减，系统抗干扰能力更强，但需要更多的频谱资源。"}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}