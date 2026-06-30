import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { bundledLanguages, type BundledLanguage } from "shiki/langs";
import { bundledThemes } from "shiki/themes";

export const SUPPORTED_LANGS: BundledLanguage[] = [
  "javascript", "typescript", "jsx", "tsx",
  "html", "css", "scss",
  "json", "yaml",
  "sql", "bash", "markdown",
  "java", "kotlin", "swift",
  "python", "go", "rust", "c", "cpp", "csharp", "php",
];

// Aliases Shiki doesn't handle natively
const ALIAS: Record<string, BundledLanguage> = {
  "js": "javascript", "ts": "typescript",
  "sh": "bash", "shell": "bash", "zsh": "bash",
  "yml": "yaml",
  "py": "python",
  "c#": "csharp", "cs": "csharp",
  "c++": "cpp",
};

export function normalizeLang(lang: string): BundledLanguage | null {
  const l = lang.toLowerCase().trim();
  if (ALIAS[l]) return ALIAS[l];
  if ((SUPPORTED_LANGS as string[]).includes(l)) return l as BundledLanguage;
  return null;
}

type ShikiHighlighter = Awaited<ReturnType<typeof createHighlighterCore>>;
let _hl: ShikiHighlighter | null = null;
let _promise: Promise<ShikiHighlighter> | null = null;

export function getHighlighter(): Promise<ShikiHighlighter> {
  if (_hl) return Promise.resolve(_hl);
  if (!_promise) {
    _promise = createHighlighterCore({
      themes: [
        bundledThemes["github-light"],
        bundledThemes["github-dark"],
      ],
      langs: SUPPORTED_LANGS.map((l) => bundledLanguages[l]),
      engine: createJavaScriptRegexEngine(),
    }).then((hl) => {
      _hl = hl;
      return hl;
    });
  }
  return _promise;
}

export function highlightSync(code: string, lang: BundledLanguage): string | null {
  if (!_hl) return null;
  try {
    return _hl.codeToHtml(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark" },
    });
  } catch {
    return null;
  }
}

// Escape HTML for plain fallback
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
