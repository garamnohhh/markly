import { useStore } from "../../store";
import { useViewport } from "../../hooks/useViewport";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  noPad,
  noSidebar,
}: {
  children: React.ReactNode;
  noPad?: boolean;
  noSidebar?: boolean;
}) {
  const sidebarVisible = useStore((s) => s.sidebarVisible);
  const focusMode = useStore((s) => s.focusMode);
  const { sidebarFits } = useViewport();

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <TitleBar />
      <div className="relative flex min-h-0 flex-1">
        {!noSidebar && sidebarVisible && !focusMode && (
          // Under 960 the sidebar has nowhere to sit, so it floats over the
          // content instead of squeezing it (23 · 구현 규칙).
          sidebarFits ? <Sidebar /> : (
            <div className="absolute inset-y-0 left-0 z-40 flex" style={{ top: "var(--spacing-topbar)" }}>
              <Sidebar />
            </div>
          )
        )}
        <main className={`min-w-0 flex-1 flex flex-col min-h-0 ${noPad ? "" : "overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
