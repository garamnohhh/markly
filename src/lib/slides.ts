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

export type SlideKind =
  // The document ships its own slide runtime (deck-stage) and its own key
  // handling. We give it the screen and stay out of the way.
  | { kind: "deck" }
  // Plain slide-shaped markup. We page through the matched elements ourselves.
  | { kind: "elements"; selector: string; count: number }
  // PDF: the embedded viewer owns paging.
  | { kind: "pdf" }
  | null;

// Ordered most-specific first. A long article matches none of these, and then the
// slideshow button never appears — we don't invent slide breaks for prose.
const SLIDE_SELECTORS = ["section[data-label]", ".slide", "body > section"];

export function detectSlides(html: string): SlideKind {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (doc.querySelector('x-import[component-from-global-scope="deck-stage"]')) {
    return { kind: "deck" };
  }
  for (const selector of SLIDE_SELECTORS) {
    const n = doc.querySelectorAll(selector).length;
    if (n >= 2) return { kind: "elements", selector, count: n };
  }
  return null;
}
