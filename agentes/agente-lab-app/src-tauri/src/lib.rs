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
    // Usa el binario sidecar que Tauri empaquetó automáticamente (agente-lab.exe)
    let agente_path = app_dir.join("agente-lab.exe");
    
    let mut cmd = Command::new(&agente_path);
    // Configura el directorio de trabajo para que el agente encuentre config.json
    cmd.stdout(Stdio::piped())
       .stderr(Stdio::piped())
       .current_dir(&app_dir);

    let mut child = cmd.spawn()
        .map_err(|e| format!("No se pudo iniciar el ejecutable nativo del agente ({}): {}", agente_path.display(), e))?;

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

#[tauri::command]
fn leer_config() -> Result<String, String> {
    let app_dir = get_app_dir();
    let config_path = app_dir.join("config.json");
    std::fs::read_to_string(&config_path)
        .map_err(|_| format!("config.json no encontrado en {}", app_dir.display()))
}

#[tauri::command]
fn guardar_config(contenido: String) -> Result<String, String> {
    let app_dir = get_app_dir();
    let config_path = app_dir.join("config.json");
    std::fs::write(&config_path, contenido)
        .map_err(|e| format!("Error al guardar en {}: {}", app_dir.display(), e))?;
    Ok("Configuración guardada correctamente".to_string())
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
            estado_agente,
            leer_config,
            guardar_config
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar la app del agente");
}
