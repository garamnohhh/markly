use crate::vault;
use crate::vault::change::ChangeRecord;
use crate::vault::db::{Db, DocEntry};
use crate::vault::diff::DiffResult;
use crate::vault::DocContent;
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};

pub struct VaultState {
    pub root: Mutex<Option<PathBuf>>,
    watcher: Mutex<Option<RecommendedWatcher>>,
}

impl Default for VaultState {
    fn default() -> Self {
        Self {
            root: Mutex::new(None),
            watcher: Mutex::new(None),
        }
    }
}

fn get_root(state: &State<VaultState>) -> Result<PathBuf, String> {
    state
        .root
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "no vault open".to_string())
}

#[tauri::command]
pub fn scan_vault(
    path: String,
    state: State<VaultState>,
    app: tauri::AppHandle,
) -> Result<Db, String> {
    let r = PathBuf::from(&path);
    let db = vault::scan(&r)?;
    *state.root.lock().unwrap() = Some(r.clone());

    // (Re)start file watcher — debounce 500ms to avoid scan storms
    let markly = r.join(".markly");
    let app_h = app.clone();
    let last_ms2 = Arc::new(AtomicU64::new(0));
    let last_ms3 = last_ms2.clone();

    let mut w = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(ev) = res {
            let relevant = ev.paths.iter().any(|p| {
                !p.starts_with(&markly)
                    && p.extension().map(|e| e == "md").unwrap_or(false)
            });
            if relevant {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;
                let prev = last_ms3.load(Ordering::Relaxed);
                if now.saturating_sub(prev) > 500 {
                    last_ms3.store(now, Ordering::Relaxed);
                    app_h.emit("vault-changed", ()).ok();
                }
            }
        }
    })
    .map_err(|e| e.to_string())?;

    w.watch(&r, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    *state.watcher.lock().unwrap() = Some(w);

    Ok(db)
}

#[tauri::command]
pub fn read_doc(doc_id: String, state: State<VaultState>) -> Result<DocContent, String> {
    vault::read_doc(&get_root(&state)?, &doc_id)
}

#[tauri::command]
pub fn write_doc(doc_id: String, content: String, state: State<VaultState>) -> Result<Db, String> {
    vault::write_doc(&get_root(&state)?, &doc_id, &content, "in-app")
}

#[tauri::command]
pub fn mark_read(doc_id: String, state: State<VaultState>) -> Result<Db, String> {
    vault::mark_read(&get_root(&state)?, &doc_id)
}

#[tauri::command]
pub fn list_updates(state: State<VaultState>) -> Result<Vec<DocEntry>, String> {
    Ok(vault::list_updates(&get_root(&state)?))
}

#[tauri::command]
pub fn diff(
    doc_id: String,
    from: u32,
    to: u32,
    state: State<VaultState>,
) -> Result<DiffResult, String> {
    vault::diff(&get_root(&state)?, &doc_id, from, to)
}

#[tauri::command]
pub fn list_changes(doc_id: String, state: State<VaultState>) -> Result<Vec<ChangeRecord>, String> {
    Ok(vault::list_changes(&get_root(&state)?, &doc_id))
}

#[tauri::command]
pub fn revert(doc_id: String, version: u32, state: State<VaultState>) -> Result<Db, String> {
    vault::revert(&get_root(&state)?, &doc_id, version)
}

#[tauri::command]
pub fn create_doc(
    rel_path: String,
    content: String,
    state: State<VaultState>,
) -> Result<Db, String> {
    vault::create_doc(&get_root(&state)?, &rel_path, &content)
}

#[tauri::command]
pub fn rename_doc(
    doc_id: String,
    new_rel_path: String,
    state: State<VaultState>,
) -> Result<Db, String> {
    vault::rename_doc(&get_root(&state)?, &doc_id, &new_rel_path)
}

#[tauri::command]
pub fn delete_doc(doc_id: String, state: State<VaultState>) -> Result<Db, String> {
    vault::delete_doc(&get_root(&state)?, &doc_id)
}

#[tauri::command]
pub fn accept_change(doc_id: String, state: State<VaultState>) -> Result<Db, String> {
    vault::accept_change(&get_root(&state)?, &doc_id)
}

#[tauri::command]
pub fn decide_version(doc_id: String, version: u32, state: State<VaultState>) -> Result<Db, String> {
    vault::decide_version(&get_root(&state)?, &doc_id, version)
}

#[tauri::command]
pub fn copy_diagram_image(app: tauri::AppHandle, svg: String) -> Result<(), String> {
    use resvg::{tiny_skia, usvg};
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let mut opts = usvg::Options::default();
    opts.font_family = "Helvetica Neue".to_string();
    opts.fontdb_mut().load_system_fonts();
    let tree = usvg::Tree::from_str(&svg, &opts).map_err(|e| e.to_string())?;
    let size = tree.size();
    let w = (size.width() as u32).max(1);
    let h = (size.height() as u32).max(1);
    let mut pixmap = tiny_skia::Pixmap::new(w, h).ok_or("pixmap alloc failed")?;
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
    let png = pixmap.encode_png().map_err(|e| e.to_string())?;
    let image = tauri::image::Image::from_bytes(&png).map_err(|e| e.to_string())?;
    app.clipboard().write_image(&image).map_err(|e| e.to_string())
}
