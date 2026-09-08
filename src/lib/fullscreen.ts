import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";

// One owner of the app's fullscreen state.
//
// Three things went wrong when the slideshow drove this from an effect:
//
//  1. React StrictMode double-invokes effects in dev, so mount → cleanup →
//     mount fired setFullscreen(true) → (false) → (true). Measured through the
//     IPC bridge: three calls on open, two on close. That is the title bar
//     appearing and vanishing twice on the way in.
//  2. macOS moves a fullscreen window to its own Space and the web view loses
//     first responder, so arrow keys went nowhere until you clicked — and the
//     click advanced a slide.
//  3. A borderless, transparent window does not reliably come back to its own
//     frame after a fullscreen cycle, so the window ended up somewhere else.
//
// So: reference-count the owners, ignore a request that matches the state we
// are already in, serialise the transitions, and remember the frame ourselves.

let live = 0;
let desired = false;
let queue: Promise<void> = Promise.resolve();
let saved: { pos: PhysicalPosition; size: PhysicalSize } | null = null;

const inTauri = () => "__TAURI_INTERNALS__" in window;

// setFullscreen resolves before AppKit's animated Space transition finishes, and
// a toggle that arrives during one is dropped. Hold the queue across it.
const settle = () => new Promise<void>((r) => setTimeout(r, 650));

function run(fn: () => Promise<void>): Promise<void> {
  queue = queue.then(fn).catch(() => {});
  return queue;
}

/** Enter fullscreen. Safe to call twice; only the first owner does anything. */
export function acquireFullscreen(): Promise<void> {
  live++;
  if (live !== 1 || desired) return queue;
  desired = true;
  if (!inTauri()) return queue;
  return run(async () => {
    const win = getCurrentWindow();
    try {
      saved = { pos: await win.outerPosition(), size: await win.outerSize() };
    } catch {
      saved = null;
    }
    await win.setFullscreen(true);
    await settle();
  });
}

/** Leave fullscreen and put the window back where it was. */
export function releaseFullscreen(): Promise<void> {
  live = Math.max(0, live - 1);
  // StrictMode unmounts and remounts synchronously, so let the remount put the
  // count back up before acting on zero.
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      if (live !== 0 || !desired) return resolve();
      desired = false;
      if (!inTauri()) return resolve();
      void run(async () => {
        const win = getCurrentWindow();
        await win.setFullscreen(false);
        await settle();
        if (saved) {
          try {
            await win.setPosition(saved.pos);
            await win.setSize(saved.size);
          } catch { /* the window closed under us */ }
          saved = null;
        }
      }).then(resolve);
    }, 0);
  });
}
