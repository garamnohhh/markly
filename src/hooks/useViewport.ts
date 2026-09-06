import { useEffect, useState } from "react";

// Breakpoints from the handoff's 23 · 구현 규칙: below 1120 the right panel
// closes itself, below 960 the sidebar becomes an overlay drawer. Derived from
// the window rather than stored, so widening the window brings the panels back
// exactly as the user left them.
export function useViewport() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { width: w, panelFits: w >= 1120, sidebarFits: w >= 960 };
}
