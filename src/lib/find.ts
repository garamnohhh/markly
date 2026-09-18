export type FindMatch = { from: number; to: number };

export type FindTarget = {
  getText: () => string;
  reveal: (match: FindMatch, scroll?: boolean) => DOMRect[];
  clear?: () => void;
};

const registry = globalThis as typeof globalThis & { __pirepFindTarget?: FindTarget | null };

export function registerFindTarget(target: FindTarget): () => void {
  registry.__pirepFindTarget = target;
  return () => {
    if (registry.__pirepFindTarget === target) registry.__pirepFindTarget = null;
  };
}

export function getFindTarget(): FindTarget {
  return registry.__pirepFindTarget ?? createDomFindTarget();
}

export function findOccurrences(text: string, query: string): FindMatch[] {
  if (!query) return [];
  const haystack = text.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  const matches: FindMatch[] = [];
  for (let from = 0; ; from += needle.length) {
    from = haystack.indexOf(needle, from);
    if (from < 0) return matches;
    matches.push({ from, to: from + query.length });
  }
}

export function wrapFindIndex(index: number, total: number): number {
  return total ? ((index % total) + total) % total : -1;
}

function createDomFindTarget(): FindTarget {
  type Piece = { node: Text; from: number; to: number };
  let pieces: Piece[] = [];
  let selectionDocument: Document | null = null;

  function context(): { root: ParentNode; frame: HTMLIFrameElement | null } {
    const root = document.querySelector<HTMLElement>(".doc-scroll");
    if (root) return { root, frame: null };
    const frame = document.querySelector<HTMLIFrameElement>("iframe");
    if (frame?.contentDocument?.body) return { root: frame.contentDocument.body, frame };
    return { root: document.body, frame: null };
  }

  function getText(): string {
    const { root } = context();
    const doc = root.ownerDocument ?? document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("[data-find-exclude]")) return NodeFilter.FILTER_REJECT;
        const range = doc.createRange();
        range.selectNodeContents(node);
        return range.getClientRects().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    pieces = [];
    let text = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const value = node.textContent ?? "";
      pieces.push({ node: node as Text, from: text.length, to: text.length + value.length });
      text += value;
    }
    return text;
  }

  function reveal(match: FindMatch, scroll = true): DOMRect[] {
    const start = pieces.find((piece) => piece.to > match.from);
    const end = [...pieces].reverse().find((piece) => piece.from < match.to);
    if (!start || !end) return [];
    const doc = start.node.ownerDocument;
    const range = doc.createRange();
    range.setStart(start.node, Math.max(0, match.from - start.from));
    range.setEnd(end.node, Math.min(end.node.length, match.to - end.from));
    if (scroll) start.node.parentElement?.scrollIntoView({ block: "center", behavior: "auto" });
    const selection = doc.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionDocument = doc;
    return [];
  }

  return {
    getText,
    reveal,
    clear: () => {
      selectionDocument?.getSelection()?.removeAllRanges();
      selectionDocument = null;
    },
  };
}
