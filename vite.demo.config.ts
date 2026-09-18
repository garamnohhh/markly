import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Build-only. Produces the file we hand to the designer: the app's own
// components with the Tauri bridge stubbed, emitted as one classic script so it
// opens from a double-click (a module script is blocked under file://).
//
// The desktop build is untouched — that is still vite.config.ts.
export default defineConfig({
  root: path.resolve(__dirname, "demo"),
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Shiki ships ~200 language chunks. Inlined into one file that is dead
      // weight; the sample content uses seven.
      { find: /^shiki\/langs$/, replacement: path.resolve(__dirname, "demo/shim-shiki-langs.ts") },
      // No diagram in the sample content, and mermaid is 600KB.
      { find: /^mermaid$/, replacement: path.resolve(__dirname, "demo/shim-mermaid.ts") },
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "demo-dist"),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "pirep.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
