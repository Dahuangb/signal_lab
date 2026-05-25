import { useNavigate } from "react-router-dom";
import { Activity, Radio, Sigma, ArrowRight, Waves } from "lucide-react";
import { useEffect, useRef } from "react";

const modules = [
  {
    id: "fourier",
    title: "傅里叶变换",
    question: "为什么频谱是\"匹配度\"的度量？",
    formula: "F(\\omega) = \\int f(t) e^{-j\\omega t} dt",
    icon: Activity,
    gradient: "from-lab-cyan/20 to-lab-cyan/5",
    border: "border-lab-cyan/30",
    hover: "hover:border-lab-cyan/60",
  },
  {
    id: "constellation",
    title: "星座图",
    question: "为什么 I/Q 两路是正交的？",
    formula: "s(t) = I\\cos(\\omega t) - Q\\sin(\\omega t)",
    icon: Radio,
    gradient: "from-lab-green/20 to-lab-green/5",
    border: "border-lab-green/30",
    hover: "hover:border-lab-green/60",
  },
  {
    id: "sampling",
    title: "采样定理",
    question: "为什么必须 f_s ≥ 2f_max？",
    formula: "x[n] = x(nT_s)",
    icon: Sigma,
    gradient: "from-lab-amber/20 to-lab-amber/5",
    border: "border-lab-amber/30",
    hover: "hover:border-lab-amber/60",
  },
  {
    id: "convolution",
    title: "卷积",
    question: "为什么是\"翻转→滑动→乘积累加\"？",
    formula: "y(t) = \\int x(\\tau)h(t-\\tau)d\\tau",
    icon: Waves,
    gradient: "from-purple-500/20 to-purple-500/5",
    border: "border-purple-500/30",
    hover: "hover:border-purple-500/60",
  },
  {
    id: "modulation",
    title: "AM / FM 调制",
    question: "调制指数改变的是什么？",
    formula: "s_{AM}(t) = [1+m\\cdot x(t)]\\cos(\\omega_c t)",
    icon: Radio,
    gradient: "from-pink-500/20 to-pink-500/5",
    border: "border-pink-500/30",
    hover: "hover:border-pink-500/60",
  },
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

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => {
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
