// File-type chip, from the 2026.09.07 handoff addendum
// (design_handoff_markly_2026-09-07/addenda/Markly File Type Chips.dc.html).
// There is one chip; only the letters change. Anything outside this list — and
// anything with no extension at all — is "?".
const KNOWN = ["md", "html", "pdf", "csv", "json", "yaml", "txt", "png", "jpg", "svg"];

export function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  const raw = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return KNOWN.includes(raw) ? raw : "?";
}

export const isMarkdown = (name: string) => extOf(name) === "md";

export function ExtChip({ name }: { name: string }) {
  return <span className="markly-ext">{extOf(name)}</span>;
}
