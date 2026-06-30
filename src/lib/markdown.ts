import MarkdownIt from "markdown-it";
// @ts-expect-error no bundled types
import taskLists from "markdown-it-task-lists";
import katex from "@vscode/markdown-it-katex";
import calloutPlugin from "./markdown-callouts";

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
  | { kind: "code"; code: string; lang: string };

export function parseDoc(src: string): {
  segments: Segment[];
  headings: Heading[];
} {
  const { body } = splitFrontmatter(src);
  const preprocessed = body.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    return `[${name.trim()}](markly-wiki://${slug})`;
  });
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
  for (const t of tokens) {
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
