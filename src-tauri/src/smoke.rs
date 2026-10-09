//! Test-build-only native IPC smoke driver. No commands or flags exist in normal builds.
use std::{path::PathBuf, sync::atomic::{AtomicBool, Ordering}};
use tauri::{Manager, Runtime};
use crate::error::{AppError, AppResult};

pub struct SmokeState {
    pub directory: PathBuf,
    pub stage: String,
    started: AtomicBool,
}

pub fn configuration() -> AppResult<SmokeState> {
    let args: Vec<String> = std::env::args().collect();
    let directory = args.iter().position(|arg| arg == "--smoke-test-dir")
        .and_then(|index| args.get(index + 1)).ok_or(AppError::Storage)?;
    let stage = args.iter().position(|arg| arg == "--smoke-test-stage")
        .and_then(|index| args.get(index + 1)).ok_or(AppError::Storage)?.clone();
    let directory = PathBuf::from(directory);
    if !directory.is_absolute() || !matches!(stage.as_str(), "initial" | "reopen" | "scaled" | "cleanup") {
        return Err(AppError::Storage);
    }
    let directory = directory.canonicalize()?;
    if std::fs::read_to_string(directory.join(".meridian-smoke"))? != "Meridian isolated smoke test\n" {
        return Err(AppError::Storage);
    }
    if stage == "initial" && directory.join("library.db").exists() { return Err(AppError::Storage); }
    if stage != "initial" && !directory.join("initial.json").exists() { return Err(AppError::Storage); }
    Ok(SmokeState {directory, stage, started: AtomicBool::new(false)})
}

#[tauri::command]
pub fn smoke_context(state: tauri::State<SmokeState>) -> AppResult<serde_json::Value> {
    let expected = if state.stage != "initial" {
        Some(serde_json::from_slice::<serde_json::Value>(&std::fs::read(state.directory.join("initial.json"))?)?)
    } else { None };
    Ok(serde_json::json!({"stage":state.stage, "expected":expected}))
}

#[tauri::command]
pub fn smoke_finish(app: tauri::AppHandle, state: tauri::State<SmokeState>, report: serde_json::Value) -> AppResult<()> {
    let passed = report.get("passed").and_then(|v|v.as_bool()).unwrap_or(false);
    std::fs::write(state.directory.join(format!("{}.json", state.stage)), serde_json::to_vec_pretty(&report)?)?;
    app.exit(if passed {0} else {1});
    Ok(())
}

pub fn start<R: Runtime>(webview: &tauri::Webview<R>, payload: &tauri::webview::PageLoadPayload<'_>) {
    if payload.event() != tauri::webview::PageLoadEvent::Finished { return; }
    let state = webview.state::<SmokeState>();
    if state.started.swap(true, Ordering::SeqCst) { return; }
    if state.stage == "scaled" {
        if let Err(error) = webview.set_zoom(2.0) {
            let _ = std::fs::write(state.directory.join("scaled.json"), serde_json::json!({"passed":false,"error":error.to_string()}).to_string());
            webview.app_handle().exit(1);
            return;
        }
    }
    if let Err(error) = webview.eval(include_str!("smoke.js")) {
        let _ = std::fs::write(state.directory.join(format!("{}.json",state.stage)), serde_json::json!({"passed":false,"error":error.to_string()}).to_string());
        webview.app_handle().exit(1);
    }
}
