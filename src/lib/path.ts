export function resolveDocRelative(href: string, docPath: string): string | null {
  if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return null;

  let path: string;
  try {
    path = decodeURIComponent(href.split(/[?#]/, 1)[0]);
  } catch {
    return null;
  }
  if (!path) return null;

  const parts = docPath.split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/") || null;
}

export type AbsoluteFileLink =
  | { kind: "vault"; rel: string }
  | { kind: "external"; path: string };

export function resolveAbsoluteFileLink(
  href: string,
  vaultRoot: string | null,
): AbsoluteFileLink | null {
  if (!href.startsWith("/") && !href.startsWith("file://")) return null;

  try {
    const url = new URL(href.startsWith("file://") ? href : `file://${href}`);
    if (url.protocol !== "file:" || (url.hostname && url.hostname !== "localhost")) return null;
    const abs = decodeURIComponent(url.pathname);
    const root = vaultRoot?.replace(/\/+$/, "");
    if (root && (abs === root || abs.startsWith(`${root}/`))) {
      const rel = abs.slice(root.length).replace(/^\/+/, "");
      return rel ? { kind: "vault", rel } : null;
    }
    return { kind: "external", path: abs };
  } catch {
    return null;
  }
}
