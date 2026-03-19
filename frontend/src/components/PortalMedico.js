import React, { useState, useEffect, useCallback } from 'react';
import { FaUserMd, FaSearch, FaUser, FaFlask, FaEye, FaSpinner, FaFileMedical, FaEdit, FaCheck, FaPrint, FaSave, FaPlus, FaSignature } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useDebounce from '../hooks/useDebounce';

const PortalMedico = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [resultadoDetalle, setResultadoDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [firmandoResultado, setFirmandoResultado] = useState(false);
  const [firmaMedico, setFirmaMedico] = useState('');
  const [medicoSesion, setMedicoSesion] = useState(null);
  const debouncedBusqueda = useDebounce(busqueda, 350);

  // Constantes para formato de códigos
  // Formato antiguo para retrocompatibilidad
  const CODIGO_MUESTRA_PREFIX = 'MUE-';
  const CODIGO_MUESTRA_MIN_LENGTH = 13; // MUE-YYYYMMDD-NNNNN tiene 18, pero buscamos con 13+ para ser flexibles

  const colores = {
    azulCielo: '#87CEEB',
    azulOscuro: '#1a3a5c'
  };
  const theme = {
    surface: 'var(--legacy-surface)',
    surfaceMuted: 'var(--legacy-surface-muted)',
    panel: 'var(--legacy-surface-panel)',
    border: 'var(--legacy-border)',
    borderSoft: 'var(--legacy-border-soft)',
    text: 'var(--legacy-text)',
    textStrong: 'var(--legacy-text-strong)',
    textMuted: 'var(--legacy-text-muted)'
  };

  const cargarFirmaSesion = useCallback(async () => {
    try {
      const response = await api.getMe();
      const user = response?.user || response?.data || response || null;
      setMedicoSesion(user);
      setFirmaMedico(user?.firmaDigital || '');
    } catch (err) {
      console.error('Error cargando firma del médico:', err);
    }
  }, []);

  const cargarHistorial = useCallback(async (paciente) => {
    setPacienteSeleccionado(paciente);
    setResultadoDetalle(null);
    setEditando(false);

    try {
      setLoadingHistorial(true);
      const pacienteId = paciente._id || paciente.id;

      // Usar el endpoint dedicado para cargar resultados por paciente
      const response = await api.getResultadosPorPaciente(pacienteId);
      const datos = response.data || response || [];

      setHistorial(Array.isArray(datos) ? datos : []);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  const buscarPacientes = useCallback(async (queryInput = '') => {
    const query = String(queryInput || '').trim();

    if (!query) {
      // Si no hay busqueda, cargar todos los pacientes
      try {
        setLoading(true);
        const response = await api.getPacientes({});
        const datos = response.data || response || [];
        setPacientes(Array.isArray(datos) ? datos : []);
      } catch (err) {
        console.error('Error:', err);
        setPacientes([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    const esFormatoSimple = /^L?\d+$/.test(query);
    if (query.length < 2 && !(esFormatoSimple || (query.startsWith(CODIGO_MUESTRA_PREFIX) && query.length >= CODIGO_MUESTRA_MIN_LENGTH))) {
      setPacientes([]);
      return;
    }

    // Si la búsqueda parece un código de muestra simple (L1328 o 1329) o formato antiguo (MUE-YYYYMMDD-NNNNN)
    if (esFormatoSimple || (query.startsWith(CODIGO_MUESTRA_PREFIX) && query.length >= CODIGO_MUESTRA_MIN_LENGTH)) {
      try {
        setLoading(true);
        const response = await api.getResultadoPorCodigoMuestra(query);
        const resultado = response.data || response;
        if (resultado && resultado.paciente) {
          // Buscar el paciente completo
          const pacienteId = resultado.paciente._id || resultado.paciente.id || resultado.paciente;
          const pacResponse = await api.getPaciente(pacienteId);
          const pac = pacResponse.data || pacResponse;
          setPacientes([pac]);
          // Auto-cargar el historial
          await cargarHistorial(pac);
        }
      } catch (err) {
        console.error('Error buscando por código:', err);
        setPacientes([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const response = await api.getPacientes({ search: query });
      let datos = response.data || response || [];

      // Asegurar que es un array
      if (!Array.isArray(datos)) {
        datos = [];
      }

      // Si no hay resultados con search, filtrar manualmente
      if (datos.length === 0) {
        const allResponse = await api.getPacientes({});
        const allDatos = allResponse.data || allResponse || [];
        const busquedaLower = query.toLowerCase();
        datos = allDatos.filter(p =>
          (p.nombre && p.nombre.toLowerCase().includes(busquedaLower)) ||
          (p.apellido && p.apellido.toLowerCase().includes(busquedaLower)) ||
          (p.cedula && p.cedula.includes(query)) ||
          (p.telefono && p.telefono.includes(query))
        );
      }

      setPacientes(datos);
    } catch (err) {
      console.error('Error buscando:', err);
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  }, [cargarHistorial]);

  useEffect(() => {
    cargarFirmaSesion();
  }, [cargarFirmaSesion]);

  const verResultado = (resultado) => {
    setResultadoDetalle(resultado);
    setEditando(false);
  };

  const irAPerfilFirma = useCallback(() => {
    navigate('/perfil');
  }, [navigate]);

  const asegurarFirmaDeSesion = useCallback(() => {
    if (firmaMedico) return true;
    alert('Debe registrar su firma en Mi Perfil antes de validar o imprimir resultados.');
    irAPerfilFirma();
    return false;
  }, [firmaMedico, irAPerfilFirma]);

  const asegurarResultadoFirmado = useCallback(async (resultadoBase) => {
    if (!resultadoBase) return null;
    if (resultadoBase.firmaDigital) return resultadoBase;
    if (!asegurarFirmaDeSesion()) return null;

    const firmado = await api.firmarResultado(resultadoBase._id || resultadoBase.id);
    const resultadoFirmado = {
      ...resultadoBase,
      ...(firmado?.data || firmado || {}),
      firmaDigital: (firmado?.data || firmado || {}).firmaDigital || firmaMedico,
      firmadoPor: (firmado?.data || firmado || {}).firmadoPor || resultadoBase.firmadoPor || medicoSesion,
      validadoPor: (firmado?.data || firmado || {}).validadoPor || resultadoBase.validadoPor
    };

    setResultadoDetalle((prev) => (prev && (prev._id || prev.id) === (resultadoBase._id || resultadoBase.id) ? resultadoFirmado : prev));
    return resultadoFirmado;
  }, [asegurarFirmaDeSesion, firmaMedico, medicoSesion]);

  const marcarFirmaResultado = useCallback(async (checked) => {
    if (!checked || !resultadoDetalle || resultadoDetalle.firmaDigital) return;

    try {
      setFirmandoResultado(true);
      await asegurarResultadoFirmado(resultadoDetalle);
    } catch (err) {
      alert(err.message || 'No se pudo firmar el resultado.');
    } finally {
      setFirmandoResultado(false);
    }
  }, [asegurarResultadoFirmado, resultadoDetalle]);

  const guardarResultado = async () => {
    if (!resultadoDetalle) return;
    try {
      setGuardando(true);
      await api.updateResultado(resultadoDetalle._id || resultadoDetalle.id, {
        valores: resultadoDetalle.valores,
        interpretacion: resultadoDetalle.interpretacion,
        conclusion: resultadoDetalle.conclusion
      });
      setEditando(false);
      alert('Resultado guardado correctamente');
      cargarHistorial(pacienteSeleccionado);
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const validarResultado = async () => {
    if (!resultadoDetalle) return;
    if (!asegurarFirmaDeSesion()) return;
    const id = resultadoDetalle._id || resultadoDetalle.id;
    try {
      setGuardando(true);
      await api.validarResultado(id, { estado: 'completado' });
      alert('Resultado validado correctamente');
      cargarHistorial(pacienteSeleccionado);
      setResultadoDetalle(null);
    } catch (err) {
      alert('Error al validar: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const actualizarValor = (index, campo, valor) => {
    const nuevosValores = [...(resultadoDetalle.valores || [])];
    nuevosValores[index] = { ...nuevosValores[index], [campo]: valor };
    setResultadoDetalle({ ...resultadoDetalle, valores: nuevosValores });
  };

  const agregarParametro = () => {
    const nuevosValores = [...(resultadoDetalle.valores || []), {
      parametro: '',
      valor: '',
      unidad: '',
      valorReferencia: '',
      estado: 'normal'
    }];
    setResultadoDetalle({ ...resultadoDetalle, valores: nuevosValores });
  };

  const eliminarParametro = (index) => {
    const nuevosValores = (resultadoDetalle.valores || []).filter((_, i) => i !== index);
    setResultadoDetalle({ ...resultadoDetalle, valores: nuevosValores });
  };

  const calcularEdad = (fecha) => {
    if (!fecha) return 'N/A';
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad + ' años';
  };

  const getSeguroNombre = (pac) => {
    if (!pac?.seguro) return 'Sin seguro';
    if (typeof pac.seguro === 'string') return pac.seguro;
    if (typeof pac.seguro === 'object') return pac.seguro.nombre || 'Sin seguro';
    return 'Sin seguro';
  };

  const imprimirResultado = async () => {
    if (!resultadoDetalle || !pacienteSeleccionado) return;
    let resultadoActivo = null;
    try {
      resultadoActivo = await asegurarResultadoFirmado(resultadoDetalle);
    } catch (err) {
      alert(err.message || 'No se pudo preparar la firma para imprimir.');
      return;
    }
    if (!resultadoActivo) return;

    const ventana = window.open('', 'Resultado', 'width=800,height=1000');
    if (!ventana) {
      alert('El navegador bloqueo la ventana de impresion.');
      return;
    }

    const valoresHTML = (resultadoActivo.valores || []).map(v => {
      const estadoColor = v.estado === 'normal' ? '#d4edda' : v.estado === 'alto' ? '#f8d7da' : '#fff3cd';
      const estadoTexto = v.estado === 'normal' ? '#155724' : v.estado === 'alto' ? '#721c24' : '#856404';
      return '<tr>' +
        '<td style="padding:10px;border:1px solid #87CEEB;">' + (v.parametro || '') + '</td>' +
        '<td style="padding:10px;border:1px solid #87CEEB;text-align:center;font-weight:bold;color:#1a3a5c;">' + (v.valor || '') + ' ' + (v.unidad || '') + '</td>' +
        '<td style="padding:10px;border:1px solid #87CEEB;text-align:center;font-size:12px;color:#666;">' + (v.valorReferencia || '-') + '</td>' +
        '<td style="padding:10px;border:1px solid #87CEEB;text-align:center;">' +
        '<span style="padding:4px 12px;border-radius:12px;font-size:11px;background:' + estadoColor + ';color:' + estadoTexto + ';">' + (v.estado || 'N/A') + '</span>' +
        '</td>' +
        '</tr>';
    }).join('');

    const edadPaciente = calcularEdad(pacienteSeleccionado.fechaNacimiento);
    const nombreEstudio = resultadoActivo.estudio?.nombre || resultadoActivo.nombreEstudio || 'ESTUDIO CLINICO';
    const fechaResultado = new Date(resultadoActivo.createdAt || resultadoActivo.fecha || new Date()).toLocaleDateString('es-DO');
    const doctorNombre = resultadoActivo.firmadoPor?.nombre || resultadoActivo.validadoPor?.nombre || resultadoActivo.medico?.nombre || medicoSesion?.nombre || '________________';
    const doctorApellido = resultadoActivo.firmadoPor?.apellido || resultadoActivo.validadoPor?.apellido || resultadoActivo.medico?.apellido || medicoSesion?.apellido || '';
    const firmaActiva = resultadoActivo.firmaDigital || firmaMedico || '';
    const firmaHtml = firmaActiva
      ? '<div style="margin-bottom:12px;"><img src="' + firmaActiva + '" alt="Firma del médico" style="max-width:220px;max-height:70px;object-fit:contain;" /></div>'
      : '<div style="height:60px"></div>';

    let htmlContent = '<!DOCTYPE html><html><head>';
    htmlContent += '<title>Resultado - ' + pacienteSeleccionado.nombre + '</title>';
    htmlContent += '<style>';
    htmlContent += '@page { size: A4; margin: 10mm 15mm; }';
    htmlContent += 'body { font-family: Arial, sans-serif; margin: 0; padding: 10px; color: #1a3a5c; font-size: 12px; }';
    htmlContent += '.header { text-align: center; border-bottom: 3px solid #1a3a5c; padding-bottom: 10px; margin-bottom: 15px; }';
    htmlContent += '.header img { max-width: 180px; }';
    htmlContent += '.section-title { background: #1a3a5c; color: white; padding: 8px 15px; border-radius: 5px; margin: 15px 0 10px; font-size: 13px; font-weight: bold; }';
    htmlContent += '.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; background: #f0f8ff; padding: 12px; border-radius: 8px; border-left: 4px solid #1a3a5c; margin-bottom: 15px; }';
    htmlContent += 'table { width: 100%; border-collapse: collapse; margin: 10px 0; }';
    htmlContent += 'th { background: #1a3a5c; color: white; padding: 10px; text-align: left; font-size: 11px; }';
    htmlContent += '.firma { margin-top: 50px; text-align: center; }';
    htmlContent += '.firma-linea { border-top: 2px solid #1a3a5c; width: 200px; margin: 0 auto; padding-top: 8px; }';
    htmlContent += '.footer { background: #1a3a5c; color: white; padding: 10px; text-align: center; border-radius: 5px; margin-top: 15px; font-size: 10px; }';
    htmlContent += '@media print { .no-print { display: none; } }';
    htmlContent += '</style></head><body>';

    htmlContent += '<div class="header">';
    htmlContent += '<img src="https://miesperanzalab.com/wp-content/uploads/2024/10/Logo-Mie-esperanza-Lab-Color-400x190-1.png" alt="Mi Esperanza Lab" />';
    htmlContent += '<div style="font-size:10px;margin-top:5px;">C/ Camino de Cancino #24, Cancino Adentro, Santo Domingo Este, Rep. Dom.<br/>Tel: 849-288-9790 / 809-986-9970 | miesperanzalab@gmail.com</div>';
    htmlContent += '</div>';

    htmlContent += '<div class="section-title">INFORMACION DEL PACIENTE</div>';

    htmlContent += '<div class="info-grid">';
    htmlContent += '<div><strong>Paciente:</strong> ' + pacienteSeleccionado.nombre + ' ' + (pacienteSeleccionado.apellido || '') + '</div>';
    htmlContent += '<div><strong>Cedula:</strong> ' + (pacienteSeleccionado.cedula || 'N/A') + '</div>';
    htmlContent += '<div><strong>Edad:</strong> ' + edadPaciente + '</div>';
    htmlContent += '<div><strong>Sexo:</strong> ' + (pacienteSeleccionado.sexo === 'M' ? 'Masculino' : 'Femenino') + '</div>';
    htmlContent += '<div><strong>Nacionalidad:</strong> ' + (pacienteSeleccionado.nacionalidad || 'Dominicano') + '</div>';
    htmlContent += '<div><strong>Fecha:</strong> ' + fechaResultado + '</div>';
    htmlContent += '</div>';

    htmlContent += '<div class="section-title">RESULTADO: ' + nombreEstudio + '</div>';

    htmlContent += '<table><thead><tr>';
    htmlContent += '<th style="width:35%;">Parametro</th>';
    htmlContent += '<th style="width:25%;text-align:center;">Resultado</th>';
    htmlContent += '<th style="width:25%;text-align:center;">Valor Referencia</th>';
    htmlContent += '<th style="width:15%;text-align:center;">Estado</th>';
    htmlContent += '</tr></thead><tbody>';
    htmlContent += valoresHTML || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#999;">Sin valores</td></tr>';
    htmlContent += '</tbody></table>';

    if (resultadoActivo.interpretacion) {
      htmlContent += '<div style="background:#e6f3ff;border-left:4px solid #1a3a5c;padding:10px;border-radius:5px;margin:10px 0;">';
      htmlContent += '<strong>INTERPRETACION:</strong><p style="margin:5px 0 0;">' + resultadoActivo.interpretacion + '</p></div>';
    }

    if (resultadoActivo.conclusion) {
      htmlContent += '<div style="background:#e8f5e9;border-left:4px solid #27ae60;padding:10px;border-radius:5px;margin:10px 0;">';
      htmlContent += '<strong>CONCLUSION:</strong><p style="margin:5px 0 0;">' + resultadoActivo.conclusion + '</p></div>';
    }

    htmlContent += '<div class="firma">' + firmaHtml + '<div class="firma-linea">Dr(a). ' + doctorNombre + ' ' + doctorApellido + '</div>';
    htmlContent += '<div style="font-size:10px;color:#666;margin-top:3px;">Firma y Sello</div></div>';

    htmlContent += '<div class="footer"><strong>Gracias por confiar en nosotros!</strong> | <span style="color:#87CEEB;">Su salud es nuestra prioridad</span></div>';

    htmlContent += '<script>';
    htmlContent += "window.addEventListener('load', function () { setTimeout(function () { window.focus(); window.print(); }, 250); });";
    htmlContent += "window.addEventListener('afterprint', function () { setTimeout(function () { window.close(); }, 150); });";
    htmlContent += '</script>';

    htmlContent += '</body></html>';

    ventana.document.write(htmlContent);
    ventana.document.close();
  };

  useEffect(() => {
    buscarPacientes(debouncedBusqueda);
  }, [debouncedBusqueda, buscarPacientes]);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25, color: colores.azulOscuro }}>
        <FaUserMd style={{ color: colores.azulCielo }} /> Portal Medico
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: pacienteSeleccionado ? '350px 1fr' : '1fr', gap: 20 }}>
        {/* Panel izquierdo: Busqueda */}
        <div style={{ background: theme.surface, padding: 20, borderRadius: 15, boxShadow: '0 2px 15px rgba(0,0,0,0.1)', borderTop: `5px solid ${colores.azulOscuro}`, border: `1px solid ${theme.border}` }}>
          <h3 style={{ marginTop: 0, color: colores.azulOscuro }}>Buscar Paciente</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              placeholder="Nombre, cedula..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${colores.azulCielo}`, background: theme.surface, color: theme.text }}
            />
            <button onClick={() => buscarPacientes(busqueda)} disabled={loading}
              style={{ padding: '12px 20px', background: colores.azulOscuro, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {loading ? <FaSpinner className="spin" /> : <FaSearch />}
            </button>
          </div>

          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <FaSpinner className="spin" style={{ fontSize: 30, color: colores.azulCielo }} />
              </div>
            ) : pacientes.length === 0 ? (
              <p style={{ color: theme.textMuted, textAlign: 'center', padding: 20 }}>
                No hay pacientes
              </p>
            ) : (
              pacientes.map(p => (
                <div
                  key={p._id || p.id}
                  onClick={() => cargarHistorial(p)}
                  style={{
                    padding: 15,
                    border: `2px solid ${(pacienteSeleccionado?._id || pacienteSeleccionado?.id) === (p._id || p.id) ? colores.azulOscuro : theme.border}`,
                    borderRadius: 10,
                    marginBottom: 10,
                    cursor: 'pointer',
                    background: (pacienteSeleccionado?._id || pacienteSeleccionado?.id) === (p._id || p.id) ? theme.panel : theme.surface,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, background: colores.azulCielo, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaUser style={{ color: colores.azulOscuro }} />
                    </div>
                    <div>
                      <strong style={{ color: colores.azulOscuro }}>{p.nombre} {p.apellido}</strong>
                      <div style={{ fontSize: 12, color: theme.textMuted }}>{p.cedula} | {p.telefono}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho: Historial y Resultados */}
        {pacienteSeleccionado && (
          <div style={{ background: theme.surface, padding: 25, borderRadius: 15, boxShadow: '0 2px 15px rgba(0,0,0,0.1)', border: `1px solid ${theme.border}` }}>
            {/* Info del paciente */}
            <div style={{ background: theme.panel, padding: 20, borderRadius: 10, marginBottom: 20, borderLeft: `5px solid ${colores.azulOscuro}` }}>
              <h3 style={{ margin: '0 0 15px', color: colores.azulOscuro }}>
                {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, fontSize: 14, color: theme.text }}>
                <div><strong>Cedula:</strong> {pacienteSeleccionado.cedula}</div>
                <div><strong>Edad:</strong> {calcularEdad(pacienteSeleccionado.fechaNacimiento)}</div>
                <div><strong>Sexo:</strong> {pacienteSeleccionado.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
                <div><strong>Telefono:</strong> {pacienteSeleccionado.telefono}</div>
                <div><strong>Nacionalidad:</strong> {pacienteSeleccionado.nacionalidad || 'Dominicano'}</div>
                <div><strong>Seguro:</strong> {getSeguroNombre(pacienteSeleccionado)}</div>
              </div>
            </div>

            {/* Historial de resultados */}
            {!resultadoDetalle && (
              <>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: colores.azulOscuro }}>
                  <FaFileMedical style={{ color: colores.azulCielo }} /> Historial de Resultados
                </h4>

                {loadingHistorial ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <FaSpinner className="spin" style={{ fontSize: 40, color: colores.azulCielo }} />
                  </div>
                ) : historial.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: theme.textMuted }}>
                    <FaFlask style={{ fontSize: 50, marginBottom: 15, color: colores.azulCielo }} />
                    <p>No hay resultados registrados para este paciente</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {historial.map(r => (
                      <div
                        key={r._id || r.id}
                        style={{
                          padding: 15,
                          border: `2px solid ${r.estado === 'completado' ? '#27ae60' : colores.azulCielo}`,
                          borderRadius: 10,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: r.estado === 'completado' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)'
                        }}
                      >
                        <div>
                          <strong style={{ color: colores.azulOscuro }}>{r.estudio?.nombre || r.nombreEstudio || 'Estudio'}</strong>
                          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 5 }}>
                            {new Date(r.createdAt || r.fecha).toLocaleDateString('es-DO')}
                            <span style={{
                              marginLeft: 10,
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              background: r.estado === 'completado' ? '#d4edda' : '#fff3cd',
                              color: r.estado === 'completado' ? '#155724' : '#856404'
                            }}>
                              {r.estado || 'pendiente'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => verResultado(r)}
                          style={{
                            padding: '10px 20px',
                            background: colores.azulOscuro,
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: 'bold'
                          }}
                        >
                          <FaEye /> Ver / Editar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Detalle del resultado */}
            {resultadoDetalle && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ margin: 0, color: colores.azulOscuro }}>
                    {resultadoDetalle.estudio?.nombre || resultadoDetalle.nombreEstudio || 'Resultado'}
                  </h4>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!editando ? (
                      <>
                        <button onClick={() => setEditando(true)} style={{
                          padding: '8px 15px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                        }}>
                          <FaEdit /> Editar
                        </button>
                        <button onClick={imprimirResultado} style={{
                          padding: '8px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                        }}>
                          <FaPrint /> Imprimir
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={guardarResultado} disabled={guardando} style={{
                          padding: '8px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                        }}>
                          {guardando ? <FaSpinner className="spin" /> : <FaSave />} Guardar
                        </button>
                        <button onClick={() => setEditando(false)} style={{
                          padding: '8px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer'
                        }}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tabla de valores */}
                <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: colores.azulOscuro, color: 'white' }}>
                        <th style={{ padding: 12, textAlign: 'left' }}>Parametro</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Valor</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Unidad</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Referencia</th>
                        <th style={{ padding: 12, textAlign: 'center' }}>Estado</th>
                        {editando && <th style={{ padding: 12, width: 50 }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(resultadoDetalle.valores || []).length === 0 ? (
                        <tr>
                          <td colSpan={editando ? 6 : 5} style={{ padding: 30, textAlign: 'center', color: theme.textMuted }}>
                            {editando ? 'Agregue parametros con el boton de abajo' : 'Sin valores registrados'}
                          </td>
                        </tr>
                      ) : (
                        (resultadoDetalle.valores || []).map((v, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${theme.borderSoft}` }}>
                            <td style={{ padding: 10 }}>
                              {editando ? (
                                <input value={v.parametro || ''} onChange={e => actualizarValor(i, 'parametro', e.target.value)}
                                  placeholder="Nombre del parametro"
                                  style={{ width: '100%', padding: 8, border: `1px solid ${theme.border}`, borderRadius: 4, background: theme.surface, color: theme.text }} />
                              ) : v.parametro}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              {editando ? (
                                <input value={v.valor || ''} onChange={e => actualizarValor(i, 'valor', e.target.value)}
                                  placeholder="Valor"
                                  style={{ width: 80, padding: 8, border: `1px solid ${theme.border}`, borderRadius: 4, textAlign: 'center', background: theme.surface, color: theme.text }} />
                              ) : <strong style={{ color: colores.azulOscuro }}>{v.valor}</strong>}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              {editando ? (
                                <input value={v.unidad || ''} onChange={e => actualizarValor(i, 'unidad', e.target.value)}
                                  placeholder="Unidad"
                                  style={{ width: 60, padding: 8, border: `1px solid ${theme.border}`, borderRadius: 4, textAlign: 'center', background: theme.surface, color: theme.text }} />
                              ) : v.unidad}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center', color: theme.textMuted }}>
                              {editando ? (
                                <input value={v.valorReferencia || ''} onChange={e => actualizarValor(i, 'valorReferencia', e.target.value)}
                                  placeholder="Ej: 70-100"
                                  style={{ width: 100, padding: 8, border: `1px solid ${theme.border}`, borderRadius: 4, textAlign: 'center', background: theme.surface, color: theme.text }} />
                              ) : v.valorReferencia || '-'}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              {editando ? (
                                <select value={v.estado || 'normal'} onChange={e => actualizarValor(i, 'estado', e.target.value)}
                                  style={{ padding: 8, border: `1px solid ${theme.border}`, borderRadius: 4, background: theme.surface, color: theme.text }}>
                                  <option value="normal">Normal</option>
                                  <option value="alto">Alto</option>
                                  <option value="bajo">Bajo</option>
                                </select>
                              ) : (
                                <span style={{
                                  padding: '4px 12px', borderRadius: 12, fontSize: 12,
                                  background: v.estado === 'normal' ? '#d4edda' : v.estado === 'alto' ? '#f8d7da' : '#fff3cd',
                                  color: v.estado === 'normal' ? '#155724' : v.estado === 'alto' ? '#721c24' : '#856404'
                                }}>
                                  {v.estado || 'N/A'}
                                </span>
                              )}
                            </td>
                            {editando && (
                              <td style={{ padding: 10 }}>
                                <button onClick={() => eliminarParametro(i)} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}>×</button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {editando && (
                    <button onClick={agregarParametro} style={{
                      marginTop: 10, padding: '10px 20px', background: colores.azulCielo, color: colores.azulOscuro, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'bold'
                    }}>
                      <FaPlus /> Agregar Parametro
                    </button>
                  )}
                </div>

                {/* Interpretacion */}
                <div style={{ marginBottom: 15 }}>
                  <label style={{ fontWeight: 'bold', color: colores.azulOscuro, display: 'block', marginBottom: 5 }}>Interpretacion:</label>
                  {editando ? (
                    <textarea value={resultadoDetalle.interpretacion || ''}
                      onChange={e => setResultadoDetalle({ ...resultadoDetalle, interpretacion: e.target.value })}
                      placeholder="Escriba la interpretacion de los resultados..."
                      style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${theme.border}`, minHeight: 80, background: theme.surface, color: theme.text }} />
                  ) : (
                    <p style={{ background: theme.panel, padding: 12, borderRadius: 6, margin: 0, borderLeft: `4px solid ${colores.azulOscuro}`, color: theme.text }}>
                      {resultadoDetalle.interpretacion || 'Sin interpretacion'}
                    </p>
                  )}
                </div>

                {/* Conclusion */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 'bold', color: colores.azulOscuro, display: 'block', marginBottom: 5 }}>Conclusion:</label>
                  {editando ? (
                    <textarea value={resultadoDetalle.conclusion || ''}
                      onChange={e => setResultadoDetalle({ ...resultadoDetalle, conclusion: e.target.value })}
                      placeholder="Escriba la conclusion..."
                      style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${theme.border}`, minHeight: 80, background: theme.surface, color: theme.text }} />
                  ) : (
                    <p style={{ background: 'rgba(34, 197, 94, 0.12)', padding: 12, borderRadius: 6, margin: 0, borderLeft: '4px solid #27ae60', color: theme.text }}>
                      {resultadoDetalle.conclusion || 'Sin conclusion'}
                    </p>
                  )}
                </div>

                {/* Firma Digital */}
                <div style={{ marginBottom: 20, padding: 15, border: `2px solid ${resultadoDetalle.firmaDigital ? '#27ae60' : colores.azulCielo}`, borderRadius: 10, background: resultadoDetalle.firmaDigital ? '#f8fff8' : '#fffef8' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: resultadoDetalle.firmaDigital ? 'default' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(resultadoDetalle.firmaDigital)}
                      disabled={firmandoResultado}
                      onChange={(e) => marcarFirmaResultado(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#27ae60', cursor: resultadoDetalle.firmaDigital ? 'default' : 'pointer' }}
                    />
                    <span style={{ fontWeight: 'bold', color: colores.azulOscuro, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FaSignature style={{ color: colores.azulCielo }} />
                      {firmandoResultado ? 'Firmando resultado...' : 'Firmar resultado'}
                    </span>
                  </label>

                  <p style={{ margin: '10px 0 0', fontSize: 12, color: theme.textMuted }}>
                    {resultadoDetalle.firmaDigital
                      ? `Firmado por Dr(a). ${resultadoDetalle.firmadoPor?.nombre || resultadoDetalle.validadoPor?.nombre || medicoSesion?.nombre || 'Médico'} ${resultadoDetalle.firmadoPor?.apellido || resultadoDetalle.validadoPor?.apellido || medicoSesion?.apellido || ''}`
                      : firmaMedico
                        ? 'Marque el check para aplicar la firma guardada en su sesión.'
                        : 'Primero debe crear o cargar la firma en Mi Perfil.'}
                  </p>

                  {!firmaMedico && !resultadoDetalle.firmaDigital && (
                    <button onClick={irAPerfilFirma} style={{
                      marginTop: 12, padding: '10px 18px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 'bold'
                    }}>
                      <FaSignature /> Ir a Mi Perfil
                    </button>
                  )}
                </div>

                {/* Botones de accion */}
                {resultadoDetalle.estado !== 'completado' && !editando && (
                  <button onClick={validarResultado} disabled={guardando} style={{
                    width: '100%', padding: 15, background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10
                  }}>
                    {guardando ? <FaSpinner className="spin" /> : <FaCheck />} Validar y Completar Resultado
                  </button>
                )}

                <button onClick={() => setResultadoDetalle(null)} style={{
                  width: '100%', padding: 12, background: '#6c757d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
                }}>
                  Volver al Historial
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalMedico;
