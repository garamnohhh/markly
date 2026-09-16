//! `marklyfile://` — serves a vault file to the HTML preview iframe.
//!
//! HTML previews render from a blob: URL, which has no directory, so a document's
//! relative references (`./support.js`, `_ds/styles.css`, `assets/logo.svg`) resolve
//! against nothing and are never even requested. Injecting a `<base>` fixes that, but
//! only if the base URL is a real *directory* URL.
//!
//! Tauri's built-in `asset://` can't be that base: its handler percent-decodes the whole
//! path at once, so `convertFileSrc` has to encode every `/` as `%2F` — collapsing the
//! path into a single opaque segment. Relative URLs then resolve against the origin root
//! instead of the file's folder. This scheme keeps the separators and decodes per segment,
//! so `<base>` works and nested references (a stylesheet's own `url(...)` fonts) work too.

use crate::commands::VaultState;
use std::path::{Component, Path, PathBuf};
use tauri::{Manager, UriSchemeContext, Runtime};
use tauri::http::{Request, Response};

pub const SCHEME: &str = "marklyfile";

/// URL path (`/Users/g/My%20Base/deck/support.js`) → absolute filesystem path.
/// Decoding is per segment so that `%20` in a folder name survives. A decoded
/// segment containing a separator just yields a different path — `resolve` still
/// canonicalizes and re-checks containment, so it can't escape the vault.
fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(byte) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn decode_path(url_path: &str) -> PathBuf {
    let mut out = PathBuf::from("/");
    for seg in url_path.split('/').filter(|s| !s.is_empty()) {
        out.push(percent_decode(seg));
    }
    out
}

fn mime_for(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "json" | "map" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "pdf" => "application/pdf",
        "csv" => "text/csv; charset=utf-8",
        "txt" | "md" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

/// Reject anything that isn't a plain file inside the open vault. `..` is refused
/// outright rather than normalised, and the vault root is re-read per request so a
/// closed or switched vault stops serving immediately.
fn resolve(root: Option<PathBuf>, url_path: &str) -> Result<PathBuf, u16> {
    let root = root.ok_or(403u16)?;
    let path = decode_path(url_path);
    if path.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err(403);
    }
    let root = root.canonicalize().map_err(|_| 403u16)?;
    let real = path.canonicalize().map_err(|_| 404u16)?;
    if !real.starts_with(&root) || !real.is_file() {
        return Err(403);
    }
    Ok(real)
}

pub fn handler<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let decoded = decode_path(request.uri().path());
    let root = ctx
        .app_handle()
        .state::<VaultState>()
        .root
        .lock()
        .unwrap()
        .clone();

    let response = match resolve(root, request.uri().path()) {
        Ok(path) => match std::fs::read(&path) {
            Ok(bytes) => Response::builder()
                .status(200)
                .header("Content-Type", mime_for(&path))
                .header("Access-Control-Allow-Origin", "*")
                .body(bytes)
                .unwrap(),
            Err(_) => Response::builder().status(404).body(Vec::new()).unwrap(),
        },
        Err(code) => Response::builder().status(code).body(Vec::new()).unwrap(),
    };
    eprintln!(
        "[marklyfile] uri={} decoded={} status={}",
        request.uri(),
        decoded.display(),
        response.status()
    );
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_segments_and_keeps_separators() {
        assert_eq!(decode_path("/Users/g/My%20Base/deck/support.js"),
                   PathBuf::from("/Users/g/My Base/deck/support.js"));
        // Korean folder names round-trip.
        assert_eq!(decode_path("/v/%ED%95%9C%EA%B8%80/a.css"),
                   PathBuf::from("/v/한글/a.css"));
        // Empty segments collapse; a stray encoded separator is harmless because
        // `resolve` re-checks containment after canonicalizing.
        assert_eq!(decode_path("//v///a.css"), PathBuf::from("/v/a.css"));
    }

    #[test]
    fn refuses_traversal_and_paths_outside_the_vault() {
        let dir = std::env::temp_dir().join(format!("markly-assets-{}", std::process::id()));
        let vault = dir.join("vault");
        std::fs::create_dir_all(vault.join("deck")).unwrap();
        std::fs::write(vault.join("deck/support.js"), "ok").unwrap();
        std::fs::write(dir.join("outside.txt"), "no").unwrap();

        let root = Some(vault.clone());
        let inside = format!("{}/deck/support.js", vault.to_str().unwrap());
        assert!(resolve(root.clone(), &inside).is_ok());

        let outside = format!("{}/outside.txt", dir.to_str().unwrap());
        assert_eq!(resolve(root.clone(), &outside), Err(403));

        let traversal = format!("{}/deck/../../outside.txt", vault.to_str().unwrap());
        assert_eq!(resolve(root.clone(), &traversal), Err(403));

        // A directory is not servable, and no open vault serves nothing.
        assert_eq!(resolve(root.clone(), vault.to_str().unwrap()), Err(403));
        assert_eq!(resolve(None, &inside), Err(403));

        std::fs::remove_dir_all(&dir).ok();
    }
}
