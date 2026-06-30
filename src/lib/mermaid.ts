// Lazy, single-init mermaid wrapper. suppressErrorRendering keeps mermaid from
// injecting a full-screen error diagram into <body> on a parse failure (which
// otherwise causes a stray "syntax error" panel + page scroll).
let ready: Promise<typeof import("mermaid").default> | null = null;

export function getMermaid(dark: boolean) {
  if (!ready) {
    ready = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: "strict",
        theme: dark ? "dark" : "neutral",
        fontFamily: "var(--font-ui)",
      });
      return mermaid;
    });
  }
  return ready;
}
