import MarkdownIt from "markdown-it";
// @ts-expect-error no bundled types
import taskLists from "markdown-it-task-lists";
import katex from "@vscode/markdown-it-katex";
import calloutPlugin from "./markdown-callouts";
import { parseWikiInner, encodeLinkDestSpaces } from "./wiki";

// Read-first renderer. html:false keeps raw HTML out (trust boundary — vault
// files are local but may be AI-written or synced, so don't execute embedded HTML).
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
});

md.use(taskLists, { label: true });
md.use(katex);
md.use(calloutPlugin);

export interface Heading {
  level: number;
  text: string;
  slug: string;
}

// Keep Unicode (Korean etc.) — only strip HTML-unsafe chars and collapse spaces.
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[<>"&]/g, "")
    .replace(/\s+/g, "-");

// Headings only, via a cheap fence-aware line scan — no full markdown-it parse.
// Used for the outline in both read and edit mode (edit mode has no rendered
// tree). Skips '#' inside ``` / ~~~ code fences. Matches parseDoc's h1–h4 + slug.
export function extractHeadings(src: string): Heading[] {
  const { body } = splitFrontmatter(src);
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*(`{3,}|~{3,})/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.*)/);
    if (!m) continue;
    const level = m[1].length;
    if (level > 4) continue; // TOC shows h1–h4 only
    const text = m[2].trim();
    const slug = slugify(text) || `h${level}-${headings.length}`;
    headings.push({ level, text, slug });
  }
  return headings;
}

// Strip a leading YAML frontmatter block; return it separately.
export function splitFrontmatter(src: string): {
  frontmatter: string | null;
  body: string;
} {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontmatter: null, body: src };
  return { frontmatter: m[1], body: src.slice(m[0].length) };
}

function collectHeadings(tokens: ReturnType<typeof md.parse>): Heading[] {
  const headings: Heading[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "heading_open") {
      const level = Number(t.tag.slice(1));
      if (level > 4) continue; // TOC shows h1–h4 only
      const text = tokens[i + 1]?.content ?? "";
      const slug = slugify(text) || `h${level}-${headings.length}`;
      headings.push({ level, text, slug });
      t.attrSet("id", slug);
    }
  }
  return headings;
}

// Display segments: plain HTML chunks interleaved with mermaid/code blocks.
export type Segment =
  | { kind: "html"; html: string }
  | { kind: "mermaid"; code: string }
  | { kind: "code"; code: string; lang: string }
  | { kind: "table"; html: string };

export function parseDoc(src: string): {
  segments: Segment[];
  headings: Heading[];
} {
  const { body } = splitFrontmatter(src);
  // Wiki links: [[target]], [[target|alias]], [[target#heading]], [[target#heading|alias]].
  // Encode the raw "target#heading" into the href verbatim (no slugifying) so
  // resolution can match real filenames incl. spaces; alias/target is the display.
  const withWiki = body.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const { linkPart, display } = parseWikiInner(inner);
    return `[${display}](markly-wiki://${encodeURIComponent(linkPart)})`;
  });
  const preprocessed = encodeLinkDestSpaces(withWiki);
  const tokens = md.parse(preprocessed, {});
  const headings = collectHeadings(tokens);

  const segments: Segment[] = [];
  let buffer: typeof tokens = [];
  const flush = () => {
    if (buffer.length) {
      segments.push({ kind: "html", html: md.renderer.render(buffer, md.options, {}) });
      buffer = [];
    }
  };
  // Tables get their own segment so the reader can own the wrapper/toolbar in
  // React (imperative DOM mutation of dangerouslySetInnerHTML flickered away on
  // re-render). No table nesting in markdown, so a flat open/close span is safe.
  let tableBuf: typeof tokens | null = null;
  for (const t of tokens) {
    if (tableBuf) {
      tableBuf.push(t);
      if (t.type === "table_close") {
        segments.push({ kind: "table", html: md.renderer.render(tableBuf, md.options, {}) });
        tableBuf = null;
      }
      continue;
    }
    if (t.type === "table_open") {
      flush();
      tableBuf = [t];
      continue;
    }
    const lang = t.info.trim().toLowerCase();
    if (t.type === "fence" && lang === "mermaid") {
      flush();
      segments.push({ kind: "mermaid", code: t.content });
    } else if (t.type === "fence") {
      flush();
      segments.push({ kind: "code", code: t.content, lang });
    } else {
      buffer.push(t);
    }
  }
  flush();
  return { segments, headings };
}

export default md;
