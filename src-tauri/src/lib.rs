mod commands;
mod vault;

use commands::VaultState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(VaultState::default())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon-dock.png"))
                    .expect("brand icon");
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_icon(icon);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_vault,
            commands::read_doc,
            commands::write_doc,
            commands::mark_read,
            commands::list_updates,
            commands::diff,
            commands::list_changes,
            commands::revert,
            commands::create_doc,
            commands::rename_doc,
            commands::delete_doc,
            commands::accept_change,
            commands::decide_version,
            commands::copy_diagram_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
