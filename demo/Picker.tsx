import { useEffect, useState } from "react";
import { MAIN_DOC, RABBIT_DOC, TAG, FILE_HTML, FILE_PDF, FILE_CSV, FILE_NOPE } from "./sample";

// Floating screen picker. Deliberately not a side rail: the app has to keep the
// whole window so window.innerWidth stays real and the 1120 / 960 breakpoints
// behave the way they do in the desktop app. Resize the browser to see them.
type Store = Record<string, (...a: unknown[]) => unknown> & {
  theme: string; sidebarTab: string; tocVisible: boolean; view: string;
};
const s = () => (window as unknown as { __ms: { getState: () => Store } }).__ms.getState();

const SCREENS: { label: string; run: () => void }[] = [
  { label: "Knowledge Inbox", run: () => { const t = s(); t.setSidebarTab("queue"); t.goInbox(); } },
  { label: "Reader", run: () => { const t = s(); t.setSidebarTab("queue"); t.openDoc(MAIN_DOC); if (t.tocVisible) t.toggleToc(); } },
  { label: "Reader + outline", run: () => { const t = s(); t.openDoc(MAIN_DOC); if (!t.tocVisible) t.toggleToc(); } },
  { label: "File tree", run: () => { const t = s(); t.goInbox(); t.setSidebarTab("files"); } },
  { label: "Command palette", run: () => { const t = s(); t.openDoc(MAIN_DOC); t.setCmdPalette(true); } },
  { label: "Changes", run: () => s().openDiff(MAIN_DOC, 4, 7) },
  { label: "Tag results", run: () => s().openTag(TAG) },
  { label: "Rabbit Hole", run: () => s().goRabbitHole(RABBIT_DOC) },
  { label: "File viewer · HTML", run: () => { const t = s(); t.setSidebarTab("files"); t.openFile(FILE_HTML); } },
  { label: "File viewer · PDF", run: () => { const t = s(); t.setSidebarTab("files"); t.openFile(FILE_PDF); } },
  { label: "File viewer · CSV", run: () => { const t = s(); t.setSidebarTab("files"); t.openFile(FILE_CSV); } },
  { label: "File viewer · cannot open", run: () => { const t = s(); t.setSidebarTab("files"); t.openFile(FILE_NOPE); } },
  { label: "Settings", run: () => s().setView("settings") },
  { label: "First run", run: () => s().clearVault() },
];

const NOT_HERE = [
  "창 모서리 16px · 투명 창 · 창 그림자",
  "슬라이드쇼의 전체화면 전환 (슬라이드 화면 자체는 보임)",
  "dock 아이콘",
  "macOS 신호등 실물 — 보이는 원 3개는 우리가 그린 것",
  "서체 미세차 — 앱은 WKWebView에서 그림",
];

export function Picker() {
  const [open, setOpen] = useState(true);
  const [dark, setDark] = useState(true);
  const [w, setW] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function theme(next: boolean) {
    setDark(next);
    s().setTheme(next ? "dark" : "light");
  }

  const band = w >= 1120 ? "1120 이상 — 패널 그대로" : w >= 960 ? "1120 아래 — 오른쪽 패널 닫힘" : "960 아래 — 사이드바 Drawer";

  const box: React.CSSProperties = {
    // bottom-right: the sidebar is a design surface and the panel must not
    // sit on top of it
    position: "fixed", right: 12, bottom: 12, zIndex: 2147483647,
    fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 12,
    background: "#101413", color: "#E6EBE6", border: "1px solid #2a322e",
    boxShadow: "0 10px 30px -10px rgba(0,0,0,.6)", maxWidth: 260,
  };
  const btn: React.CSSProperties = {
    display: "block", width: "100%", textAlign: "left", padding: "5px 10px",
    background: "transparent", border: 0, color: "#c9d2cb", font: "inherit", cursor: "pointer",
  };

  if (!open) {
    return (
      <button style={{ ...box, padding: "6px 10px", cursor: "pointer" }} onClick={() => setOpen(true)}>
        screens ▸
      </button>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #2a322e" }}>
        <strong style={{ fontSize: 12, letterSpacing: ".04em" }}>PIREP · BUILT</strong>
        <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "transparent", border: 0, color: "#6b776f", cursor: "pointer", font: "inherit" }}>×</button>
      </div>

      <div style={{ maxHeight: "40vh", overflowY: "auto", padding: "4px 0" }}>
        {SCREENS.map((sc) => (
          <button key={sc.label} style={btn} onClick={sc.run}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1a201d")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            {sc.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid #2a322e" }}>
        {(["dark", "light"] as const).map((t) => (
          <button key={t} onClick={() => theme(t === "dark")}
            style={{ flex: 1, padding: "4px 0", cursor: "pointer", font: "inherit",
              border: "1px solid #2a322e",
              background: (t === "dark") === dark ? "#3ED49C" : "transparent",
              color: (t === "dark") === dark ? "#08090A" : "#c9d2cb" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: "6px 10px", borderTop: "1px solid #2a322e", color: "#8b968e", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
        {w}px · {band}
        <div style={{ color: "#6b776f", marginTop: 2 }}>창 크기를 바꾸면 실제로 동작함</div>
      </div>

      <details style={{ borderTop: "1px solid #2a322e" }}>
        <summary style={{ padding: "6px 10px", cursor: "pointer", color: "#8b968e" }}>여기서는 안 보이는 것</summary>
        <ul style={{ margin: 0, padding: "0 10px 10px 24px", color: "#8b968e", lineHeight: 1.6 }}>
          {NOT_HERE.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p style={{ margin: 0, padding: "0 10px 10px", color: "#6b776f" }}>
          그 부분은 캡처로 따로 전달합니다.
        </p>
      </details>
    </div>
  );
}
