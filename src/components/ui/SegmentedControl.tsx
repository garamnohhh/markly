// Tab-like switcher (e.g. Reading Queue / Files).
interface Segment<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="flex gap-0.5 rounded-input bg-tertiary p-0.5">
      {segments.map((s) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={`flex-1 whitespace-nowrap rounded-control px-2 py-1 text-[12.5px] font-medium transition-colors ${
            value === s.value
              ? "bg-paper text-ink shadow-sm"
              : "text-muted hover:text-slate"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
