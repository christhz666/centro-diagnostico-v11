use tauri::{AppHandle, Emitter, Manager};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio, Child};
use std::thread;
use std::path::PathBuf;
use std::time::Duration;

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

/// Config por defecto — preconfigurado con el VPS
fn config_default() -> serde_json::Value {
    serde_json::json!({
        "servidor": {
            "url": "https://miesperanzalab.duckdns.org",
            "apiKey": ""
        },
        "equipos": [],
        "intervaloReconexion": 10000,
        "logArchivo": "agente.log"
    })
}

#[tauri::command]
fn iniciar_agente(app: AppHandle, state: tauri::State<'_, SharedState>) -> Result<String, String> {
    let mut s = state.lock().unwrap();
    if s.running {
        return Ok("El agente ya está corriendo".to_string());
    }

    let app_dir = get_app_dir();
    let agente_path = app_dir.join("agente-lab.exe");

    let mut cmd = Command::new(&agente_path);
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

    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_clone.emit("agente-log", line);
        }
    });

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

/// Lee config.json — si NO existe, lo crea automáticamente con valores por defecto
#[tauri::command]
fn leer_config() -> Result<String, String> {
    let app_dir = get_app_dir();
    let config_path = app_dir.join("config.json");

    if !config_path.exists() {
        // Auto-crear config.json con valores por defecto
        let default = config_default();
        let contenido = serde_json::to_string_pretty(&default)
            .map_err(|e| format!("Error serializando config por defecto: {}", e))?;
        std::fs::write(&config_path, &contenido)
            .map_err(|e| format!("Error creando config.json en {}: {}", app_dir.display(), e))?;
        return Ok(contenido);
    }

    std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Error leyendo config.json: {}", e))
}

#[tauri::command]
fn guardar_config(contenido: String) -> Result<String, String> {
    let app_dir = get_app_dir();
    let config_path = app_dir.join("config.json");
    std::fs::write(&config_path, contenido)
        .map_err(|e| format!("Error al guardar en {}: {}", app_dir.display(), e))?;
    Ok("Configuración guardada correctamente".to_string())
}

/// Lista todos los puertos COM disponibles en el sistema
#[tauri::command]
fn listar_puertos_com() -> Vec<String> {
    match serialport::available_ports() {
        Ok(ports) => ports.iter().map(|p| p.port_name.clone()).collect(),
        Err(_) => vec![],
    }
}

/// Abre un puerto COM y lee datos por `segundos` segundos, retornando el texto recibido
#[tauri::command]
fn leer_puerto_com(puerto: String, baud_rate: u32, segundos: u64) -> Result<String, String> {
    let port = serialport::new(&puerto, baud_rate)
        .timeout(Duration::from_secs(segundos))
        .open()
        .map_err(|e| format!("No se pudo abrir {}: {}", puerto, e))?;

    let mut reader = BufReader::new(port);
    let mut buffer = String::new();
    let start = std::time::Instant::now();

    while start.elapsed().as_secs() < segundos {
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) => buffer.push_str(&line),
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => break,
            Err(e) => return Err(format!("Error leyendo {}: {}", puerto, e)),
        }
        if buffer.len() > 4096 { break; } // Limitar tamaño
    }

    if buffer.is_empty() {
        Ok("(Sin datos recibidos en el tiempo indicado)".to_string())
    } else {
        Ok(buffer)
    }
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
            guardar_config,
            listar_puertos_com,
            leer_puerto_com
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar la app del agente");
}
