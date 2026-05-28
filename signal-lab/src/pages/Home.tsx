import { useNavigate } from "react-router-dom";
import { Activity, Radio, Sigma, ArrowRight, Waves, Eye, Filter, Crosshair, Target, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

const courseCategories = [
  {
    title: "信号与系统 (Signals and Systems)",
    description: "连续时间域的核心理论：从时域到频域的桥梁，系统响应的基础。",
    modules: [
      {
        id: "fourier",
        title: "傅里叶级数与变换",
        question: "为什么频谱是\"匹配度\"的度量？",
        formula: "F(\\omega) = \\int f(t) e^{-j\\omega t} dt",
        icon: Activity,
        gradient: "from-lab-cyan/20 to-lab-cyan/5",
        border: "border-lab-cyan/30",
        hover: "hover:border-lab-cyan/60",
      },
      {
        id: "transforms",
        title: "三大变换的统一 (FT/LT/ZT)",
        question: "拉普拉斯和Z变换有什么联系？",
        formula: "z = e^{sT_s}",
        icon: Target,
        gradient: "from-yellow-500/20 to-yellow-500/5",
        border: "border-yellow-500/30",
        hover: "hover:border-yellow-500/60",
      },
      {
        id: "convolution",
        title: "连续时间卷积",
        question: "为什么是\"翻转→滑动→乘积累加\"？",
        formula: "y(t) = \\int x(\\tau)h(t-\\tau)d\\tau",
        icon: Waves,
        gradient: "from-purple-500/20 to-purple-500/5",
        border: "border-purple-500/30",
        hover: "hover:border-purple-500/60",
      },
      {
        id: "impulse-response",
        title: "LTI系统与冲激响应",
        question: "系统如何把信号\"切碎\"再叠加？",
        formula: "y[n] = \\sum x[k]h[n-k]",
        icon: Activity,
        gradient: "from-rose-500/20 to-rose-500/5",
        border: "border-rose-500/30",
        hover: "hover:border-rose-500/60",
      },
      {
        id: "polezero",
        title: "零极点与频率响应",
        question: "极点和零点如何塑造频谱？",
        formula: "H(z) = \\frac{\\prod (z-z_k)}{\\prod (z-p_k)}",
        icon: Target,
        gradient: "from-blue-500/20 to-blue-500/5",
        border: "border-blue-500/30",
        hover: "hover:border-blue-500/60",
      },
    ]
  },
  {
    title: "数字信号处理 (Digital Signal Processing)",
    description: "计算机如何处理信号：离散化、频域混叠、以及滤波器的设计。",
    modules: [
      {
        id: "sampling",
        title: "采样定理 (Nyquist)",
        question: "为什么必须 f_s ≥ 2f_max？",
        formula: "x[n] = x(nT_s)",
        icon: Sigma,
        gradient: "from-lab-amber/20 to-lab-amber/5",
        border: "border-lab-amber/30",
        hover: "hover:border-lab-amber/60",
      },
      {
        id: "dsp",
        title: "频谱泄漏与加窗",
        question: "真实频率不在 bin 上会怎样？",
        formula: "x(t) \\cdot w(t) \\xrightarrow{\\mathcal{F}} X(f) * W(f)",
        icon: Activity,
        gradient: "from-emerald-500/20 to-emerald-500/5",
        border: "border-emerald-500/30",
        hover: "hover:border-emerald-500/60",
      },
      {
        id: "picket-fence",
        title: "栅栏效应与补零",
        question: "如何看清栅栏缝隙间的频谱？",
        formula: "x[n] \\xrightarrow{\\text{Zero-padding}} \\text{Interpolation}",
        icon: Sigma,
        gradient: "from-lime-500/20 to-lime-500/5",
        border: "border-lime-500/30",
        hover: "hover:border-lime-500/60",
      },
      {
        id: "discrete-transforms",
        title: "DFT vs DTFT vs FFT",
        question: "这三个“FT”到底有什么区别？",
        formula: "X[k] = \\sum_{n=0}^{N-1} x[n]e^{-j\\frac{2\\pi}{N}kn}",
        icon: Target,
        gradient: "from-cyan-500/20 to-cyan-500/5",
        border: "border-cyan-500/30",
        hover: "hover:border-cyan-500/60",
      },
      {
        id: "circular",
        title: "圆周卷积 vs 线性卷积",
        question: "DFT 为什么必须补零？",
        formula: "N \\ge L + M - 1",
        icon: RefreshCw,
        gradient: "from-teal-500/20 to-teal-500/5",
        border: "border-teal-500/30",
        hover: "hover:border-teal-500/60",
      },
      {
        id: "filter",
        title: "数字滤波器设计",
        question: "FIR 和 IIR 的时频域特性有什么区别？",
        formula: "H(z) = \\frac{\\sum b_k z^{-k}}{1 - \\sum a_k z^{-k}}",
        icon: Filter,
        gradient: "from-indigo-500/20 to-indigo-500/5",
        border: "border-indigo-500/30",
        hover: "hover:border-indigo-500/60",
      },
      {
        id: "group-delay",
        title: "相位延迟与群延迟",
        question: "非线性相位为什么会撕裂信号包络？",
        formula: "\\tau_g(\\omega) = -\\frac{d\\phi(\\omega)}{d\\omega}",
        icon: Activity,
        gradient: "from-rose-500/20 to-rose-500/5",
        border: "border-rose-500/30",
        hover: "hover:border-rose-500/60",
      }
    ]
  },
  {
    title: "通信原理 (Communication Principles)",
    description: "信息如何跨越空间传输：调制、映射、信道噪声与接收判决。",
    modules: [
      {
        id: "modulation",
        title: "AM / FM 调制",
        question: "调制指数改变的是什么？",
        formula: "s(t) = [A_c+m(t)]\\cos(\\omega_c t)",
        icon: Radio,
        gradient: "from-pink-500/20 to-pink-500/5",
        border: "border-pink-500/30",
        hover: "hover:border-pink-500/60",
      },
      {
        id: "constellation",
        title: "星座图与 AWGN",
        question: "为什么 I/Q 两路是正交的？",
        formula: "s(t) = I\\cos(\\omega t) - Q\\sin(\\omega t)",
        icon: Radio,
        gradient: "from-lab-green/20 to-lab-green/5",
        border: "border-lab-green/30",
        hover: "hover:border-lab-green/60",
      },
      {
        id: "eye",
        title: "眼图与码间串扰",
        question: "眼图张开度代表了什么物理含义？",
        formula: "y(t) = \\sum a_k p(t-kT) + n(t)",
        icon: Eye,
        gradient: "from-orange-500/20 to-orange-500/5",
        border: "border-orange-500/30",
        hover: "hover:border-orange-500/60",
      },
      {
        id: "matched",
        title: "匹配滤波器",
        question: "如何在噪声中抓出极弱信号？",
        formula: "h(t) = s(T-t)",
        icon: Crosshair,
        gradient: "from-red-500/20 to-red-500/5",
        border: "border-red-500/30",
        hover: "hover:border-red-500/60",
      }
    ]
  }
];

function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(30, 42, 74, 0.4)";
      ctx.lineWidth = 0.5;
      const gridSize = 40;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-lab-bg relative">
      <GridBackground />

      <div className="relative z-10">
        <section className="flex flex-col items-center justify-center min-h-[50vh] px-6 pt-20 pb-12">
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-lab-cyan/30 bg-lab-cyan/5">
            <span className="w-2 h-2 rounded-full bg-lab-cyan animate-pulse" />
            <span className="text-xs font-mono text-lab-cyan tracking-widest uppercase">
              Signal Processing Visualized
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-mono font-bold text-lab-text text-center mb-4">
            信号实验室
          </h1>
          <p className="text-lg md:text-xl text-lab-muted text-center max-w-2xl mb-2">
            让公式不再抽象
          </p>
          <p className="text-sm text-lab-muted/70 text-center max-w-xl">
            悬停公式 → 画布高亮 → 拖动参数 → 观察动画
            <br />
            在交互中理解每个数学符号的物理含义
          </p>
          <div className="mt-8 animate-bounce">
            <ArrowRight
              size={24}
              className="text-lab-muted rotate-90"
            />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20 space-y-16">
          {courseCategories.map((category, idx) => (
            <div key={idx}>
              <div className="mb-6">
                <h2 className="text-2xl font-mono font-bold text-lab-text flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-lab-cyan rounded-full"></span>
                  {category.title}
                </h2>
                <p className="text-sm text-lab-muted mt-2 ml-4 border-l border-lab-border pl-3">
                  {category.description}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.modules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => navigate(`/${mod.id}`)}
                      className={`group relative p-6 rounded-xl border ${mod.border} ${mod.hover} bg-gradient-to-br ${mod.gradient} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-lab-cyan/5 text-left`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-lab-bg/50">
                          <Icon size={20} className="text-lab-cyan" />
                        </div>
                        <h3 className="text-lg font-mono font-semibold text-lab-text">
                          {mod.title}
                        </h3>
                      </div>
                      <p className="text-sm text-lab-cyan mb-3">{mod.question}</p>
                      <div className="p-3 rounded-lg bg-lab-bg/40 border border-lab-border/50 font-mono text-xs text-lab-muted overflow-hidden">
                        <span className="katex-inline">${mod.formula}$</span>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs text-lab-muted group-hover:text-lab-cyan transition-colors">
                        <span>开始探索</span>
                        <ArrowRight size={14} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <footer className="text-center py-8 border-t border-lab-border/30">
          <p className="text-xs text-lab-muted/50 font-mono">
            Signal Lab — 让每一个数学符号都有对应的可视化表达
          </p>
        </footer>
      </div>
    </div>
  );
}
