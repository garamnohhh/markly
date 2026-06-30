import { Annotation, EditorState } from "@codemirror/state";
import { EditorView, KeyBinding } from "@codemirror/view";

// CJK characters count as display width 2
function strWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0x9fff) ||
      (cp >= 0xac00 && cp <= 0xd7af) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe4f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6)
    )
      w += 2;
    else w += 1;
  }
  return w;
}

// A separator row must have at least one '-' per cell (prevents "| | |" from matching)
export function isSepRow(text: string): boolean {
  return /^\|(\s*:?-+:?\s*\|)+\s*$/.test(text);
}

export function isTableRow(text: string): boolean {
  return text.trimStart().startsWith("|");
}

function parseCells(text: string): string[] {
  const parts = text.split("|");
  if (parts[0].trim() === "") parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
  return parts.map((c) => c.trim());
}

export function formatTable(lines: string[]): string[] {
  const nonSep = lines.filter((l) => !isSepRow(l));
  const colCount = Math.max(0, ...nonSep.map((l) => parseCells(l).length));
  if (colCount === 0) return lines;

  const widths = Array<number>(colCount).fill(3);
  nonSep.forEach((l) =>
    parseCells(l).forEach((cell, i) => {
      widths[i] = Math.max(widths[i], strWidth(cell));
    }),
  );

  return lines.map((line) => {
    if (isSepRow(line))
      return "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
    const cells = parseCells(line);
    const padded = widths.map((w, i) => {
      const cell = cells[i] ?? "";
      return cell + " ".repeat(Math.max(0, w - strWidth(cell)));
    });
    return "| " + padded.join(" | ") + " |";
  });
}

function getTableBounds(state: EditorState, lineNum: number) {
  let start = lineNum;
  let end = lineNum;
  while (start > 1 && isTableRow(state.doc.line(start - 1).text)) start--;
  while (end < state.doc.lines && isTableRow(state.doc.line(end + 1).text)) end++;
  return { start, end };
}

function collectLines(state: EditorState, start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, i) => state.doc.line(start + i).text);
}

// Which column (0-indexed) is the cursor in on this line?
function cursorCol(lineText: string, offset: number): number {
  let pipes = 0;
  for (let i = 0; i < Math.min(offset, lineText.length); i++)
    if (lineText[i] === "|") pipes++;
  return Math.max(0, pipes - 1);
}

// Character offset of cell content start within lineText.
// Skips exactly one leading space (the standard "| " separator).
// For empty cells this lands at position after "| ", i.e. before trailing spaces.
function cellStart(lineText: string, col: number): number {
  let pipes = 0;
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === "|") {
      pipes++;
      if (pipes === col + 1) {
        const j = i + 1;
        return lineText[j] === " " ? j + 1 : j;
      }
    }
  }
  return lineText.length;
}

// Absolute doc position of cell content start (in current state)
function docCellStart(state: EditorState, docLineNum: number, col: number): number {
  const line = state.doc.line(docLineNum);
  return line.from + cellStart(line.text, col);
}

// Annotation to break reformat → updateListener loop
const reformatMark = Annotation.define<true>();

// Real-time auto-format: fires on every doc change while cursor is in a table row
export const tableAutoFormat = EditorView.updateListener.of((u) => {
  if (!u.docChanged) return;
  if (u.transactions.some((tr) => tr.annotation(reformatMark))) return;

  const head = u.state.selection.main.head;
  const line = u.state.doc.lineAt(head);
  if (!isTableRow(line.text) || isSepRow(line.text)) return;

  const { start, end } = getTableBounds(u.state, line.number);
  const tableLines = collectLines(u.state, start, end);
  const formatted = formatTable(tableLines);
  const formattedText = formatted.join("\n");
  if (formattedText === tableLines.join("\n")) return; // already aligned

  const docStart = u.state.doc.line(start).from;
  const docEnd = u.state.doc.line(end).to;
  const rowIdx = line.number - start;
  const col = cursorCol(line.text, head - line.from);

  // Cursor in reformatted line: after the same content the user just typed
  const cellContent = parseCells(line.text)[col] ?? "";
  const linesBeforeRow = formatted.slice(0, rowIdx).join("\n").length;
  const rowDocStart = docStart + (rowIdx > 0 ? linesBeforeRow + 1 : 0);
  const cursor = rowDocStart + cellStart(formatted[rowIdx], col) + cellContent.length;

  u.view.dispatch({
    changes: { from: docStart, to: docEnd, insert: formattedText },
    selection: { anchor: cursor },
    annotations: [reformatMark.of(true)],
  });
});

export function buildTableKeymap(): KeyBinding[] {
  return [
    {
      key: "Tab",
      run: (view) => {
        const { state } = view;
        const head = state.selection.main.head;
        const line = state.doc.lineAt(head);
        if (!isTableRow(line.text) || isSepRow(line.text)) return false;

        const { start, end } = getTableBounds(state, line.number);
        const tableLines = collectLines(state, start, end);
        const nonSep = tableLines.filter((l) => !isSepRow(l));
        const colCount = Math.max(...nonSep.map((l) => parseCells(l).length));
        const rowIdx = line.number - start;
        const col = cursorCol(line.text, head - line.from);

        let nextRow = rowIdx;
        let nextCol = col + 1;
        if (nextCol >= colCount) {
          nextRow++;
          while (nextRow < tableLines.length && isSepRow(tableLines[nextRow])) nextRow++;
          nextCol = 0;
        }

        if (nextRow >= tableLines.length) {
          // Append new empty row
          const emptyRow = "|" + " |".repeat(colCount);
          const docEnd = state.doc.line(end).to;
          view.dispatch(
            state.update({
              changes: { from: docEnd, to: docEnd, insert: "\n" + emptyRow },
              selection: { anchor: docEnd + 1 + cellStart(emptyRow, 0) },
              userEvent: "input",
            }),
          );
        } else {
          // Navigate to next cell
          view.dispatch(
            state.update({ selection: { anchor: docCellStart(state, start + nextRow, nextCol) } }),
          );
        }
        return true;
      },
      shift: (view) => {
        const { state } = view;
        const head = state.selection.main.head;
        const line = state.doc.lineAt(head);
        if (!isTableRow(line.text) || isSepRow(line.text)) return false;

        const { start, end } = getTableBounds(state, line.number);
        const tableLines = collectLines(state, start, end);
        const nonSep = tableLines.filter((l) => !isSepRow(l));
        const colCount = Math.max(...nonSep.map((l) => parseCells(l).length));
        const rowIdx = line.number - start;
        const col = cursorCol(line.text, head - line.from);

        let prevRow = rowIdx;
        let prevCol = col - 1;
        if (prevCol < 0) {
          prevRow--;
          while (prevRow >= 0 && isSepRow(tableLines[prevRow])) prevRow--;
          prevCol = colCount - 1;
        }
        if (prevRow < 0) return true; // at first cell, absorb

        // Delete last row if empty
        if (rowIdx === tableLines.length - 1 && parseCells(line.text).every((c) => c === "")) {
          const lastLineFrom = state.doc.line(end).from;
          const cursor = docCellStart(state, start + prevRow, prevCol);
          view.dispatch(
            state.update({
              changes: { from: lastLineFrom - 1, to: state.doc.line(end).to },
              selection: { anchor: cursor },
              userEvent: "input",
            }),
          );
          return true;
        }

        view.dispatch(
          state.update({ selection: { anchor: docCellStart(state, start + prevRow, prevCol) } }),
        );
        return true;
      },
    },
    {
      key: "Enter",
      run: (view) => {
        const { state } = view;
        const head = state.selection.main.head;
        const line = state.doc.lineAt(head);
        if (!isTableRow(line.text) || isSepRow(line.text)) return false;

        const { start, end } = getTableBounds(state, line.number);
        const tableLines = collectLines(state, start, end);
        const rowIdx = line.number - start;
        if (rowIdx !== tableLines.length - 1) return false; // only last row

        const nonSep = tableLines.filter((l) => !isSepRow(l));
        const colCount = Math.max(...nonSep.map((l) => parseCells(l).length));
        const emptyRow = "|" + " |".repeat(colCount);
        const docEnd = state.doc.line(end).to;

        view.dispatch(
          state.update({
            changes: { from: docEnd, to: docEnd, insert: "\n" + emptyRow },
            selection: { anchor: docEnd + 1 + cellStart(emptyRow, 0) },
            userEvent: "input",
          }),
        );
        return true;
      },
    },
  ];
}

// Pre-formatted table template for /table command
const TABLE_TEMPLATE = formatTable([
  "| col1 | col2 | col3 |",
  "| --- | --- | --- |",
  "|  |  |  |",
]).join("\n");

export const slashCommandKeymap: KeyBinding = {
  key: "Enter",
  run: (view) => {
    const { state } = view;
    const line = state.doc.lineAt(state.selection.main.head);
    if (line.text.trim() !== "/table") return false;
    view.dispatch(
      state.update({
        changes: { from: line.from, to: line.to, insert: TABLE_TEMPLATE },
        selection: { anchor: line.from + 2 }, // cursor at first header cell
        userEvent: "input",
      }),
    );
    return true;
  },
};
