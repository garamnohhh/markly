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
    <div className="inline-flex w-full border border-line">
      {segments.map((s, i) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={`flex-1 whitespace-nowrap px-2 py-1 text-[12.5px] font-medium transition-colors ${
            i > 0 ? "border-l border-line" : ""
          } ${
            value === s.value
              ? "bg-[var(--color-gold)] text-[var(--color-on-accent)]"
              : "text-muted hover:text-ink"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
