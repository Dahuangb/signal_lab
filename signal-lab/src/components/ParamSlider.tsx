interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

export default function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = "",
}: ParamSliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-lab-muted">
        <span>{label}</span>
        <span className="font-mono text-lab-cyan">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #00e5ff 0%, #00e5ff ${
            ((value - min) / (max - min)) * 100
          }%, #1e2a4a ${((value - min) / (max - min)) * 100}%, #1e2a4a 100%)`,
          accentColor: "#00e5ff",
        }}
      />
    </div>
  );
}
