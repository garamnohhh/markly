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
    el.innerHTML = `<pre style="white-space:pre-wrap;padding:24px;font:13px monospace;color:#c2705b">${msg}</pre>`;
}
window.addEventListener("error", (e) =>
  showFatal(`[error] ${e.message}\n${e.error?.stack ?? ""}`),
);
window.addEventListener("unhandledrejection", (e) =>
  showFatal(`[promise] ${String(e.reason)}`),
);

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
