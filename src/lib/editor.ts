import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
  keymap,
  KeyBinding,
  drawSelection,
} from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { tags } from "@lezer/highlight";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentMore,
  indentLess,
} from "@codemirror/commands";
import { slugify } from "./markdown";
import { buildTableKeymap, slashCommandKeymap, isTableRow, tableAutoFormat } from "./table";

// Combined highlight: markdown syntax visuals + code-fence token colors (CSS-var based for dark mode)
const mdHighlight = HighlightStyle.define([
  // headings
  { tag: tags.heading1, fontSize: "1.5em", fontWeight: "700", lineHeight: "1.4" },
  { tag: tags.heading2, fontSize: "1.3em", fontWeight: "600", lineHeight: "1.4" },
  { tag: tags.heading3, fontSize: "1.15em", fontWeight: "600" },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: "600" },
  // inline md
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", opacity: "0.6" },
  { tag: tags.monospace, fontFamily: "var(--font-mono)", fontSize: "0.875em" },
  { tag: tags.quote, opacity: "0.65" },
  { tag: tags.link, color: "var(--color-gold)" },
  { tag: tags.url, color: "var(--color-gold)", textDecoration: "underline", opacity: "0.8" },
  // table pipe chars
  { tag: tags.separator, color: "var(--color-muted)", fontWeight: "600" },
  // code fence tokens (language-specific, CSS-var so dark mode works)
  { tag: tags.keyword, color: "var(--hl-keyword)", fontWeight: "600" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--hl-string)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--hl-number)" },
  { tag: tags.comment, color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: [tags.typeName, tags.className], color: "var(--hl-type)" },
  { tag: tags.function(tags.variableName), color: "var(--hl-function)" },
  { tag: tags.function(tags.propertyName), color: "var(--hl-function)" },
  { tag: tags.propertyName, color: "var(--hl-property)" },
  { tag: tags.operator, color: "var(--hl-operator)" },
  { tag: [tags.constant(tags.name), tags.constant(tags.variableName)], color: "var(--hl-constant)", fontWeight: "600" },
  { tag: tags.regexp, color: "var(--hl-string)" },
  { tag: tags.escape, color: "var(--hl-type)" },
  { tag: tags.tagName, color: "var(--hl-keyword)" },
  { tag: tags.attributeName, color: "var(--hl-property)" },
  { tag: tags.attributeValue, color: "var(--hl-string)" },
]);

function buildLineDecos(state: EditorState): DecorationSet {
  const b = new RangeSetBuilder<Decoration>();
  let inFence = false;

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const text = line.text;

    if (/^(`{3,}|~{3,})/.test(text)) {
      inFence = !inFence;
      b.add(line.from, line.from, Decoration.line({ class: "cm-md-fence" }));
    } else if (inFence) {
      b.add(line.from, line.from, Decoration.line({ class: "cm-md-fence" }));
    } else if (text === ">" || text.startsWith("> ")) {
      b.add(line.from, line.from, Decoration.line({ class: "cm-md-quote" }));
    } else if (isTableRow(text)) {
      b.add(line.from, line.from, Decoration.line({ class: "cm-md-table" }));
    }
  }
  return b.finish();
}

const lineDecoPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildLineDecos(view.state); }
    update(u: ViewUpdate) { if (u.docChanged) this.decorations = buildLineDecos(u.state); }
  },
  { decorations: (v) => v.decorations },
);

// Tab: multi-line selection or cursor at line start → indent. Mid-text cursor → insert spaces.
const smartTab: KeyBinding = {
  key: "Tab",
  run: (view) => {
    const { state } = view;
    const sel = state.selection.main;
    if (!sel.empty) return indentMore(view);
    const line = state.doc.lineAt(sel.head);
    const before = line.text.slice(0, sel.head - line.from);
    if (/^\s*$/.test(before)) return indentMore(view);
    view.dispatch(state.replaceSelection("  "));
    return true;
  },
  shift: indentLess,
};

export function createSourceEditor(
  parent: HTMLElement,
  doc: string,
  opts: {
    cursor?: number;
    onChange: (value: string) => void;
    onCursorHeading?: (slug: string | null) => void;
  },
): EditorView {
  const reportHeading = (view: EditorView) => {
    if (!opts.onCursorHeading) return;
    const line = view.state.doc.lineAt(view.state.selection.main.head).number;
    const text = view.state.doc.toString();
    const lines = text.split("\n");
    let slug: string | null = null;
    for (let i = 0; i < line; i++) {
      const m = lines[i].match(/^#{1,6}\s+(.*)/);
      if (m) slug = slugify(m[1]);
    }
    opts.onCursorHeading(slug);
  };

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection: { anchor: Math.min(opts.cursor ?? 0, doc.length) },
      extensions: [
        history(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        drawSelection(),
        syntaxHighlighting(mdHighlight),
        lineDecoPlugin,
        EditorView.lineWrapping,
        tableAutoFormat,
        keymap.of([slashCommandKeymap, ...buildTableKeymap(), smartTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.theme({
          "&": { backgroundColor: "transparent" },
          "&.cm-focused": { outline: "none" },
          ".cm-content": {
            fontFamily: "var(--font-ui)",
            fontSize: "15px",
            lineHeight: "1.8",
            color: "var(--color-ink)",
            padding: "0",
          },
          ".cm-cursor": { borderLeftColor: "var(--color-ink)" },
          ".cm-gutters": { display: "none" },
          ".cm-activeLine": { backgroundColor: "transparent" },
          ".cm-md-fence": { background: "rgba(44,42,39,0.05)", fontFamily: "var(--font-mono)", fontSize: "0.9em" },
          ".cm-md-quote": { borderLeft: "3px solid var(--color-gold)", paddingLeft: "12px" },
          ".cm-md-table": { fontFamily: '"D2Coding", var(--font-mono)', fontSize: "0.9em" },
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange(u.state.doc.toString());
          if (u.docChanged || u.selectionSet) reportHeading(u.view);
        }),
      ],
    }),
  });
  reportHeading(view);
  return view;
}
