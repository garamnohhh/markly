// Slide detection + asset base for the HTML/PDF slideshow overlay.
//
// HTML previews render from a blob: URL, which has no directory, so a document's
// relative asset references (./support.js, _ds/styles.css, assets/logo.svg) never
// resolve — the browser doesn't even attempt them. Injecting a <base> pointing at
// the file's real directory fixes that without rewriting the document.

// marklyfile://localhost/<segment-encoded absolute dir>/ — served by
// src-tauri/src/assets.rs, which decodes per segment and refuses anything outside
// the open vault.
//
// Not Tauri's asset:// / `convertFileSrc`: that percent-encodes the whole path as
// ONE segment ("%2FUsers%2F…"), which works for a single file src but is useless as
// a <base> — relative URLs resolve against the origin root, not the directory.
export function assetBaseHref(absDir: string): string {
  const segments = absDir.split("/").filter(Boolean).map(encodeURIComponent);
  return `marklyfile://localhost/${segments.map((s) => `${s}/`).join("")}`;
}

// Insert <base> as the first thing in <head> so it applies to every later
// reference. Documents without a <head> get one. An existing <base> wins — the
// author asked for it explicitly.
export function withAssetBase(html: string, absDir: string): string {
  if (/<base\b/i.test(html)) return html;
  const tag = `<base href="${assetBaseHref(absDir)}">`;
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${tag}`);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (m) => `${m}\n<head>${tag}</head>`);
  }
  return `<head>${tag}</head>\n${html}`;
}

// Does this document actually reference a sibling file? A <base> is what makes
// those resolve, but it also re-points every bare "#frag" at the base URL, so a
// self-contained document is strictly better off without one.
const RELATIVE_REF =
  /<(?:link|script|img|source|iframe|video|audio|embed)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"'#][^"']*)["']/gi;
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function needsAssetBase(html: string): boolean {
  RELATIVE_REF.lastIndex = 0;
  for (let m = RELATIVE_REF.exec(html); m; m = RELATIVE_REF.exec(html)) {
    if (!ABSOLUTE.test(m[1])) return true;
  }
  return false;
}

export type SlideKind =
  // The document ships its own slide runtime (deck-stage) and its own key
  // handling. We give it the screen and stay out of the way.
  | { kind: "deck" }
  // Plain slide-shaped markup. We page through the matched elements ourselves.
  | { kind: "elements"; selector: string; count: number }
  // PDF: the embedded viewer owns paging.
  | { kind: "pdf" }
  | null;

// Only explicit slide markers. `body > section` was tried and dropped: across the
// 51 HTML files in the real vault it never once matched an actual deck, and did
// match two ordinary reports that happen to be split into sections.
const SLIDE_SELECTORS = ["section[data-label]", ".slide"];

// `x-import` is the authored form; `deck-stage` is what it becomes once the
// document's own script upgrades it.
const DECK_SELECTOR = 'x-import[component-from-global-scope="deck-stage"], deck-stage';

// Detect against a LIVE document, not the source text. Single-file deck exports
// carry their slides inside a script string and only build the DOM when they run,
// so parsing the raw HTML finds nothing at all — that's how a 10-slide deck was
// getting no slideshow button.
export function detectSlidesIn(doc: Document): SlideKind {
  if (doc.querySelector(DECK_SELECTOR)) return { kind: "deck" };
  for (const selector of SLIDE_SELECTORS) {
    const n = doc.querySelectorAll(selector).length;
    if (n >= 2) return { kind: "elements", selector, count: n };
  }
  return null;
}

// Static form, for documents that need no script to exist (and for tests).
export function detectSlides(html: string): SlideKind {
  return detectSlidesIn(new DOMParser().parseFromString(html, "text/html"));
}
