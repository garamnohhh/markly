use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct DocEntry {
    pub doc_id: String,
    pub path: String,
    pub title: String,
    pub current_version: u32,
    pub last_read_version: u32,
    #[serde(default)]
    pub last_decided_version: u32,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    pub hash: String,
    pub mtime: u64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub scan_on_startup: bool,
    pub read_lock: bool,
    pub word_level_diff: bool,
    pub mark_read_on_close: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            scan_on_startup: true,
            read_lock: true,
            word_level_diff: true,
            mark_read_on_close: false,
        }
    }
}

fn schema_version() -> u32 {
    1
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Db {
    #[serde(default = "schema_version")]
    pub version: u32,
    #[serde(default)]
    pub docs: BTreeMap<String, DocEntry>,
    #[serde(default)]
    pub settings: Settings,
}

impl Default for Db {
    fn default() -> Self {
        Self {
            version: schema_version(),
            docs: BTreeMap::new(),
            settings: Settings::default(),
        }
    }
}

pub fn markly_dir(root: &Path) -> PathBuf {
    root.join(".markly")
}

// Storage-safe key for snapshot dirs / change files.
// ponytail: flat slash-escape, collides only if a real name contains "__".
pub fn storage_key(doc_id: &str) -> String {
    doc_id.replace('/', "__")
}

pub fn load(root: &Path) -> Db {
    let p = markly_dir(root).join("db.json");
    fs::read_to_string(&p)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(root: &Path, db: &Db) -> Result<(), String> {
    let dir = markly_dir(root);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(db).map_err(|e| e.to_string())?;
    let tmp = dir.join("db.json.tmp");
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    // atomic swap — survives a crash mid-write
    fs::rename(&tmp, dir.join("db.json")).map_err(|e| e.to_string())?;
    Ok(())
}
