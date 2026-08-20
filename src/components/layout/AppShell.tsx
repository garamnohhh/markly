import { useStore } from "../../store";
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

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        {!noSidebar && sidebarVisible && !focusMode && <Sidebar />}
        <main className={`min-w-0 flex-1 flex flex-col min-h-0 ${noPad ? "" : "overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
