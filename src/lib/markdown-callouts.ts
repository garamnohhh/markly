import type MarkdownIt from "markdown-it";

// Obsidian-style callouts:
//   > [!note] Optional title
//   > body
// Renders the blockquote with a `callout callout-<type>` class + a title row.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function calloutPlugin(md: MarkdownIt) {
  md.core.ruler.after("inline", "callouts", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "blockquote_open") continue;
      const inline = tokens[i + 2];
      if (!inline || inline.type !== "inline") continue;

      const m = inline.content.match(/^\[!(\w+)\][+-]?\s*(.*)/);
      if (!m) continue;

      const type = m[1].toLowerCase();
      const title = (m[2] || "").trim() || cap(type);

      tokens[i].attrJoin("class", `callout callout-${type}`);
      tokens[i].attrSet("data-callout", type);

      // drop the marker line from the body, re-tokenize the remainder
      const nl = inline.content.indexOf("\n");
      inline.content = nl === -1 ? "" : inline.content.slice(nl + 1);
      inline.children = [];
      state.md.inline.parse(inline.content, state.md, state.env, inline.children);

      // inject a title row right after blockquote_open
      const titleTok = new state.Token("html_block", "", 0);
      titleTok.content = `<div class="callout-title">${esc(title)}</div>\n`;
      tokens.splice(i + 1, 0, titleTok);
    }
    return false;
  });
}
