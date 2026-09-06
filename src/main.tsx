import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "katex/dist/katex.min.css";
import "./index.css";
import { getHighlighter } from "./lib/shiki";

// Warm up Shiki in background so first code block renders instantly
getHighlighter();

// Surface any runtime error on-screen — the Tauri WebView console isn't always
// reachable, so a blank window otherwise hides the cause.
function showFatal(msg: string) {
  const el = document.getElementById("root");
  if (el)
    el.innerHTML = `<pre style="white-space:pre-wrap;padding:24px;font:13px monospace;color:var(--color-red)">${msg}</pre>`;
}
// Tauri's IPC-init script runs in every frame, including sandboxed HTML-preview
// iframes (same-origin via allow-same-origin). In a frame it never registers with,
// init throws "__TAURI_INTERNALS__.transformCallback undefined" and WKWebView reports
// it on the top window. Harmless — a preview iframe never calls Tauri IPC — so ignore
// it instead of blanking the whole app with showFatal.
function isTauriFrameNoise(text: string): boolean {
  return text.includes("__TAURI_INTERNALS__");
}

// ponytail: dedupe across Vite HMR — main.tsx is the entry, a hot reload re-runs it
// and would stack a second (stale-closure) listener on top of the old one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _w = window as any;
if (_w.__marklyOnError) window.removeEventListener("error", _w.__marklyOnError);
if (_w.__marklyOnRej) window.removeEventListener("unhandledrejection", _w.__marklyOnRej);

_w.__marklyOnError = (e: ErrorEvent) => {
  if (isTauriFrameNoise(e.message ?? "")) return;
  showFatal(`[error] ${e.message}\n${e.error?.stack ?? ""}`);
};
_w.__marklyOnRej = (e: PromiseRejectionEvent) => {
  const msg = String(e.reason);
  if (isTauriFrameNoise(msg)) { e.preventDefault(); return; }
  showFatal(`[promise] ${msg}`);
};

window.addEventListener("error", _w.__marklyOnError);
window.addEventListener("unhandledrejection", _w.__marklyOnRej);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <pre className="whitespace-pre-wrap p-6 font-mono text-[13px] text-red">
          {this.state.error.message}
          {"\n"}
          {this.state.error.stack}
        </pre>
      );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
