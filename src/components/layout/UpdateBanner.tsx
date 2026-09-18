import { useEffect, useState } from "react";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

// One check per app launch, not per mount — the shell remounts on every view
// change. A failed check stays silent: nobody wants a network error on startup.
let checked = false;

export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (checked) return;
    checked = true;
    void check()
      .then((next) => next && setUpdate(next))
      .catch(() => { /* offline, or the release has no updater assets */ });
  }, []);

  if (!update || dismissed) return null;

  async function install() {
    if (!update) return;
    let total = 0;
    let downloaded = 0;
    setStatus("Downloading… 0%");
    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") downloaded += event.data.chunkLength;
        const percent = total ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
        setStatus(event.event === "Finished" ? "Installing… 100%" : `Downloading… ${percent}%`);
      });
      await relaunch();
    } catch (e) {
      setStatus(`Update failed: ${String(e)}`);
    }
  }

  return (
    <div className="update-banner" role="status">
      <span>Version {update.version} is available.</span>
      {status ? (
        <span className="update-banner-status">{status}</span>
      ) : (
        <>
          <button type="button" onClick={() => void install()}>Install and restart</button>
          <button type="button" className="update-banner-dismiss" onClick={() => setDismissed(true)}>
            Later
          </button>
        </>
      )}
    </div>
  );
}
