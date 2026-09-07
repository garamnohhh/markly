import { useCallback } from "react";
import { useStore } from "../../store";
import type { Heading } from "../../lib/markdown";

export function OutlinePanel({
  headings,
  progress,
  activeSlug,
  onJump,
}: {
  headings: Heading[];
  progress: number;
  activeSlug: string;
  onJump: (slug: string) => void;
}) {
  const tocWidth = useStore((s) => s.tocWidth);
  const setTocWidth = useStore((s) => s.setTocWidth);

  // Same grab strip as the sidebar: straddle the border, pin the cursor for the
  // duration, so a fast drag does not slip off it.
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = tocWidth;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (mv: MouseEvent) => setTocWidth(startW - (mv.clientX - startX));
    const onUp = () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [tocWidth, setTocWidth]);

  const pct = Math.round(progress * 100);
  return (
    <aside
      className="relative shrink-0 overflow-y-auto border-l border-line bg-paper"
      style={{ width: tocWidth, padding: "60px 24px" }}
    >
      {/* Drag handle — left edge */}
      <div
        onMouseDown={onDragStart}
        title="Drag to resize"
        className="absolute top-0 h-full cursor-col-resize"
        style={{ left: -4, width: 9, zIndex: 30 }}
      />
      <div
        className="mb-[18px] text-[10px] font-bold uppercase text-mid"
        style={{ letterSpacing: "0.13em" }}
      >
        Outline · {pct}%
      </div>
      {headings.length > 0 && (
        <div className="flex gap-[15px]">
          {/* progress track */}
          <div
            className="relative w-[3px] shrink-0"
            style={{ background: "var(--color-line)" }}
          >
            <div
              className="absolute inset-x-0 top-0"
              style={{ height: `${pct}%`, background: "var(--color-ink)" }}
            />
          </div>
          {/* heading list */}
          <div className="flex min-w-0 flex-col gap-[18px] pt-px">
            {headings.map((h, i) => {
              const active = h.slug === activeSlug;
              return (
                <button
                  key={i}
                  onClick={() => onJump(h.slug)}
                  className="min-w-0 break-words text-left transition-colors hover:text-ink"
                  style={{
                    marginLeft: h.level > 1 ? `${(h.level - 1) * 10}px` : undefined,
                    fontSize: h.level > 1 ? "12px" : "13px",
                    color: active ? "var(--color-ink)" : h.level > 1 ? "var(--color-mid)" : "var(--color-slate)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {h.text}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
