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
