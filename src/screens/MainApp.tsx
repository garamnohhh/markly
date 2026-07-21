import { useStore, useDocs } from "../store";
import { AppShell } from "../components/layout/AppShell";
import { KnowledgeInbox } from "./KnowledgeInbox";
import { DocReader } from "../components/reader/DocReader";
import { FileViewer } from "../components/reader/FileViewer";
import { DiffView } from "./DiffView";
import { EmptyVault } from "./EmptyVault";
import { TagResults } from "./TagResults";
import { Settings } from "./Settings";
import { RabbitHole } from "./RabbitHole";

export function MainApp() {
  const view = useStore((s) => s.view);
  const docs = useDocs();

  if (view === "diff") return <AppShell noPad noSidebar><DiffView /></AppShell>;
  if (view === "settings") return <AppShell noPad noSidebar><Settings /></AppShell>;
  if (view === "rabbit-hole") return <AppShell noPad noSidebar><RabbitHole /></AppShell>;
  if (view === "tag-results") return <AppShell noPad noSidebar><TagResults /></AppShell>;
  if (view === "file-viewer") return <AppShell><div className="flex h-full flex-col min-h-0"><FileViewer /></div></AppShell>;

  let inner: React.ReactNode;
  if (view === "reader") inner = <DocReader />;
  else if (docs.length === 0) inner = <EmptyVault />;
  else inner = <KnowledgeInbox />;

  return <AppShell>{inner}</AppShell>;
}
