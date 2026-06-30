use serde::{Deserialize, Serialize};
use similar::{ChangeTag, TextDiff};

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct DiffStats {
    pub additions: u32,
    pub deletions: u32,
}

// op: "eq" | "del" | "ins"
#[derive(Serialize, Deserialize, Clone)]
pub struct WordOp {
    pub op: String,
    pub text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffResult {
    pub from: u32,
    pub to: u32,
    pub ops: Vec<WordOp>,
    pub stats: DiffStats,
}

// Word-level diff via `similar`. Returns merged runs of eq/del/ins.
pub fn word_diff(old: &str, new: &str) -> (Vec<WordOp>, DiffStats) {
    let diff = TextDiff::from_words(old, new);
    let mut ops: Vec<WordOp> = Vec::new();
    let mut stats = DiffStats::default();

    for change in diff.iter_all_changes() {
        let op = match change.tag() {
            ChangeTag::Equal => "eq",
            ChangeTag::Delete => {
                stats.deletions += 1;
                "del"
            }
            ChangeTag::Insert => {
                stats.additions += 1;
                "ins"
            }
        };
        let text = change.value().to_string();
        // merge consecutive same-op tokens for compact rendering
        match ops.last_mut() {
            Some(last) if last.op == op => last.text.push_str(&text),
            _ => ops.push(WordOp {
                op: op.to_string(),
                text,
            }),
        }
    }
    (ops, stats)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn word_diff_replaces_one_word() {
        let (ops, stats) = word_diff("hello world", "hello rust");
        // expect a kept "hello ", a deleted "world", an inserted "rust"
        assert!(ops.iter().any(|o| o.op == "eq" && o.text.contains("hello")));
        assert!(ops.iter().any(|o| o.op == "del" && o.text.contains("world")));
        assert!(ops.iter().any(|o| o.op == "ins" && o.text.contains("rust")));
        assert_eq!(stats.deletions, 1);
        assert_eq!(stats.additions, 1);
    }
}
