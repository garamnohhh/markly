// The Base-root mark in the title-bar breadcrumb. At this size the handoff uses
// the reduced mark — `m` plus its dot on a tile — not the full name.
import { Logo } from "./Logo";

export function AppIcon({ size = 17 }: { size?: number }) {
  return <Logo size={size} />;
}
