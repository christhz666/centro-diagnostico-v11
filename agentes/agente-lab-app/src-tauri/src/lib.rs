use tauri::{AppHandle, Emitter, Manager};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio, Child};
use std::thread;
use std::path::PathBuf;

struct AgentState {
    child: Option<Child>,
    running: bool,
}

type SharedState = Arc<Mutex<AgentState>>;

/// Obtiene la ruta al directorio donde está el ejecutable de la app
fn get_app_dir() -> PathBuf {
    std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(&PathBuf::new())
        .to_path_buf()
}

#[tauri::command]
fn iniciar_agente(app: AppHandle, state: tauri::State<'_, SharedState>) -> Result<String, String> {
    let mut s = state.lock().unwrap();
    if s.running {
        return Ok("El agente ya está corriendo".to_string());
    }

    let app_dir = get_app_dir();
    // Busca agente.js junto al .exe de la app o en la carpeta resources
    let agente_path = app_dir.join("agente.js");
    
    let mut cmd = Command::new("node");
    cmd.arg(&agente_path)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped())
       .current_dir(&app_dir);

    let mut child = cmd.spawn()
        .map_err(|e| format!("No se pudo iniciar el agente: {}. ¿Está Node.js instalado?", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    s.running = true;
    s.child = Some(child);
    drop(s);

    // Thread para stdout
    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_clone.emit("agente-log", line);
        }
    });

    // Thread para stderr
    let app_clone2 = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_clone2.emit("agente-log", format!("[ERROR] {}", line));
        }
    });

    let _ = app.emit("agente-estado", true);
    Ok("Agente iniciado correctamente".to_string())
}

#[tauri::command]
fn detener_agente(app: AppHandle, state: tauri::State<'_, SharedState>) -> Result<String, String> {
    let mut s = state.lock().unwrap();
    if let Some(mut child) = s.child.take() {
        let _ = child.kill();
    }
    s.running = false;
    let _ = app.emit("agente-estado", false);
    Ok("Agente detenido".to_string())
}

#[tauri::command]
fn estado_agente(state: tauri::State<'_, SharedState>) -> bool {
    state.lock().unwrap().running
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_state: SharedState = Arc::new(Mutex::new(AgentState {
        child: None,
        running: false,
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .manage(shared_state)
        .invoke_handler(tauri::generate_handler![
            iniciar_agente,
            detener_agente,
            estado_agente
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar la app del agente");
}
