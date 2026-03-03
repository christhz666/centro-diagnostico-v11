import React, { useState, useEffect, useRef } from 'react';
import {
  FaPalette, FaSave, FaSpinner, FaBuilding, FaImage,
  FaUpload, FaCheck, FaEye, FaTrash, FaCogs, FaXRay
} from 'react-icons/fa';
import { MdOutlineRadiology } from 'react-icons/md';
import api from '../services/api';
import AdminSucursales from './AdminSucursales';

/* ── Componente de carga de logo ────────────────────────────── */
function LogoUploader({ label, descripcion, fieldKey, value, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || '');
  const [drag, setDrag] = useState(false);

  useEffect(() => { setPreview(value || ''); }, [value]);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes (PNG, JPG, SVG, WebP)'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const b64 = canvas.toDataURL('image/webp', 0.8);
        setPreview(b64);
        onChange(fieldKey, b64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const limpiar = () => { setPreview(''); onChange(fieldKey, ''); inputRef.current && (inputRef.current.value = ''); };

  return (
    <div style={{ marginBottom: 20 }}>
      <label className="block font-bold text-gray-900 dark:text-gray-200 mb-1 text-sm">
        {label}
      </label>
      <p className="text-gray-500 dark:text-gray-400" style={{ margin: '0 0 10px', fontSize: 12 }}>{descripcion}</p>

      {/* Área de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-5 text-center cursor-pointer bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
        style={{
          borderColor: drag ? '#3498db' : undefined,
          minHeight: 90,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} style={{ maxHeight: 70, maxWidth: 180, objectFit: 'contain', borderRadius: 8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#27ae60', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaCheck /> Logo cargado
              </span>
              <button type="button" onClick={e => { e.stopPropagation(); limpiar(); }} style={{
                background: '#fee2e2', color: '#e74c3c', border: 'none', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
              }}>
                <FaTrash /> Quitar
              </button>
            </div>
          </>
        ) : (
          <div className="text-gray-400 dark:text-gray-500">
            <FaUpload style={{ fontSize: 28, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            <div className="text-gray-600 dark:text-gray-300" style={{ fontSize: 13, fontWeight: 600 }}>Haga clic o arrastre una imagen</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>PNG, JPG, SVG, WebP — Máx. 5MB</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])} />

      {/* URL alternativa */}
      <input
        type="url"
        placeholder="O pegue una URL de imagen: https://..."
        value={preview.startsWith('data:') ? '' : preview}
        onChange={e => { setPreview(e.target.value); onChange(fieldKey, e.target.value); }}
        className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200"
      />
    </div>
  );
}

/* ── Sección contenedor ─────────────────────────────────────── */
function Seccion({ titulo, icono, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md dark:shadow-none mb-5 border border-gray-100 dark:border-gray-700">
      <h3 className="mb-5 text-gray-900 dark:text-white text-base font-bold flex items-center gap-2.5">
        <span style={{ fontSize: 18 }}>{icono}</span> {titulo}
      </h3>
      {children}
    </div>
  );
}

/* ── Campo de texto ─────────────────────────────────────────── */
function Campo({ label, fieldKey, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-sm">{label}</label>
      <input
        type={type} value={value || ''} placeholder={placeholder}
        onChange={e => onChange(fieldKey, e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
      />
    </div>
  );
}

/* ══════════ PANEL PRINCIPAL ════════════════════════════════ */
const AdminPanel = () => {
  const [config, setConfig] = useState({
    empresa_nombre: '',
    empresa_ruc: '',
    empresa_telefono: '',
    empresa_email: '',
    empresa_direccion: '',
    color_primario: '#0f4c75',
    color_secundario: '#1b262c',
    color_acento: '#87CEEB',
    logo_login: '',
    logo_factura: '',
    logo_resultados: '',
    logo_sidebar: '',
    sucursal_rayos_x_id: '',
  });
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const cargar = async () => {
      try {
        const resp = await api.getConfiguracion();
        const data = resp?.configuracion || resp || {};
        setConfig(prev => ({ ...prev, ...data }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    const cargarSucursales = async () => {
      try {
        const resp = await api.request('/sucursales');
        const data = Array.isArray(resp) ? resp : (resp?.data || resp?.sucursales || []);
        setSucursales(data);
      } catch (e) { console.error('Error cargando sucursales:', e); }
    };
    cargar();
    cargarSucursales();
  }, []);

  const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.updateConfiguracion(config);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <FaSpinner className="spin" style={{ fontSize: 40, color: '#3498db' }} />
      <p style={{ color: '#888' }}>Cargando configuración...</p>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: 820, margin: '0 auto', fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="text-gray-900 dark:text-white" style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaPalette style={{ color: '#3498db' }} /> Personalización
          </h1>
          <p className="text-gray-500 dark:text-gray-400" style={{ margin: '5px 0 0', fontSize: 14 }}>Configure la apariencia y datos de su empresa</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2.5 mb-5 border-b-2 border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-5 py-2.5 border-none rounded-t-lg cursor-pointer font-bold flex items-center gap-2 transition-colors ${activeTab === 'general'
              ? 'bg-blue-500 text-white'
              : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
          <FaCogs /> Configuración General
        </button>
        <button
          onClick={() => setActiveTab('sucursales')}
          className={`px-5 py-2.5 border-none rounded-t-lg cursor-pointer font-bold flex items-center gap-2 transition-colors ${activeTab === 'sucursales'
              ? 'bg-blue-500 text-white'
              : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
          <FaBuilding /> Gestión de Sucursales
        </button>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={guardar}>
          {/* ── Datos de la empresa ── */}
          <Seccion titulo="Datos de la Empresa" icono={<FaBuilding style={{ color: '#3498db' }} />}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 20px' }}>
              <Campo label="Nombre de la Empresa" fieldKey="empresa_nombre" value={config.empresa_nombre} onChange={set} placeholder="Centro Diagnóstico Mi Esperanza" />
              <Campo label="RNC / RUC" fieldKey="empresa_ruc" value={config.empresa_ruc} onChange={set} placeholder="1-23-45678-9" />
              <Campo label="Teléfono" fieldKey="empresa_telefono" value={config.empresa_telefono} onChange={set} placeholder="(809) 000-0000" />
              <Campo label="Correo Electrónico" fieldKey="empresa_email" value={config.empresa_email} onChange={set} type="email" placeholder="info@centromed.com" />
              <div style={{ gridColumn: '1 / -1' }}>
                <Campo label="Dirección" fieldKey="empresa_direccion" value={config.empresa_direccion} onChange={set} placeholder="Calle Principal #123, Ciudad" />
              </div>
            </div>
          </Seccion>

          {/* ── Logos ── */}
          <Seccion titulo="Logos del Sistema" icono={<FaImage style={{ color: '#8e44ad' }} />}>
            <p className="bg-blue-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-l-4 border-blue-500" style={{ margin: '0 0 20px', fontSize: 13, padding: '10px 14px', borderRadius: 8 }}>
              <strong>Recomendación:</strong> Use imágenes PNG con fondo transparente. Los logos se guardan directamente en la base de datos, no se requiere servidor adicional.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0 24px' }}>
              <LogoUploader
                label="🔐 Logo del Panel de Inicio de Sesión"
                descripcion="Aparece en la pantalla de login. Tamaño ideal: 300×100px."
                fieldKey="logo_login"
                value={config.logo_login}
                onChange={set}
              />
              <LogoUploader
                label="🧾 Logo de Facturas"
                descripcion="Se imprime en la parte superior de cada factura térmica. Tamaño ideal: 250×80px."
                fieldKey="logo_factura"
                value={config.logo_factura}
                onChange={set}
              />
              <LogoUploader
                label="📋 Logo de Resultados"
                descripcion="Aparece en los reportes de resultados de laboratorio e imagenología. Tamaño ideal: 300×100px."
                fieldKey="logo_resultados"
                value={config.logo_resultados}
                onChange={set}
              />
              <LogoUploader
                label="📌 Logo de la Barra Lateral (Sidebar)"
                descripcion="Aparece en la parte superior del menú lateral. Tamaño ideal: 160×50px."
                fieldKey="logo_sidebar"
                value={config.logo_sidebar}
                onChange={set}
              />
            </div>
          </Seccion>

          {/* ── Colores ── */}
          <Seccion titulo="Colores del Sistema" icono={<span style={{ fontSize: 18 }}>🎨</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Color Primario', key: 'color_primario', defecto: '#0f4c75', desc: 'Botones, links principales' },
                { label: 'Color Secundario', key: 'color_secundario', defecto: '#1b262c', desc: 'Sidebar, encabezados' },
                { label: 'Color de Acento', key: 'color_acento', defecto: '#87CEEB', desc: 'Ítem activo del menú' },
              ].map(({ label, key, defecto, desc }) => (
                <div key={key} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1">{label}</label>
                  <p className="text-gray-400 dark:text-gray-500" style={{ margin: '0 0 10px', fontSize: 11 }}>{desc}</p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="color" value={config[key] || defecto}
                      onChange={e => set(key, e.target.value)}
                      style={{ width: 46, height: 40, border: 'none', cursor: 'pointer', borderRadius: 8, background: 'none' }} />
                    <input type="text" value={config[key] || defecto}
                      onChange={e => set(key, e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, fontFamily: 'monospace' }} />
                  </div>
                  {/* Vista previa */}
                  <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: config[key] || defecto }} />
                </div>
              ))}
            </div>
          </Seccion>

          {/* ── Sucursal de Rayos X ── */}
          <Seccion titulo="Sucursal de Rayos X" icono={<span style={{ fontSize: 18 }}>🩻</span>}>
            <p className="text-gray-500 dark:text-gray-400" style={{ margin: '0 0 14px', fontSize: 13 }}>
              Cuando un paciente se registra con un estudio de Rayos X, se asignará automáticamente a esta sucursal para el procesamiento.
              Ambas sucursales pueden ver e imprimir los resultados.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-sm">Sucursal de Rayos X</label>
              <select
                value={config.sucursal_rayos_x_id || ''}
                onChange={e => set('sucursal_rayos_x_id', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
              >
                <option value="">-- Sin asignar (usar sucursal actual) --</option>
                {sucursales.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.nombre || s.name} {s.tipo ? `(${s.tipo})` : ''}
                  </option>
                ))}
              </select>
              {sucursales.length === 0 && (
                <p className="text-gray-400 dark:text-gray-500" style={{ margin: '6px 0 0', fontSize: 12 }}>
                  No se encontraron sucursales. Créelas en la pestaña "Gestión de Sucursales".
                </p>
              )}
            </div>
          </Seccion>

          {/* ── Botón guardar ── */}
          <button type="submit" disabled={guardando} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: guardado ? 'linear-gradient(135deg,#27ae60,#2ecc71)' : 'linear-gradient(135deg,#0f4c75,#1a6ba8)',
            color: 'white', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 16, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 6px 20px rgba(15,76,117,0.3)',
            transition: 'all 0.3s',
          }}>
            {guardando ? <FaSpinner className="spin" /> : guardado ? <FaCheck /> : <FaSave />}
            {guardando ? 'Guardando...' : guardado ? '¡Guardado Correctamente!' : 'Guardar Configuración'}
          </button>

          {/* Preview de logos guardados */}
          {(config.logo_login || config.logo_factura || config.logo_resultados) && (
            <div className="mt-5 bg-blue-50 dark:bg-white/5 rounded-xl p-5 border border-blue-100 dark:border-gray-700">
              <h4 className="text-gray-500 dark:text-gray-400" style={{ margin: '0 0 14px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <FaEye style={{ marginRight: 6 }} /> Vista previa de logos configurados
              </h4>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { src: config.logo_login, label: 'Login' },
                  { src: config.logo_factura, label: 'Factura' },
                  { src: config.logo_resultados, label: 'Resultados' },
                  { src: config.logo_sidebar, label: 'Sidebar' },
                ].filter(l => l.src).map(({ src, label }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <img src={src} alt={label} style={{ maxHeight: 60, maxWidth: 160, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        <AdminSucursales />
      )}
    </div>
  );
};

export default AdminPanel;
