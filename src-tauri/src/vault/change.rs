use super::db::{pirep_dir, storage_key};
use super::diff::{DiffStats, WordOp};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChangeRecord {
    pub from: u32,
    pub to: u32,
    pub at: u64,
    pub source: String, // "external" | "in-app" | "ai" | "revert"
    pub stats: DiffStats,
    pub ops: Vec<WordOp>,
}

fn changes_path(root: &Path, doc_id: &str) -> PathBuf {
    pirep_dir(root)
        .join("changes")
        .join(format!("{}.json", storage_key(doc_id)))
}

pub fn load_changes(root: &Path, doc_id: &str) -> Vec<ChangeRecord> {
    fs::read_to_string(changes_path(root, doc_id))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn append_change(root: &Path, doc_id: &str, rec: ChangeRecord) -> Result<(), String> {
    let mut all = load_changes(root, doc_id);
    all.push(rec);
    let p = changes_path(root, doc_id);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&all).map_err(|e| e.to_string())?;
    fs::write(&p, json).map_err(|e| e.to_string())
}
