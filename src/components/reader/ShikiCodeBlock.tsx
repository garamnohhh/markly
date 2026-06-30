import { useEffect, useState } from "react";
import { getHighlighter, normalizeLang, escapeHtml } from "../../lib/shiki";

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function ShikiCodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const normalizedLang = normalizeLang(lang);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      try {
        const result = hl.codeToHtml(code, {
          lang: normalizedLang ?? "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
        setHtml(result);
      } catch {
        setHtml(null);
      }
    });
    return () => { cancelled = true; };
  }, [code, normalizedLang]);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const displayLang = lang.trim();

  return (
    <div className="shiki-block group">
      {displayLang && <span className="shiki-lang-badge">{displayLang}</span>}
      <div className="block-action-wrap opacity-0 group-hover:opacity-100">
        <button onClick={copy} className={`block-action-btn${copied ? " check" : ""}`} title="Copy code">
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      {html != null ? (
        <div className="shiki-wrap" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="shiki-plain"><code dangerouslySetInnerHTML={{ __html: escapeHtml(code) }} /></pre>
      )}
    </div>
  );
}
