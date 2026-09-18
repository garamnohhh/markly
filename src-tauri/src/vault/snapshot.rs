use super::db::{pirep_dir, storage_key};
use std::fs;
use std::path::{Path, PathBuf};

fn snapshot_path(root: &Path, doc_id: &str, version: u32) -> PathBuf {
    pirep_dir(root)
        .join("snapshots")
        .join(storage_key(doc_id))
        .join(format!("v{version}.md"))
}

pub fn write_snapshot(root: &Path, doc_id: &str, version: u32, content: &str) -> Result<(), String> {
    let p = snapshot_path(root, doc_id, version);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&p, content).map_err(|e| e.to_string())
}

pub fn read_snapshot(root: &Path, doc_id: &str, version: u32) -> Result<String, String> {
    fs::read_to_string(snapshot_path(root, doc_id, version)).map_err(|e| e.to_string())
}
