import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ModuleLayoutProps {
  title: string;
  formula: ReactNode;
  children: ReactNode;
  controls: ReactNode;
  insight?: string;
}

export default function ModuleLayout({
  title,
  formula,
  children,
  controls,
  insight,
}: ModuleLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-lab-bg flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-lab-border bg-lab-surface/50">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg hover:bg-lab-border/50 transition-colors text-lab-muted hover:text-lab-cyan"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-mono text-lab-cyan tracking-wide">
          {title}
        </h1>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        <div className="lg:w-80 xl:w-96 p-6 border-r border-lab-border bg-lab-surface/30 flex flex-col gap-6">
          <div className="p-4 rounded-lg border border-lab-border bg-lab-bg/50">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              核心公式
            </div>
            <div className="katex-wrapper">{formula}</div>
          </div>

          <div className="flex-1 flex flex-col gap-4 p-4 rounded-lg border border-lab-border bg-lab-bg/50">
            <div className="text-xs text-lab-muted mb-1 font-mono uppercase tracking-wider">
              参数控制
            </div>
            {controls}
          </div>

          {insight && (
            <div className="p-4 rounded-lg border border-lab-green/30 bg-lab-green/5">
              <div className="text-xs text-lab-green mb-1 font-mono uppercase tracking-wider">
                物理直觉
              </div>
              <p className="text-sm text-lab-text leading-relaxed">{insight}</p>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
