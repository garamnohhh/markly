// The pirep mark, typeset rather than drawn — see index.css and
// design_handoff_pirep_2026-09-06/assets/snippets.md.
//
// Two forms, picked by size: at 64px and up a tile carries the whole name, at
// 32px and below only the `p` and its dot survive because five letters stop
// reading. Nothing here is an image, so the mark follows theme and resolution.

// Inline wordmark. `live` blinks the dot — only ever one per screen, the one in
// the title bar.
export function Wordmark({ size = 15, live }: { size?: number; live?: boolean }) {
  // The letter-spacing ladder from the handoff: tighten as it grows.
  const tracking = size >= 44 ? "-0.035em" : size >= 24 ? "-0.03em" : "-0.02em";
  // The dot is 0.27em, snapped to whole pixels. Left in em it lands on half
  // pixels and smears — the same reason the small mark snaps its dot.
  const dot = Math.max(2, Math.round(size * 0.27));
  return (
    <span
      className={`pirep-wordmark${live ? " pirep-wordmark--live" : ""}`}
      style={{ fontSize: size, letterSpacing: tracking }}
      aria-label="pirep"
    >
      pirep<i style={{ width: dot, height: dot }} />
    </span>
  );
}

// Square tile holding the whole name. Contents sit at 72% of the tile.
export function LogoTile({ size = 64 }: { size?: number }) {
  return (
    <span className="pirep-tile" style={{ width: size, height: size }}>
      <span className="pirep-wordmark" style={{ fontSize: size * 0.192 }} aria-label="pirep">
        pirep<i />
      </span>
    </span>
  );
}

// The reduced mark, on its tile. x-height = tile / 4, so font-size = tile /
// 2.24. The dot is snapped to whole pixels with a 2px floor — left in em it
// lands on half pixels at these sizes and smears.
export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  const fontSize = size / 2.24;
  const dot = Math.max(2, Math.round((size * 3) / 32));
  return (
    <span
      className={`pirep-tile ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-label="pirep"
    >
      <span
        className="pirep-mark"
        style={{
          fontSize,
          width: `calc(0.468em + ${dot}px)`,
          height: `calc(0.560em + ${dot}px)`,
        }}
      >
        <b style={{ top: `calc(${dot}px - 0.300em)` }}>p</b>
        <i style={{ width: dot, height: dot }} />
      </span>
    </span>
  );
}
