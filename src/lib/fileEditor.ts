import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap } from "@codemirror/view";
import { HighlightStyle, LanguageDescription, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { tags } from "@lezer/highlight";

// Mirrors the token CSS vars from index.css so dark mode works automatically
const fileHighlight = HighlightStyle.define([
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

export function createFileEditor(
  parent: HTMLElement,
  filename: string,
  doc: string,
  opts: { onChange: (value: string) => void },
): EditorView {
  const langCompartment = new Compartment();

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        history(),
        drawSelection(),
        langCompartment.of([]),
        syntaxHighlighting(fileHighlight),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.theme({
          "&": { background: "transparent" },
          "&.cm-focused": { outline: "none" },
          ".cm-content": {
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            lineHeight: "1.85",
            color: "var(--color-ink)",
            padding: "0",
            minWidth: "max-content",
          },
          ".cm-cursor": { borderLeftColor: "var(--color-ink)" },
          ".cm-gutters": { display: "none" },
          ".cm-activeLine": { background: "transparent" },
          ".cm-scroller": { overflow: "auto" },
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange(u.state.doc.toString());
        }),
      ],
    }),
  });

  // Async: load language and apply via compartment
  const desc = LanguageDescription.matchFilename(languages, filename);
  if (desc) {
    desc.load().then((support) => {
      view.dispatch({ effects: langCompartment.reconfigure(support) });
    }).catch(() => { /* no-op: plain text fallback */ });
  }

  view.focus();
  return view;
}
