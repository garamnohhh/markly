import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

// Handing a file to another app. macOS answers in one of two ways and only one
// of them is visible: if something claims the type it launches, and if nothing
// does, NSWorkspace returns kLSApplicationNotFoundErr (OSStatus -10814) and
// *nothing happens on screen* — no picker, no App Store prompt. Measured on
// this machine with `open sample.qzx9`:
//
//   No application knows how to open URL file://…/sample.qzx9
//   (Error Domain=NSOSStatusErrorDomain Code=-10814 "kLSApplicationNotFoundErr")
//
// So a silent failure is the case to design for. We try first and react to the
// error rather than asking LaunchServices up front: the check costs a query per
// file, its answer changes the moment an app is installed, and the common case
// is that the open just works.
export type HandoffResult = { ok: true } | { ok: false; noApp: boolean; message: string };

const NO_APP = /-10814|ApplicationNotFound|No application knows/i;

export async function openWithOtherApp(absPath: string): Promise<HandoffResult> {
  try {
    await openPath(absPath);
    return { ok: true };
  } catch (e) {
    const message = String(e);
    return { ok: false, noApp: NO_APP.test(message), message };
  }
}

export async function revealInFinder(absPath: string): Promise<void> {
  try {
    await revealItemInDir(absPath);
  } catch {
    /* nothing useful to say if even Finder refuses */
  }
}
