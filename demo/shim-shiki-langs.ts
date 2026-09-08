// Build-only shim. The app pulls every Shiki language, which rollup emits as
// ~200 chunks — fine for the desktop build, useless weight for a file we hand
// to a designer. The demo keeps the handful the sample content uses.
import ts from "shiki/langs/typescript.mjs";
import js from "shiki/langs/javascript.mjs";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import md from "shiki/langs/markdown.mjs";
import html from "shiki/langs/html.mjs";
import css from "shiki/langs/css.mjs";

export const bundledLanguages = {
  typescript: () => Promise.resolve({ default: ts }),
  javascript: () => Promise.resolve({ default: js }),
  bash: () => Promise.resolve({ default: bash }),
  json: () => Promise.resolve({ default: json }),
  markdown: () => Promise.resolve({ default: md }),
  html: () => Promise.resolve({ default: html }),
  css: () => Promise.resolve({ default: css }),
} as unknown as Record<string, () => Promise<{ default: unknown }>>;

export type BundledLanguage = string;
export default bundledLanguages;
