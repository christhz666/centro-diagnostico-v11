/**
 * Imagenologia.js
 * Módulo de imagenología con visor DICOM (Cornerstone.js)
 *
 * Roles:
 *  - admin / medico  → pueden ver Y editar el reporte
 *  - laboratorio / recepcion → solo pueden ver (modo solo lectura)
 *
 * Plantillas de la doctora:
 *  - Presets de texto guardados en localStorage (clave: "imgPlantillasDoctora")
 *  - La doctora puede crear, editar, eliminar y aplicar sus propias plantillas
 */
import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import {
  FaXRay, FaUpload, FaSave, FaCheck, FaSpinner,
  FaEye, FaArrowLeft, FaPrint, FaPlus, FaTrash, FaPencilAlt,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const DicomViewer = lazy(() => import('./DicomViewer'));

/* ─── Plantillas de tipo de estudio (campos dinámicos) ──────── */
const TIPO_PLANTILLAS = [
  { id: 'general', label: 'General', campos: ['tecnica', 'hallazgos', 'impresion', 'recomendaciones'] },
  { id: 'torax', label: 'Tórax / Rx Tórax', campos: ['tecnica', 'hallazgos', 'impresion', 'recomendaciones'] },
  { id: 'columna', label: 'Columna', campos: ['tecnica', 'hallazgos', 'impresion', 'recomendaciones'] },
  { id: 'extremidades', label: 'Extremidades', campos: ['tecnica', 'hallazgos', 'impresion', 'recomendaciones'] },
  { id: 'abdomen', label: 'Abdomen', campos: ['tecnica', 'hallazgos', 'impresion', 'recomendaciones'] },
  { id: 'mamografia', label: 'Mamografía', campos: ['tecnica', 'hallazgos', 'impresion', 'birads', 'recomendaciones'] },
  { id: 'personalizada', label: 'Personalizada', campos: ['tecnica', 'hallazgos', 'impresion', 'recomendaciones'] },
];

const CAMPO_LABELS = {
  tecnica: 'Técnica Utilizada',
  hallazgos: 'Hallazgos',
  impresion: 'Impresión Diagnóstica',
  birads: 'Categoría BIRADS',
  recomendaciones: 'Recomendaciones',
};

const ESTADO_COLORES = {
  pendiente: { bg: '#fff3cd', color: '#856404' },
  en_proceso: { bg: '#cce5ff', color: '#004085' },
  completado: { bg: '#d4edda', color: '#155724' },
};

const theme = {
  surface: 'var(--legacy-surface)',
  surfaceMuted: 'var(--legacy-surface-muted)',
  panel: 'var(--legacy-surface-panel)',
  border: 'var(--legacy-border)',
  borderSoft: 'var(--legacy-border-soft)',
  text: 'var(--legacy-text)',
  textStrong: 'var(--legacy-text-strong)',
  textMuted: 'var(--legacy-text-muted)',
  accentStrong: 'var(--legacy-accent-strong)'
};

function ViewerLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#08111b', color: '#dbeafe', gap: 12, flexDirection: 'column' }}>
      <FaSpinner className="spin" style={{ fontSize: 28, color: '#87CEEB' }} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>Cargando visor DICOM...</div>
    </div>
  );
}

/* ─── Helper: obtener rol del usuario actual ─────────────────── */
function getRol() {
  try {
    const uStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    const u = JSON.parse(uStr || '{}');
    return u.role || u.rol || 'recepcion';
  } catch { return 'recepcion'; }
}
function getUsuarioSesion() {
  try {
    const uStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    return JSON.parse(uStr || '{}');
  } catch { return {}; }
}
function puedeEditar() {
  const r = getRol(); return r === 'admin' || r === 'medico';
}

/* ─── Plantillas guardables (localStorage) ──────────────────── */
const LS_KEY = 'imgPlantillasDoctora';
function cargarPlantillasGuardadas() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function guardarPlantillasLS(lista) {
  localStorage.setItem(LS_KEY, JSON.stringify(lista));
}

/* ═══════════════════ COMPONENTE PRINCIPAL ══════════════════════ */
const Imagenologia = () => {
  const navigate = useNavigate();
  const [vista, setVista] = useState('lista');
  const [estudios, setEstudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [estudioActual, setEstudioActual] = useState(null);
  const [imagenes, setImagenes] = useState([]);

  // Reporte
  const [reporte, setReporte] = useState({});
  const [tipoPlantilla, setTipoPlantilla] = useState('general');
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [firmandoResultado, setFirmandoResultado] = useState(false);

  // Plantillas guardadas de la doctora
  const [plantillasDoctora, setPlantillasDoctora] = useState(cargarPlantillasGuardadas);
  const [mostrarGestorPlantillas, setMostrarGestorPlantillas] = useState(false);
  const [plantillaEditando, setPlantillaEditando] = useState(null); // {nombre, reporte}
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState('');
  const [mostrarSoloVisor, setMostrarSoloVisor] = useState(false); // Ocultar panel de reporte
  const [imagenesParaImprimir, setImagenesParaImprimir] = useState([]); // Cola de imágenes para imprimir (1 o 2)
  const [ajustes, setAjustes] = useState(null); // WW/WC inicial del WS

  const fileInputRef = useRef(null);
  const guardadoTimeoutRef = useRef(null); // Para debounce del auto-guardado
  const canEdit = puedeEditar();
  const rol = getRol();

  /* ─── Persistir plantillas doctora ──────────────────────────── */
  useEffect(() => { guardarPlantillasLS(plantillasDoctora); }, [plantillasDoctora]);

  const cargarEstudios = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const resp = await api.getImagenologiaLista(params);
      setEstudios(Array.isArray(resp) ? resp : (resp?.resultados || resp?.data || []));
    } catch { setEstudios([]); }
    finally { setLoading(false); }
  }, [filtroEstado]);

  useEffect(() => { cargarEstudios(); }, [cargarEstudios]);

  const abrirVisor = async (estudio) => {
    setEstudioActual(estudio);
    setVista('visor');
    setReporte({});
    setImagenes([]);
    setMostrarSoloVisor(false);
    setImagenesParaImprimir([]);
    setAjustes(null); // Nuevo estado
    try {
      const ws = await api.getImagenologiaWorkspace(estudio._id || estudio.id);
      const data = ws?.data || ws || {};
      setEstudioActual(prev => ({
        ...(prev || estudio),
        ...estudio,
        firmaDigital: data.firmaDigital || estudio.firmaDigital || '',
        firmadoPor: data.firmadoPor || estudio.firmadoPor || null,
        validadoPor: data.validadoPor || estudio.validadoPor || null
      }));
      if (data.reporte) setReporte(data.reporte);
      if (data.plantilla) setTipoPlantilla(data.plantilla);
      if (data.visor && data.visor.ajustes) setAjustes(data.visor.ajustes);
      const imgs = data.visor?.imagenes || data.imagenes || estudio.imagenes || [];
      setImagenes(imgs);
    } catch {
      setImagenes(estudio.imagenes || []);
    }
  };

  const handleSubirImagenes = async (e) => {
    const files = e.target.files;
    if (!files.length || !estudioActual) return;
    setSubiendo(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('imagenes', f));
      const resp = await fetch(`/api/imagenologia/upload/${estudioActual._id || estudioActual.id}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token')) },
        body: formData,
      });
      const data = await resp.json();
      const nuevas = data.data || data.imagenes || [];
      setImagenes(prev => [...prev, ...nuevas]);
    } catch (err) { alert('Error al subir: ' + err.message); }
    finally { setSubiendo(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const guardarReporte = async (reporteOpcional = null, ajustesOpcionales = null) => {
    if (!estudioActual || !canEdit) return;
    setGuardando(true);
    try {
      const payload = {
        reporte: reporteOpcional || reporte,
        plantilla: tipoPlantilla
      };
      if (ajustesOpcionales) payload.ajustes = ajustesOpcionales;
      await api.updateImagenologiaWorkspace(estudioActual._id || estudioActual.id, payload);
      if (!ajustesOpcionales) alert('Reporte guardado correctamente'); // Solo avisar si fue guardado manual
    } catch (err) { if (!ajustesOpcionales) alert('Error: ' + err.message); }
    finally { setGuardando(false); }
  };

  const handleCambioAjustesVisor = useCallback((nuevosAjustes) => {
    setAjustes(nuevosAjustes);
    // Auto-guardado silencioso con Debounce (evitar spam al arrastrar WW/WL/Zoom)
    if (canEdit && estudioActual) {
      if (guardadoTimeoutRef.current) clearTimeout(guardadoTimeoutRef.current);
      guardadoTimeoutRef.current = setTimeout(() => {
        guardarReporte(reporte, nuevosAjustes);
      }, 1500); // Guardar 1.5s después de dejar de mover
    }
  }, [canEdit, estudioActual, reporte]); // eslint-disable-line

  const finalizarReporte = async () => {
    if (!estudioActual || !canEdit) return;
    const usuarioSesion = getUsuarioSesion();
    if (!estudioActual?.firmaDigital && !usuarioSesion?.firmaDigital) {
      alert('Debe registrar su firma en Mi Perfil antes de finalizar un reporte de imagenologia.');
      navigate('/perfil');
      return;
    }
    if (!window.confirm('¿Finalizar y marcar como completado?')) return;
    setGuardando(true);
    try {
      await api.updateImagenologiaWorkspace(estudioActual._id || estudioActual.id, { reporte, plantilla: tipoPlantilla });
      const resultadoFinalizado = await api.finalizarReporteImagenologia(estudioActual._id || estudioActual.id);
      const data = resultadoFinalizado?.data || resultadoFinalizado || {};
      setEstudioActual(prev => ({
        ...(prev || {}),
        ...data,
        firmaDigital: data.firmaDigital || prev?.firmaDigital || usuarioSesion?.firmaDigital || '',
        firmadoPor: data.firmadoPor || prev?.firmadoPor || null,
        validadoPor: data.validadoPor || prev?.validadoPor || null
      }));
      alert('Reporte finalizado');
      setVista('lista');
      cargarEstudios();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setGuardando(false); }
  };

  const marcarFirmaResultado = async (checked) => {
    if (!checked || !estudioActual || estudioActual.firmaDigital) return;

    const usuarioSesion = getUsuarioSesion();
    if (!usuarioSesion?.firmaDigital) {
      alert('Debe registrar su firma en Mi Perfil antes de firmar el reporte.');
      navigate('/perfil');
      return;
    }

    try {
      setFirmandoResultado(true);
      const firmado = await api.firmarResultado(estudioActual._id || estudioActual.id);
      const dataFirmada = firmado?.data || firmado || {};
      setEstudioActual(prev => ({
        ...(prev || {}),
        ...dataFirmada,
        firmaDigital: dataFirmada.firmaDigital || usuarioSesion.firmaDigital,
        firmadoPor: dataFirmada.firmadoPor || prev?.firmadoPor || null,
        validadoPor: dataFirmada.validadoPor || prev?.validadoPor || null
      }));
    } catch (err) {
      alert(err.message || 'No se pudo firmar el reporte.');
    } finally {
      setFirmandoResultado(false);
    }
  };

  /* ─── Plantillas guardadas de la doctora ───────────────────── */
  const guardarComoPlantilla = () => {
    const nombre = nombreNuevaPlantilla.trim() || `Plantilla ${plantillasDoctora.length + 1}`;
    const nueva = { id: Date.now().toString(), nombre, tipoPlantilla, reporte: { ...reporte } };
    setPlantillasDoctora(prev => [...prev, nueva]);
    setNombreNuevaPlantilla('');
    alert(`Plantilla "${nombre}" guardada`);
  };

  const aplicarPlantillaGuardada = (pt) => {
    setReporte({ ...pt.reporte });
    setTipoPlantilla(pt.tipoPlantilla || 'general');
  };

  const eliminarPlantillaGuardada = (id) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    setPlantillasDoctora(prev => prev.filter(p => p.id !== id));
  };

  const actualizarPlantillaGuardada = () => {
    if (!plantillaEditando) return;
    setPlantillasDoctora(prev => prev.map(p =>
      p.id === plantillaEditando.id
        ? { ...p, nombre: plantillaEditando.nombre, reporte: plantillaEditando.reporte, tipoPlantilla: plantillaEditando.tipoPlantilla }
        : p
    ));
    setPlantillaEditando(null);
    alert('Plantilla actualizada');
  };

  /* ─── Capturar imagen para imprimir ────────────────────────── */
  const agregarImagenAImprimir = () => {
    if (window.__capturarVisorDicomActivo) {
      const durl = window.__capturarVisorDicomActivo();
      if (durl) {
        setImagenesParaImprimir(prev => {
          const arr = [...prev, durl];
          if (arr.length > 2) return arr.slice(arr.length - 2); // Mantener máx 2
          return arr;
        });
        alert('Imagen capturada para imprimir. Ya van ' + (imagenesParaImprimir.length + 1) + '. Vaya a "Imprimir Imagen"');
      } else {
        alert('Espere a que cargue la imagen');
      }
    }
  };

  const limpiarImpresion = () => setImagenesParaImprimir([]);

  const imprimirImagenesSola = async () => {
    if (imagenesParaImprimir.length === 0) {
      alert("Capture al menos una imagen presionando el botón 📸 primero");
      return;
    }
    let empresa = {};
    try { const r = await fetch('/api/configuracion/empresa'); empresa = await r.json(); } catch { }
    const paciente = estudioActual?.paciente || {};
    const estudio = estudioActual?.estudio || {};
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Impresión de Imagen</title>
      <style>
      @page{size:A4;margin:10mm}body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;color:#333}
      .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #1a3a5c;padding-bottom:5px;margin-bottom:10px}
      .hdr h3{margin:0;color:#1a3a5c;font-size:14px} .hdr p{margin:0;font-size:10px;color:#666}
      .img-container{text-align:center;margin-bottom:15px;height:45vh;display:flex;align-items:center;justify-content:center;background:#000;border-radius:4px;overflow:hidden}
      .img-container img{max-width:100%;max-height:100%;object-fit:contain}
      @media print{.np{display:none}}
      </style></head><body>
      <div class="np" style="text-align:center;padding:10px;background:#f0f0f0;margin-bottom:15px">
        <button onclick="window.print()" style="padding:10px 20px;font-size:16px;cursor:pointer">🖨️ Imprimir</button>
      </div>
      <div class="hdr">
        <div><h3>${esc(empresa.nombre || 'Centro Diagnóstico')}</h3><p>Estudio: ${esc(estudio.nombre)}</p></div>
        <div style="text-align:right"><h3>Paciente: ${esc(paciente.nombre)} ${esc(paciente.apellido)}</h3><p>Cód: ${estudioActual?.codigo || ''} · ${new Date().toLocaleDateString('es-DO')}</p></div>
      </div>
      ${imagenesParaImprimir.map(img => `<div class="img-container"><img src="${img}" /></div>`).join('')}
      </body></html>`;

    const w = window.open('', 'ImprimirImagen', 'width=850,height=1100');
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 800);
  };

  /* ─── Imprimir reporte (solo texto) ────────────────────────── */
  const imprimirReporte = async () => {
    let empresa = {};
    try { const r = await fetch('/api/configuracion/empresa'); empresa = await r.json(); } catch { }
    const usuarioSesion = getUsuarioSesion();
    if (!estudioActual?.firmaDigital && !usuarioSesion?.firmaDigital) {
      alert('Debe registrar su firma en Mi Perfil antes de imprimir un reporte de imagenologia.');
      navigate('/perfil');
      return;
    }

    let estudioParaImprimir = estudioActual;
    if (!estudioParaImprimir?.firmaDigital && usuarioSesion?.firmaDigital && estudioActual?._id) {
      try {
        const firmado = await api.firmarResultado(estudioActual._id || estudioActual.id);
        const dataFirmada = firmado?.data || firmado || {};
        estudioParaImprimir = {
          ...estudioActual,
          ...dataFirmada,
          firmaDigital: dataFirmada.firmaDigital || usuarioSesion.firmaDigital,
          firmadoPor: dataFirmada.firmadoPor || estudioActual.firmadoPor || null,
          validadoPor: dataFirmada.validadoPor || estudioActual.validadoPor || null
        };
        setEstudioActual(estudioParaImprimir);
      } catch (err) {
        console.error('No se pudo persistir la firma antes de imprimir:', err);
      }
    }

    const paciente = estudioParaImprimir?.paciente || {};
    const estudio = estudioParaImprimir?.estudio || {};
    const fecha = new Date(estudioParaImprimir?.createdAt || new Date()).toLocaleDateString('es-DO');
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tpl = TIPO_PLANTILLAS.find(p => p.id === tipoPlantilla) || TIPO_PLANTILLAS[0];
    const firmaActiva = estudioParaImprimir?.firmaDigital || usuarioSesion?.firmaDigital || '';
    const medicoFirmanteNombre = estudioParaImprimir?.firmadoPor?.nombre || estudioParaImprimir?.validadoPor?.nombre || usuarioSesion?.nombre || reporte?.medico_firmante || 'Médico Informante';
    const medicoFirmanteApellido = estudioParaImprimir?.firmadoPor?.apellido || estudioParaImprimir?.validadoPor?.apellido || usuarioSesion?.apellido || '';
    const camposHtml = tpl.campos.map(c => {
      const v = reporte[c] || ''; if (!v) return '';
      return `<div style="margin-bottom:14px"><h4 style="margin:0 0 5px;color:#1a3a5c;font-size:13px;text-transform:uppercase">${esc(CAMPO_LABELS[c] || c)}</h4><p style="margin:0;line-height:1.7;white-space:pre-wrap;color:#2d3748">${esc(v)}</p></div>`;
    }).join('');
    const firmaHtml = firmaActiva
      ? `<div style="margin-bottom:10px"><img src="${firmaActiva}" alt="Firma del médico" style="max-width:220px;max-height:70px;object-fit:contain" /></div>`
      : '<div style="height:60px"></div>';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Imagenología</title>
    <style>@page{size:A4;margin:12mm 15mm}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#2d3748}
    .hdr{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1a3a5c;padding-bottom:12px;margin-bottom:16px}
    .hdr img{max-height:60px;object-fit:contain}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f0f8ff;padding:12px;border-radius:8px;border-left:4px solid #1a3a5c;margin-bottom:16px}
    .item strong{display:block;font-size:10px;color:#888;text-transform:uppercase}.item span{font-size:13px;font-weight:600;color:#1a3a5c}
    .sec{background:#1a3a5c;color:white;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;margin:16px 0 10px}
    .firma{margin-top:50px;display:flex;justify-content:flex-end}.fb{text-align:center;width:220px}
    .fl{border-top:2px solid #1a3a5c;padding-top:8px;font-size:11px;color:#666}
    .ft{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;color:#aaa;font-size:10px}
    @media print{.np{display:none}}</style></head><body>
    <div class="hdr">${empresa.logo_resultados ? `<img src="${esc(empresa.logo_resultados)}" onerror="this.style.display='none'">` : '<span style="font-size:28px">🏥</span>'}
      <div><h2 style="margin:0 0 3px;font-size:16px;color:#1a3a5c">${esc(empresa.nombre || 'Centro Diagnóstico')}</h2>
      <p style="margin:0;color:#666;font-size:11px">${esc(empresa.empresa_direccion || '')}${empresa.empresa_telefono ? ' · ' + esc(empresa.empresa_telefono) : ''}</p>
      <p style="color:#2980b9;font-weight:600;margin:2px 0 0">REPORTE DE IMAGENOLOGÍA</p></div></div>
    <div class="grid">
      <div class="item"><strong>Paciente</strong><span>${esc(paciente.nombre)} ${esc(paciente.apellido)}</span></div>
      <div class="item"><strong>Cédula</strong><span>${esc(paciente.cedula || 'N/A')}</span></div>
      <div class="item"><strong>Estudio</strong><span>${esc(estudio.nombre || 'Estudio de imagen')}</span></div>
      <div class="item"><strong>Fecha</strong><span>${fecha}</span></div>
    </div>
    ${camposHtml ? `<div class="sec">REPORTE MÉDICO</div>${camposHtml}` : '<p style="color:#888;font-style:italic">Sin reporte completado</p>'}
    <div class="firma"><div class="fb">${firmaHtml}<div class="fl"><strong>Firma y Sello</strong><br/>Dr(a). ${esc(medicoFirmanteNombre)} ${esc(medicoFirmanteApellido)}</div></div></div>
    <div class="ft">${esc(empresa.nombre || 'Centro Diagnóstico')} · ${new Date().toLocaleString('es-DO')}</div>
    <div class="np" style="text-align:center;padding:20px"><button onclick="window.print()" style="padding:14px 35px;background:#1a3a5c;color:white;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:bold">🖨️ Imprimir</button></div>
    </body></html>`;
    const w = window.open('', 'Reporte', 'width=850,height=1100');
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 500);
  };

  /* ══════════════════ VISTA LISTA ════════════════════════════════ */
  if (vista === 'lista') {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#1a3a5c' }}>
            <FaXRay style={{ color: '#87CEEB' }} /> Imagenología
            <span style={{ fontSize: 13, background: '#e8f4fd', color: '#1565c0', padding: '3px 10px', borderRadius: 12, fontWeight: 600, marginLeft: 6 }}>
              {rol.charAt(0).toUpperCase() + rol.slice(1)}
            </span>
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {['', 'pendiente', 'en_proceso', 'completado'].map(e => (
              <button key={e} onClick={() => setFiltroEstado(e)} style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold',
                background: filtroEstado === e ? '#1a3a5c' : '#f0f0f0',
                color: filtroEstado === e ? 'white' : '#333', fontSize: 13,
              }}>{e === '' ? 'Todos' : e.replace('_', ' ')}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><FaSpinner className="spin" style={{ fontSize: 40, color: '#87CEEB' }} /></div>
        ) : estudios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: theme.surface, borderRadius: 15, border: `1px solid ${theme.border}` }}>
            <FaXRay style={{ fontSize: 60, color: '#ddd', marginBottom: 16 }} />
            <p style={{ color: theme.textMuted, fontSize: 17 }}>No hay estudios {filtroEstado ? `"${filtroEstado}"` : ''}</p>
          </div>
        ) : (
          <div style={{ background: theme.surface, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: `1px solid ${theme.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme.surfaceMuted }}>
                  {['Código', 'Paciente', 'Estudio', 'Imágenes', 'Estado', 'Fecha', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '13px 14px', textAlign: ['Imágenes', 'Estado', 'Acciones'].includes(h) ? 'center' : 'left', color: theme.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estudios.map(e => {
                  const est = ESTADO_COLORES[e.estado] || ESTADO_COLORES.pendiente;
                  return (
                    <tr key={e._id || e.id} style={{ borderBottom: `1px solid ${theme.borderSoft}` }} onMouseEnter={ev => ev.currentTarget.style.background = theme.surfaceMuted} onMouseLeave={ev => ev.currentTarget.style.background = theme.surface}>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 13, color: theme.accentStrong, fontWeight: 700 }}>{e.codigo || e._id?.slice(-6).toUpperCase()}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: theme.textStrong }}>{e.paciente?.nombre} {e.paciente?.apellido}</td>
                      <td style={{ padding: '12px 14px', color: theme.text }}>{e.estudio?.nombre || 'Estudio de imagen'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ background: '#e8f4fd', color: '#1565c0', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{(e.imagenes || []).length}</span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: est.bg, color: est.color }}> {(e.estado || 'pendiente').replace('_', ' ')} </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: theme.textMuted, fontSize: 13 }}>{new Date(e.createdAt || e.fecha).toLocaleDateString('es-DO')}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button onClick={() => abrirVisor(e)} style={{ padding: '8px 16px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                          <FaEye /> {canEdit ? 'Abrir Visor' : 'Ver Imágenes'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════ VISTA VISOR ════════════════════════════════ */

  // handleCambioAjustesVisor fue movido arriba para que acceda al ref del timeout

  const tipoActual = TIPO_PLANTILLAS.find(p => p.id === tipoPlantilla) || TIPO_PLANTILLAS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: '#0d1520', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ background: '#111d2c', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setVista('lista'); cargarEstudios(); }}
            style={{ padding: '7px 13px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
            <FaArrowLeft /> Volver
          </button>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{estudioActual?.paciente?.nombre} {estudioActual?.paciente?.apellido}</div>
            <div style={{ color: '#82b1ff', fontSize: 12 }}>{estudioActual?.estudio?.nombre || 'Estudio de imagen'} &nbsp;·&nbsp; Cód: {estudioActual?.codigo || estudioActual?._id?.slice(-6).toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setMostrarSoloVisor(!mostrarSoloVisor)} style={{ padding: '7px 13px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, marginRight: 15 }}>
            {mostrarSoloVisor ? '👁 Mostrar Reporte' : '👁 Ocultar Reporte'}
          </button>
          {/* Solo médico/admin puede subir */}
          {canEdit && (
            <label style={{ padding: '7px 13px', background: '#1565c0', color: 'white', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 13 }}>
              {subiendo ? <FaSpinner className="spin" /> : <FaUpload />}
              {subiendo ? 'Subiendo…' : 'Subir DICOM'}
              <input ref={fileInputRef} type="file" accept=".dcm,.DCM,image/*" multiple style={{ display: 'none' }} onChange={handleSubirImagenes} />
            </label>
          )}

          {/* Controles de Impresión Separados */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, gap: 3 }}>
            <button onClick={agregarImagenAImprimir} style={{ padding: '4px 9px', background: '#3949ab', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} title="Capturar imagen actual para imprimir">
              📸 Capturar Imagen ({imagenesParaImprimir.length}/2)
            </button>
            {imagenesParaImprimir.length > 0 && (
              <>
                <button onClick={limpiarImpresion} style={{ padding: '4px 9px', background: '#e53935', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} title="Limpiar imágenes">🗑</button>
                <button onClick={imprimirImagenesSola} style={{ padding: '4px 9px', background: '#1e88e5', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                  🖨️ Imprimir Imagen
                </button>
              </>
            )}
          </div>

          <button onClick={imprimirReporte} style={{ padding: '7px 13px', background: '#6a1b9a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 13, marginLeft: 15 }}>
            <FaPrint /> Imprimir Reporte
          </button>

          {canEdit && (
            <>
              <button onClick={() => guardarReporte()} disabled={guardando} style={{ padding: '7px 13px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 13 }}>
                {guardando ? <FaSpinner className="spin" /> : <FaSave />} Guardar
              </button>
              <button onClick={finalizarReporte} disabled={guardando} style={{ padding: '7px 13px', background: '#e65100', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 13 }}>
                <FaCheck /> Finalizar
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Visor DICOM */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Suspense fallback={<ViewerLoadingFallback />}>
            <DicomViewer
              imagenes={imagenes}
              ajustesIniciales={ajustes || {}}
              onCambioAjustes={handleCambioAjustesVisor}
              estiloContenedor={{ borderRadius: 0 }}
            />
          </Suspense>
        </div>

        {/* ── Panel derecho: Reporte médico ── */}
        {!mostrarSoloVisor && (
          <div style={{ width: 310, flexShrink: 0, background: theme.surfaceMuted, borderLeft: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header panel */}
            <div style={{ background: '#1a3a5c', color: 'white', padding: '11px 14px', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span>📋 Reporte Médico</span>
              {canEdit && (
                <button onClick={() => setMostrarGestorPlantillas(g => !g)}
                  title="Gestionar plantillas de la doctora"
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>
                  📁 Mis Plantillas
                </button>
              )}
            </div>

            {/* ── Modal gestor de plantillas ── */}
            {mostrarGestorPlantillas && canEdit && (
              <div style={{ background: theme.surface, borderBottom: `2px solid ${theme.border}`, padding: 12, flexShrink: 0, maxHeight: 320, overflowY: 'auto' }}>
                <div style={{ fontWeight: 700, color: theme.accentStrong, fontSize: 13, marginBottom: 8 }}>📁 Plantillas de la Doctora</div>

                {/* Lista de plantillas guardadas */}
                {plantillasDoctora.length === 0 ? (
                  <p style={{ color: theme.textMuted, fontSize: 12, margin: '0 0 8px' }}>Sin plantillas guardadas aún.</p>
                ) : plantillasDoctora.map(pt => (
                  <div key={pt.id} style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {plantillaEditando?.id === pt.id ? (
                      <>
                        <input value={plantillaEditando.nombre} onChange={e => setPlantillaEditando(p => ({ ...p, nombre: e.target.value }))}
                          style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 12, background: theme.surface, color: theme.text }} />
                        <button onClick={actualizarPlantillaGuardada} style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                        <button onClick={() => setPlantillaEditando(null)} style={{ background: theme.surfaceMuted, color: theme.text, border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>✕</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: theme.accentStrong }}>{pt.nombre}</span>
                        <span style={{ fontSize: 10, color: theme.textMuted, marginRight: 4 }}>{(TIPO_PLANTILLAS.find(t => t.id === pt.tipoPlantilla) || {}).label}</span>
                        <button onClick={() => aplicarPlantillaGuardada(pt)} title="Aplicar" style={{ background: '#1565c0', color: 'white', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Aplicar</button>
                        <button onClick={() => setPlantillaEditando({ ...pt })} title="Editar nombre" style={{ background: theme.surfaceMuted, color: theme.text, border: 'none', borderRadius: 5, padding: '4px 6px', cursor: 'pointer', fontSize: 12 }}><FaPencilAlt /></button>
                        <button onClick={() => eliminarPlantillaGuardada(pt.id)} title="Eliminar" style={{ background: '#ffebee', color: '#e53935', border: 'none', borderRadius: 5, padding: '4px 6px', cursor: 'pointer', fontSize: 12 }}><FaTrash /></button>
                      </>
                    )}
                  </div>
                ))}

                {/* Guardar reporte actual como plantilla */}
                <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8, display: 'flex', gap: 6 }}>
                  <input value={nombreNuevaPlantilla} onChange={e => setNombreNuevaPlantilla(e.target.value)}
                    placeholder="Nombre de la nueva plantilla…"
                    style={{ flex: 1, padding: '6px 9px', borderRadius: 7, border: `1px solid ${theme.border}`, fontSize: 12, background: theme.surface, color: theme.text }} />
                  <button onClick={guardarComoPlantilla} style={{ background: '#1a3a5c', color: 'white', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FaPlus /> Guardar
                  </button>
                </div>
                <p style={{ fontSize: 10, color: theme.textMuted, margin: '4px 0 0' }}>Guarda el reporte actual como plantilla reutilizable</p>
              </div>
            )}

            {/* ── Formulario del reporte ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 13 }}>

              {/* Aviso solo lectura */}
              {!canEdit && (
                <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.24)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#e65100', display: 'flex', alignItems: 'center', gap: 6 }}>
                  👁 Modo solo lectura — solo la doctora puede editar el reporte
                </div>
              )}

              {canEdit && (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, border: `1px solid ${estudioActual?.firmaDigital ? '#86efac' : theme.border}`, background: estudioActual?.firmaDigital ? '#f0fdf4' : theme.surface }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: estudioActual?.firmaDigital ? 'default' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(estudioActual?.firmaDigital)}
                      disabled={firmandoResultado}
                      onChange={(e) => marcarFirmaResultado(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#16a34a', cursor: estudioActual?.firmaDigital ? 'default' : 'pointer' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.textStrong }}>
                      {firmandoResultado ? 'Firmando resultado...' : 'Firmar resultado'}
                    </span>
                  </label>
                  <div style={{ marginTop: 8, fontSize: 12, color: theme.textMuted }}>
                    {estudioActual?.firmaDigital
                      ? `Firmado por Dr(a). ${estudioActual?.firmadoPor?.nombre || estudioActual?.validadoPor?.nombre || getUsuarioSesion()?.nombre || 'Médico'} ${estudioActual?.firmadoPor?.apellido || estudioActual?.validadoPor?.apellido || getUsuarioSesion()?.apellido || ''}`
                      : getUsuarioSesion()?.firmaDigital
                        ? 'Marque el check para aplicar la firma guardada en su sesión.'
                        : 'No hay firma cargada en la sesión. Regístrela en Mi Perfil.'}
                  </div>
                </div>
              )}

              {/* Selector tipo de estudio */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Tipo de Estudio</label>
                <select value={tipoPlantilla} onChange={e => setTipoPlantilla(e.target.value)} disabled={!canEdit}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${theme.border}`, fontSize: 13, background: canEdit ? theme.surface : theme.surfaceMuted, color: theme.text }}>
                  {TIPO_PLANTILLAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              {/* Plantillas rápidas de la doctora (aplicar sin abrir gestor) */}
              {canEdit && plantillasDoctora.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>Aplicar Plantilla Rápida</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {plantillasDoctora.map(pt => (
                      <button key={pt.id} onClick={() => aplicarPlantillaGuardada(pt)} style={{ padding: '5px 10px', background: theme.panel, border: `1px solid ${theme.border}`, color: '#1565c0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        {pt.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campos dinámicos de la plantilla */}
              {tipoActual.campos.map(campo => (
                <div key={campo} style={{ marginBottom: 11 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
                    {CAMPO_LABELS[campo] || campo}
                  </label>
                  {campo === 'birads' ? (
                    <select value={reporte[campo] || ''} onChange={e => canEdit && setReporte(p => ({ ...p, [campo]: e.target.value }))} disabled={!canEdit}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${theme.border}`, fontSize: 13, background: canEdit ? theme.surface : theme.surfaceMuted, color: theme.text }}>
                      <option value="">Seleccionar BIRADS</option>
                      {['0', '1', '2', '3', '4A', '4B', '4C', '5', '6'].map(b => <option key={b} value={b}>BIRADS {b}</option>)}
                    </select>
                  ) : (
                    <textarea
                      value={reporte[campo] || ''}
                      onChange={e => canEdit && setReporte(p => ({ ...p, [campo]: e.target.value }))}
                      readOnly={!canEdit}
                      placeholder={canEdit ? `${CAMPO_LABELS[campo]}…` : '(sin información)'}
                      rows={campo === 'hallazgos' ? 5 : 3}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${theme.border}`, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5, background: canEdit ? theme.surface : theme.surfaceMuted, cursor: canEdit ? 'text' : 'default', color: theme.text }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Botones inferiores — solo si puede editar */}
            {canEdit && (
              <div style={{ padding: 11, borderTop: '1px solid #e0e6ef', display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
                <button onClick={() => guardarReporte()} disabled={guardando} style={{ padding: '10px', background: '#1565c0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13 }}>
                  {guardando ? <FaSpinner className="spin" /> : <FaSave />} Guardar Borrador
                </button>
                <button onClick={finalizarReporte} disabled={guardando} style={{ padding: '10px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13 }}>
                  <FaCheck /> Finalizar y Completar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Imagenologia;
