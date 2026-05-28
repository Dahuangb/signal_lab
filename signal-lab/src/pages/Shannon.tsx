import { useCallback, useState } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { drawGrid, drawAxes, drawAxisLabels, defaultRenderParams } from "@/renderer/CanvasCore";

export default function Shannon() {
  const [bandwidth, setBandwidth] = useState(20); // kHz
  const [s_n0, setSN0] = useState(50); // S/N0 in kHz (to match bandwidth units)

  const [activeDiagram, setActiveDiagram] = useState<'Derivation' | 'Tradeoff' | null>(null);

  // Capacity formula: C = B * log2(1 + (S/N0) / B)
  const currentCapacity = bandwidth * Math.log2(1 + s_n0 / bandwidth);
  const limitCapacity = s_n0 / Math.LN2; // 1.44 * S/N0

  const drawCapacityCurve = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      // X-axis: Bandwidth (0 to 100)
      // Y-axis: Capacity (0 to limitCapacity * 1.2)
      params.viewport = { xMin: 0, xMax: 100, yMin: 0, yMax: 150 }; // Fixed max S/N0 limit is ~144 for S/N0=100
      
      // Adjust yMax dynamically based on max possible limit
      params.viewport.yMax = 100 / Math.LN2 * 1.1; // max S/N0 is 100

      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "带宽 B (kHz)", "信道容量 C (kbps)", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const mapX = (val: number) => padding + ((val - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
      const mapY = (val: number) => padding + drawHeight - ((val - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

      ctx.save();
      ctx.beginPath();
      ctx.rect(padding, padding, drawWidth, drawHeight);
      ctx.clip();

      // Draw asymptotic limit line
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(limitCapacity));
      ctx.lineTo(mapX(100), mapY(limitCapacity));
      ctx.strokeStyle = "rgba(255, 145, 0, 0.8)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Capacity Curve
      ctx.beginPath();
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 3;
      for (let b = 0.1; b <= 100; b += 0.5) {
        const c = b * Math.log2(1 + s_n0 / b);
        if (b === 0.1) ctx.moveTo(mapX(b), mapY(c));
        else ctx.lineTo(mapX(b), mapY(c));
      }
      ctx.stroke();

      // Draw area under curve up to current bandwidth
      ctx.beginPath();
      ctx.moveTo(mapX(0.1), mapY(0));
      for (let b = 0.1; b <= bandwidth; b += 0.5) {
        const c = b * Math.log2(1 + s_n0 / b);
        ctx.lineTo(mapX(b), mapY(c));
      }
      ctx.lineTo(mapX(bandwidth), mapY(0));
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, padding, 0, padding + drawHeight);
      gradient.addColorStop(0, "rgba(0, 229, 255, 0.4)");
      gradient.addColorStop(1, "rgba(0, 229, 255, 0.05)");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw current point
      const curX = mapX(bandwidth);
      const curY = mapY(currentCapacity);
      ctx.beginPath();
      ctx.arc(curX, curY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#00e5ff";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Annotations
      ctx.fillStyle = "#fff";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText(`C = ${currentCapacity.toFixed(1)} kbps`, curX + 10, curY - 10);
      
      ctx.fillStyle = "#ff9100";
      ctx.fillText(`极限容量: ${(limitCapacity).toFixed(1)} kbps`, mapX(50), mapY(limitCapacity) - 10);

      ctx.restore();
    },
    [bandwidth, s_n0, currentCapacity, limitCapacity]
  );

  const formulaShannon = katex.renderToString("C = B \\log_2\\left(1 + \\frac{S}{N_0 B}\\right)", { throwOnError: false });
  const formulaLimit = katex.renderToString("\\lim_{B \\to \\infty} C = 1.44 \\frac{S}{N_0}", { throwOnError: false });

  const insight = "【香农容量极限】在给定信号功率 S 和噪声功率谱密度 N₀ 的情况下，无限制地增加带宽 B 并不能使信道容量无限增大。这是因为增加带宽的同时，也引入了更多的噪声（N = N₀B）。最终容量会趋于一个极限值：1.44 S/N₀。";

  return (
    <ModuleLayout
      title="香农信道容量极限 (Shannon Capacity)"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              什么是香农公式？
            </div>
            <p className="text-xs text-lab-text leading-relaxed">
              香农公式给出了在受到高斯白噪声干扰的信道中，实现无差错传输的<strong className="text-lab-cyan">最大信息速率 (信道容量 C)</strong>。它揭示了带宽 (B) 和信噪比 (S/N) 之间可以相互交换的深刻物理内涵。
            </p>
          </div>
        </div>
      }
      controls={
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs text-lab-muted">系统带宽 B (kHz)</span>
                <span className="text-xs text-[#00e5ff] font-mono">{bandwidth.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={bandwidth}
                onChange={(e) => setBandwidth(Number(e.target.value))}
                className="accent-lab-cyan"
              />
              <p className="text-[10px] text-lab-muted/70 mt-1">
                增加带宽可以提升容量，但效果会逐渐变弱（边际效益递减）。
              </p>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <div className="flex justify-between">
                <span className="text-xs text-lab-muted">信号与噪声功率谱密度比 (S/N₀)</span>
                <span className="text-xs text-[#ff9100] font-mono">{s_n0.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={s_n0}
                onChange={(e) => setSN0(Number(e.target.value))}
                className="accent-[#ff9100]"
              />
              <p className="text-[10px] text-lab-muted/70 mt-1">
                决定了系统的绝对容量上限（图中橙色虚线）。
              </p>
            </div>
            
            <div className="mt-4 p-3 bg-lab-bg rounded border border-lab-border flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-lab-muted">当前信道容量 C:</span>
                <span className="text-sm font-mono text-lab-cyan font-bold">{currentCapacity.toFixed(2)} kbps</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-lab-muted">当前带内信噪比 (SNR):</span>
                <span className="text-xs font-mono text-lab-text">{(10 * Math.log10(s_n0 / bandwidth)).toFixed(2)} dB</span>
              </div>
            </div>
          </div>
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col w-full h-full relative overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto p-4 shrink-0 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row justify-center items-center gap-6 bg-lab-surface/30 p-4 rounded-lg border border-lab-border">
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-lab-muted mb-2 uppercase">1. 香农-哈特利定理</div>
              <div dangerouslySetInnerHTML={{ __html: formulaShannon }} className="katex-wrapper text-sm" />
            </div>
            <div className="hidden xl:block w-px h-12 bg-lab-border"></div>
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-lab-muted mb-2 uppercase">2. 极限容量 (当带宽趋于无穷大)</div>
              <div dangerouslySetInnerHTML={{ __html: formulaLimit }} className="katex-wrapper text-sm" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-lab-surface/20 border border-lab-border flex flex-col items-center text-center">
              <h4 className="text-sm font-mono text-[#00e5ff] mb-2">香农公式是怎么来的？</h4>
              <p className="text-xs text-lab-muted flex-1">结合奈奎斯特采样率（2B）与每个采样点能携带的信息量得出。直观推导请看图解。</p>
              <button onClick={() => setActiveDiagram('Derivation')} className="mt-3 text-xs text-[#00e5ff] hover:text-white underline opacity-80">[查看图解]</button>
            </div>
            <div className="p-4 rounded-lg bg-lab-surface/20 border border-lab-border flex flex-col items-center text-center">
              <h4 className="text-sm font-mono text-[#ff9100] mb-2">带宽与信噪比的权衡</h4>
              <p className="text-xs text-lab-muted flex-1">在低信噪比下，增加带宽很有效；但在高带宽区，由于噪声功率 N₀B 同步增加，容量提升趋于平缓。</p>
              <button onClick={() => setActiveDiagram('Tradeoff')} className="mt-3 text-xs text-[#ff9100] hover:text-white underline opacity-80">[查看图解]</button>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0 flex flex-col justify-center items-center pb-6">
          <SignalCanvas draw={drawCapacityCurve} height={380} className="w-full max-w-2xl" />
        </div>
      </div>

      {activeDiagram && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-lab-bg/80 backdrop-blur-sm p-4 sm:p-8">
          <div className="w-full max-w-3xl bg-lab-surface border border-lab-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-lab-border bg-lab-surface/50">
              <h3 className="text-sm font-mono text-white">
                {activeDiagram === 'Derivation' ? '香农公式的物理起源推导' : '工程权衡：用带宽换信噪比'}
              </h3>
              <button 
                onClick={() => setActiveDiagram(null)}
                className="text-lab-muted hover:text-white transition-colors text-xs font-mono px-3 py-1 border border-lab-border rounded hover:bg-lab-border/50"
              >
                关闭 (Esc)
              </button>
            </div>
            <div className="p-6 bg-lab-bg flex-1 overflow-y-auto">
              {activeDiagram === 'Derivation' && (
                <div className="text-sm text-lab-text space-y-4 leading-relaxed">
                  <p>很多人觉得香农公式 <span className="font-mono text-lab-cyan">C = B log₂(1 + S/N)</span> 像是凭空掉下来的，其实它的物理起源非常直观，主要由两部分结合而成：</p>
                  
                  <div className="p-4 bg-lab-surface/30 border border-lab-border rounded-lg">
                    <h4 className="text-[#00e5ff] font-bold mb-2">步骤 1：每秒能传多少个“符号”？（奈奎斯特定理）</h4>
                    <p className="text-xs text-lab-muted">
                      奈奎斯特指出，带宽为 B 的信道，每秒最多只能传输 <strong>2B</strong> 个独立符号（也就是每 1/(2B) 秒采样一次，不会产生码间串扰）。
                    </p>
                  </div>

                  <div className="p-4 bg-lab-surface/30 border border-lab-border rounded-lg">
                    <h4 className="text-lab-green font-bold mb-2">步骤 2：每个“符号”能携带多少信息？</h4>
                    <p className="text-xs text-lab-muted mb-2">
                      在接收端，接收到的信号由“有效信号 + 噪声”组成。接收信号的平均功率是 <span className="font-mono">S + N</span>。信号的幅度正比于功率的平方根，即 <span className="font-mono">√(S + N)</span>。
                    </p>
                    <p className="text-xs text-lab-muted">
                      由于噪声的幅度方差是 <span className="font-mono">√N</span>，接收端为了能可靠地区分不同的信号电平，两个电平之间的最小距离必须大约是噪声幅度 <span className="font-mono">√N</span> 的量级。因此，我们能可靠区分的“电平阶数”大约是：<br/>
                      <span className="font-mono text-white block mt-2 text-center">M = √(S + N) / √N = √(1 + S/N)</span>
                    </p>
                    <p className="text-xs text-lab-muted mt-2">
                      有 M 个电平，每个符号携带的信息量（比特数）就是 <span className="font-mono">log₂(M)</span>：<br/>
                      <span className="font-mono text-white block mt-2 text-center">log₂[ √(1 + S/N) ] = 1/2 * log₂(1 + S/N)</span>
                    </p>
                  </div>

                  <div className="p-4 bg-lab-surface/30 border border-[#ff9100]/30 rounded-lg">
                    <h4 className="text-[#ff9100] font-bold mb-2">步骤 3：合体！</h4>
                    <p className="text-xs text-lab-muted">
                      总容量 = (每秒符号数) × (每个符号的信息量)<br/>
                      <span className="font-mono text-white block mt-2 text-center text-lg">C = 2B × [ 1/2 * log₂(1 + S/N) ] = B log₂(1 + S/N)</span>
                    </p>
                    <p className="text-xs mt-2">这就是伟大的香农-哈特利定理的直观物理图景！</p>
                  </div>
                </div>
              )}

              {activeDiagram === 'Tradeoff' && (
                <div className="text-sm text-lab-text space-y-4 leading-relaxed">
                  <p>香农公式揭示了通信工程中最重要的一项权衡：<strong>“用带宽换取信噪比”</strong> 或者 <strong>“用信噪比换取带宽”</strong>。</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-lab-surface/30 border border-lab-border rounded-lg">
                      <h4 className="text-lab-green font-bold mb-2">场景 A：深空通信 (如旅行者号)</h4>
                      <p className="text-xs text-lab-muted">
                        探测器距离地球极远，传回来的信号极度微弱（<strong className="text-white">S 极小，S/N 远小于 1</strong>）。
                      </p>
                      <p className="text-xs text-lab-muted mt-2">
                        为了能把数据传回来，工程师不得不使用<strong>极大的带宽 B</strong>，配合极其复杂的纠错编码。即便如此，容量 C 依然很低（可能只有几十 bps）。这就是典型的“用带宽换信噪比”。
                      </p>
                    </div>

                    <div className="p-4 bg-lab-surface/30 border border-lab-border rounded-lg">
                      <h4 className="text-[#00e5ff] font-bold mb-2">场景 B：光纤通信 / 千兆宽带</h4>
                      <p className="text-xs text-lab-muted">
                        光纤内部环境极好，信号衰减小且几乎没有外部干扰（<strong className="text-white">S/N 极大</strong>）。
                      </p>
                      <p className="text-xs text-lab-muted mt-2">
                        由于 S/N 很高，即便带宽 B 是固定的，信道容量 C 也可以非常大。我们可以采用 256-QAM 甚至 1024-QAM 这样的高阶调制，在一个符号里塞入大量的比特。这是典型的“高信噪比带来高频谱效率”。
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-lab-surface/30 border border-[#ff9100]/30 rounded-lg mt-4">
                    <h4 className="text-[#ff9100] font-bold mb-2">为什么增加带宽会遭遇“天花板”？</h4>
                    <p className="text-xs text-lab-muted">
                      您在主界面的曲线上可以看到，当带宽 B 增加到一定程度后，曲线变得平缓。
                      因为热噪声分布在所有频率上，它的功率是 <span className="font-mono">N = N₀ × B</span>。
                      <br/><br/>
                      当您一味地增加接收机的带宽时，进入接收机的噪声功率也在同步增加！当带宽趋向于无穷大时，带内信噪比 S/N 会趋向于 0，最终数学极限告诉我们，容量将被锁定在 <span className="font-mono text-white">1.44 S/N₀</span> 的上限。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}