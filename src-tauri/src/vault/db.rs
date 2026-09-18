use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use super::hash;

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
    // First-indexed time (event-based, like mtime). Defaults to 0 for docs from
    // pre-`created` DBs; scan backfills those to mtime.
    #[serde(default)]
    pub created: u64,
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
}

impl Default for Db {
    fn default() -> Self {
        Self {
            version: schema_version(),
            docs: BTreeMap::new(),
        }
    }
}

pub fn pirep_dir(root: &Path) -> PathBuf {
    root.join(".pirep")
}

fn move_dir(source: &Path, target: &Path) -> Result<(), String> {
    fs::rename(source, target).map_err(|e| e.to_string())
}

pub fn migrate_legacy_dir(root: &Path) -> Result<(), String> {
    let source = root.join(".markly");
    let target = pirep_dir(root);
    if target.exists() || !source.exists() {
        return Ok(());
    }
    move_dir(&source, &target)
}

// Storage-safe key for snapshot dirs / change files.
// ponytail: flat slash-escape; if the result exceeds 200 chars (macOS NAME_MAX=255),
// truncate to 190 and append 16-char sha256 suffix to stay unique.
pub fn storage_key(doc_id: &str) -> String {
    let base = doc_id.replace('/', "__");
    if base.len() <= 200 {
        return base;
    }
    let h = &hash::sha256_hex(doc_id)[..16];
    format!("{}__{h}", &base[..190])
}

pub fn load(root: &Path) -> Db {
    let p = pirep_dir(root).join("db.json");
    fs::read_to_string(&p)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(root: &Path, db: &Db) -> Result<(), String> {
    let dir = pirep_dir(root);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(db).map_err(|e| e.to_string())?;
    let tmp = dir.join("db.json.tmp");
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    // atomic swap — survives a crash mid-write
    fs::rename(&tmp, dir.join("db.json")).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::migrate_legacy_dir;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("pirep-migration-{name}-{}-{unique}", std::process::id()))
    }

    #[test]
    fn migrates_legacy_vault_directory() {
        let root = temp_root("moves");
        fs::create_dir_all(root.join(".markly/snapshots")).unwrap();
        fs::write(root.join(".markly/db.json"), "history").unwrap();

        migrate_legacy_dir(&root).unwrap();

        assert!(!root.join(".markly").exists());
        assert_eq!(fs::read_to_string(root.join(".pirep/db.json")).unwrap(), "history");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn keeps_legacy_directory_when_pirep_exists() {
        let root = temp_root("existing");
        fs::create_dir_all(root.join(".markly")).unwrap();
        fs::create_dir_all(root.join(".pirep")).unwrap();
        fs::write(root.join(".markly/db.json"), "legacy").unwrap();
        fs::write(root.join(".pirep/db.json"), "current").unwrap();

        migrate_legacy_dir(&root).unwrap();

        assert_eq!(fs::read_to_string(root.join(".markly/db.json")).unwrap(), "legacy");
        assert_eq!(fs::read_to_string(root.join(".pirep/db.json")).unwrap(), "current");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn keeps_source_when_move_fails() {
        let root = temp_root("failure");
        let source = root.join("source/.markly");
        let target = root.join("missing/.pirep");
        fs::create_dir_all(&source).unwrap();
        fs::write(source.join("db.json"), "history").unwrap();

        assert!(super::move_dir(&source, &target).is_err());
        assert_eq!(fs::read_to_string(source.join("db.json")).unwrap(), "history");
        assert!(!target.exists());
        fs::remove_dir_all(root).unwrap();
    }
}
