import React, { useState, useEffect } from 'react';
import { FaFlask, FaLock, FaUser, FaSpinner, FaCheckCircle, FaClock, FaQrcode, FaExclamationTriangle, FaHospital, FaArrowLeft, FaPrint } from 'react-icons/fa';

/* ─── Paleta de colores mejorada ─────────────────────────────────────── */
const C = {
  dark: '#0a1e2f',
  mid: '#1a3a5c',
  blue: '#2980b9',
  sky: '#5dade2',
  accent: '#3498db',
  accentLight: '#5dade2',
  green: '#27ae60',
  greenLight: '#52c77a',
  red: '#e74c3c',
  orange: '#f39c12',
  white: '#fff',
  gray: '#95a5a6',
  grayLight: '#ecf0f1',
};

/* ─── Helpers ───────────────────────────────────────────────── */
const getFmtMoney = (n) =>
  `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

const calcularEdad = (fecha) => {
  if (!fecha) return 'N/A';
  const hoy = new Date();
  const nac = new Date(fecha);
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return `${e} años`;
};

const EstadoBadge = ({ estado }) => {
  const cfg = {
    pendiente: { bg: 'linear-gradient(135deg, #fff3cd, #ffe69c)', color: '#856404', label: '⏳ Pendiente', border: '#ffc107' },
    en_proceso: { bg: 'linear-gradient(135deg, #cce5ff, #99ccff)', color: '#004085', label: '🔬 En Proceso', border: '#0066cc' },
    completado: { bg: 'linear-gradient(135deg, #d4edda, #b2dfb8)', color: '#155724', label: '✅ Disponible', border: '#28a745' },
    entregado: { bg: 'linear-gradient(135deg, #d4edda, #b2dfb8)', color: '#155724', label: '✅ Entregado', border: '#28a745' },
  };
  const c = cfg[estado] || { bg: '#f8f9fa', color: '#666', label: estado || 'Desconocido', border: '#ddd' };
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '6px 14px', borderRadius: 14, fontSize: 12, fontWeight: 'bold',
      display: 'inline-block',
      border: `2px solid ${c.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {c.label}
    </span>
  );
};

/* ─── Componente principal ──────────────────────────────────── */
const PortalPaciente = () => {
  /* Detección de modo QR en URL */
  const params = new URLSearchParams(window.location.search);
  const qrParam = params.get('qr');

  const [modo, setModo] = useState(qrParam ? 'cargando-qr' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState(null);
  const [bloqueo, setBloqueo] = useState(null); // { montoPendiente, totalFactura, mensaje }
  const [empresaNombre, setEmpresaNombre] = useState('Centro Diagnóstico');

  /* ── Fallback: si después de 15s sigue en cargando-qr, mostrar login ── */
  useEffect(() => {
    if (modo !== 'cargando-qr') return;
    const timeout = setTimeout(() => {
      setModo('login');
      setError('No se pudo verificar el código QR. Por favor, ingrese sus credenciales.');
      setLoading(false);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [modo]);

  /* ── Cargar nombre de empresa ── */
  useEffect(() => {
    fetch('/api/configuracion/empresa')
      .then(r => r.json())
      .then(data => {
        const nombre = data?.nombre || data?.empresa_nombre;
        if (nombre) setEmpresaNombre(nombre);
      })
      .catch(() => {});
  }, []);

  /* ── Validar QR pero requerir confirmación con contraseña ── */
  useEffect(() => {
    if (!qrParam) return;
    const validarQR = async () => {
      setLoading(true);
      try {
        // Timeout de 10 segundos para evitar que se quede cargando indefinidamente
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // Validar que el QR existe y obtener info de la factura
        const res = await fetch(`/api/verificar/${encodeURIComponent(qrParam)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          setError('Código QR inválido o expirado');
          setModo('login');
          return;
        }

        const data = await res.json();

        if (data.valido) {
          // QR válido - mostrar pantalla de login con mensaje
          setModo('login-qr');
          setError('');
        } else {
          setError(data.mensaje || 'Código QR inválido o expirado');
          setModo('login');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Tiempo de espera agotado. Verifique su conexión e intente de nuevo.');
        } else {
          setError('Error al validar código QR. Verifique su conexión.');
        }
        setModo('login');
      } finally {
        setLoading(false);
      }
    };
    validarQR();
  }, [qrParam]);

  /* ── Login con usuario/contraseña (ahora requiere auth incluso con QR) ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Complete usuario y contraseña'); return; }
    setLoading(true);
    setError('');

    console.log('[PortalPaciente] Iniciando login...', { username, hasQR: !!qrParam });

    try {
      // Si hay QR, primero validar credenciales y luego usar el QR para obtener resultados
      if (qrParam) {
        console.log('[PortalPaciente] Login con QR:', qrParam);
        // Validar credenciales primero
        const authRes = await fetch('/api/resultados/acceso-paciente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const authData = await authRes.json();

        console.log('[PortalPaciente] Respuesta de autenticación:', { success: authData.success, blocked: authData.blocked });

        if (!authData.success && !authData.blocked) {
          setError(authData.message || 'Usuario o contraseña incorrectos');
          setLoading(false);
          return;
        }

        // Si autenticó exitosamente, ahora usar el QR para obtener los resultados específicos
        const res = await fetch(`/api/resultados/acceso-qr/${encodeURIComponent(qrParam)}`);
        const data = await res.json();

        console.log('[PortalPaciente] Respuesta de acceso QR:', { success: data.success, blocked: data.blocked, count: data.count });

        if (data.blocked) {
          setBloqueo({
            montoPendiente: data.montoPendiente,
            totalFactura: data.totalFactura,
            montoPagado: data.montoPagado,
            mensaje: data.mensaje,
            factura: data.factura
          });
          setModo('bloqueado');
        } else if (data.success) {
          console.log('[PortalPaciente] Resultados cargados:', data.count || 0, 'resultados');
          setDatos(data);
          setModo('resultados');
        } else {
          setError(data.message || 'Error al cargar resultados');
        }
      } else {
        console.log('[PortalPaciente] Login normal (sin QR)');
        // Login normal sin QR
        const res = await fetch('/api/resultados/acceso-paciente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        console.log('[PortalPaciente] Respuesta de login:', { success: data.success, blocked: data.blocked, count: data.count });

        if (data.blocked) {
          setBloqueo({
            montoPendiente: data.montoPendiente,
            totalFactura: data.totalFactura,
            montoPagado: data.montoPagado,
            mensaje: data.mensaje,
            factura: data.factura
          });
          setModo('bloqueado');
        } else if (data.success) {
          console.log('[PortalPaciente] Resultados cargados:', data.count || 0, 'resultados');
          setDatos(data);
          setModo('resultados');
        } else {
          setError(data.message || 'Usuario o contraseña incorrectos');
        }
      }
    } catch (err) {
      console.error('[PortalPaciente] Error en login:', err);
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Imprimir un resultado ── */
  const imprimirResultado = (r) => {
    const win = window.open('', 'print', 'width=800,height=900');
    const rows = (r.valores || []).map(v => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${v.parametro || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold">
          ${v.valor || ''} ${v.unidad || ''}
        </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;color:#666">
          ${v.valorReferencia || '-'}
        </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">
          <span style="background:${v.estado === 'normal' ? '#d4edda' : '#f8d7da'};
                       color:${v.estado === 'normal' ? '#155724' : '#721c24'};
                       padding:2px 8px;border-radius:10px;font-size:11px">
            ${v.estado || 'N/A'}
          </span>
        </td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Resultado</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;color:#1a3a5c}
      table{width:100%;border-collapse:collapse} th{background:#1a3a5c;color:white;padding:10px}
      .footer{text-align:center;margin-top:30px;padding:10px;background:#1a3a5c;color:white;border-radius:5px}
      @media print{button{display:none}}</style></head><body>
      <div style="text-align:center;border-bottom:3px solid #1a3a5c;padding-bottom:15px;margin-bottom:20px">
        <h1 style="color:#1a3a5c;margin:0">${empresaNombre}</h1>
        <h2 style="font-weight:normal;color:#555;margin:5px 0">${r.estudio?.nombre || 'Resultado'}</h2>
      </div>
      <div style="background:#f0f8ff;padding:15px;border-radius:8px;margin-bottom:20px">
        <strong>Paciente:</strong> ${datos?.paciente?.nombre || ''} ${datos?.paciente?.apellido || ''} &nbsp;|&nbsp;
        <strong>Cédula:</strong> ${datos?.paciente?.cedula || ''} &nbsp;|&nbsp;
        <strong>Fecha:</strong> ${new Date(r.createdAt).toLocaleDateString('es-DO')}
      </div>
      <table><thead><tr><th>Parámetro</th><th>Resultado</th><th>Referencia</th><th>Estado</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888">Sin valores registrados</td></tr>'}</tbody></table>
      ${r.interpretacion ? `<div style="background:#e6f3ff;border-left:4px solid #1a3a5c;padding:12px;margin-top:15px;border-radius:5px">
        <strong>Interpretación:</strong><p>${r.interpretacion}</p></div>` : ''}
      ${r.validadoPor ? `<p style="margin-top:40px;text-align:center">Validado por: Dr. ${r.validadoPor.nombre} ${r.validadoPor.apellido || ''}</p>` : ''}
      <div class="footer"><strong>Gracias por confiar en nosotros</strong> · Su salud es nuestra prioridad</div>
      <div style="text-align:center;margin-top:20px">
        <button onclick="window.print()" style="padding:12px 30px;background:#1a3a5c;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px">Imprimir</button>
      </div></body></html>`);
    win.document.close();
  };

  /* ================================ RENDER ================================ */

  /* Pantalla de carga inicial (QR param) */
  if (modo === 'cargando-qr') {
    return (
      <div style={styles.bg}>
        <div style={styles.card}>
          <FaSpinner style={{ fontSize: 50, color: C.blue, animation: 'spin 1s linear infinite', marginBottom: 20 }} />
          <h2 style={{ color: C.mid }}>Verificando código QR...</h2>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  /* Pantalla de pago bloqueado */
  if (modo === 'bloqueado' && bloqueo) {
    return (
      <div style={styles.bg}>
        <div style={{ ...styles.card, maxWidth: 520 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={styles.iconCircle(C.red)}>
              <FaExclamationTriangle style={{ fontSize: 32, color: C.white }} />
            </div>
            <h2 style={{ color: C.red, margin: '15px 0 5px' }}>Pago Pendiente</h2>
            <p style={{ color: '#666', margin: 0 }}>No puede acceder a sus resultados hasta liquidar el saldo</p>
          </div>

          {/* Detalles */}
          <div style={{ background: '#fff3cd', border: '2px solid #ffc107', borderRadius: 12, padding: 20, marginBottom: 25 }}>
            <div style={styles.row}><span>Total de la factura</span><span style={{ fontWeight: 'bold' }}>{getFmtMoney(bloqueo.totalFactura)}</span></div>
            <div style={styles.row}><span>Monto pagado</span><span style={{ color: C.green, fontWeight: 'bold' }}>{getFmtMoney(bloqueo.montoPagado)}</span></div>
            <div style={{ ...styles.row, borderTop: '2px solid #ffc107', paddingTop: 10, marginTop: 10 }}>
              <span style={{ fontWeight: 'bold' }}>Saldo pendiente</span>
              <span style={{ color: C.red, fontWeight: 'bold', fontSize: 20 }}>{getFmtMoney(bloqueo.montoPendiente)}</span>
            </div>
          </div>

          {bloqueo.factura && (
            <p style={{ textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 20 }}>
              Factura #{bloqueo.factura.numero}
            </p>
          )}

          <p style={{ textAlign: 'center', color: '#555', fontSize: 14, lineHeight: 1.6 }}>
            Por favor, acuda a la institución o contacte a recepción para realizar el pago restante
            y poder acceder a sus resultados.
          </p>

          <button onClick={() => { setModo('login'); setBloqueo(null); }} style={styles.btnSecondary}>
            <FaArrowLeft /> Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  /* Pantalla de resultados */
  if (modo === 'resultados' && datos) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.dark} 0%, ${C.blue} 100%)`, padding: 20 }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Header */}
          <div style={styles.resultsHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaHospital style={{ fontSize: 30 }} />
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{empresaNombre}</h2>
                <p style={{ margin: '3px 0 0', opacity: 0.8, fontSize: 13 }}>Portal de Resultados para Pacientes</p>
              </div>
            </div>
            <button onClick={() => { setModo('login'); setDatos(null); setUsername(''); setPassword(''); window.history.pushState({}, '', window.location.pathname); }}
              style={{ background: 'rgba(255,255,255,0.2)', color: C.white, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaArrowLeft /> Salir
            </button>
          </div>

          {/* Info Paciente */}
          <div style={styles.patientCard}>
            <div style={styles.iconCircle(C.mid)}>
              <FaUser style={{ fontSize: 22, color: C.white }} />
            </div>
            <div style={{ marginLeft: 20, flex: 1 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>Bienvenido(a)</p>
              <h3 style={{ margin: 0, color: C.mid, fontSize: 20 }}>
                {datos.paciente?.nombre} {datos.paciente?.apellido}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginTop: 8, fontSize: 14, color: '#555' }}>
                {datos.paciente?.cedula && <span><strong>Cédula:</strong> {datos.paciente.cedula}</span>}
                {datos.paciente?.fechaNacimiento && <span><strong>Edad:</strong> {calcularEdad(datos.paciente.fechaNacimiento)}</span>}
                {datos.paciente?.sexo && <span><strong>Sexo:</strong> {datos.paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>}
                {datos.factura?.numero && <span><strong>Factura:</strong> {datos.factura.numero}</span>}
              </div>
            </div>
          </div>

          {/* Resultados */}
          <h3 style={{ color: C.white, margin: '25px 0 15px', fontSize: 18 }}>
            🔬 Resultados de su Visita ({datos.data?.length || 0})
          </h3>

          {datos.data?.length > 0 ? datos.data.map((r, i) => (
            <div key={i} className="result-card" style={styles.resultCard}>
              <div style={styles.resultHeader}>
                <div>
                  <h4 style={{ margin: '0 0 4px', color: C.mid, fontSize: 16 }}>
                    {r.estudio?.nombre || 'Estudio'}
                  </h4>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {r.codigoMuestra && `Código: ${r.codigoMuestra} · `}
                    {new Date(r.createdAt).toLocaleDateString('es-DO')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <EstadoBadge estado={r.estado} />
                  {(r.estado === 'completado' || r.estado === 'entregado') && (
                    <button onClick={() => imprimirResultado(r)} style={styles.btnPrint}>
                      <FaPrint /> Imprimir
                    </button>
                  )}
                </div>
              </div>

              {(r.estado === 'completado' || r.estado === 'entregado') ? (
                <div style={{ padding: 20 }}>
                  {r.valores?.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: '#f0f8ff' }}>
                            {['Parámetro', 'Valor', 'Unidad', 'Referencia', 'Estado'].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: '600', borderBottom: '2px solid #e0e0e0' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {r.valores.map((v, j) => (
                            <tr key={j} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{v.parametro}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold', color: v.estado && v.estado !== 'normal' ? C.red : C.green }}>
                                {v.valor}
                              </td>
                              <td style={{ padding: '10px 12px', color: '#888' }}>{v.unidad}</td>
                              <td style={{ padding: '10px 12px', color: '#888', fontSize: 12 }}>{v.valorReferencia}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {v.estado && (
                                  <span style={{
                                    background: v.estado === 'normal' ? '#d4edda' : '#f8d7da',
                                    color: v.estado === 'normal' ? '#155724' : '#721c24',
                                    padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600
                                  }}>{v.estado}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {r.interpretacion && (
                    <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginTop: 15, borderLeft: `4px solid ${C.mid}`, color: '#444', fontStyle: 'italic', fontSize: 14 }}>
                      {r.interpretacion}
                    </div>
                  )}
                  {r.validadoPor && (
                    <p style={{ fontSize: 13, color: '#888', marginTop: 12 }}>
                      ✅ Validado por: Dr. {r.validadoPor.nombre} {r.validadoPor.apellido}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#888' }}>
                  <FaClock style={{ fontSize: 30, marginBottom: 10, color: C.orange }} />
                  <p style={{ margin: 0 }}>Sus resultados estarán disponibles en breve. Por favor, regrese más tarde.</p>
                </div>
              )}
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 16, color: C.white }}>
              <FaFlask style={{ fontSize: 50, marginBottom: 15, opacity: 0.6 }} />
              <p>No hay resultados disponibles aún para esta visita.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Pantalla de Login (modo por defecto) ── */
  return (
    <div style={styles.bg}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .portal-input:focus {
          outline: none;
          border-color: ${C.accent} !important;
          box-shadow: 0 0 0 4px rgba(52,152,219,0.15);
          transform: translateY(-1px);
        }
        .portal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(41,128,185,0.5) !important;
        }
        .portal-btn:active {
          transform: translateY(0px);
          box-shadow: 0 4px 15px rgba(41,128,185,0.4) !important;
        }
        .portal-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .result-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 35px rgba(0,0,0,0.15) !important;
        }
      `}</style>

      <div style={{ ...styles.card, animation: 'fadeInUp 0.5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={styles.iconCircle(C.mid)}>
            <FaHospital style={{ fontSize: 32, color: C.white }} />
          </div>
          <h2 style={{ margin: '18px 0 5px', color: C.mid, fontSize: 22 }}>{empresaNombre}</h2>
          <h3 style={{ margin: 0, color: C.blue, fontWeight: 400, fontSize: 16 }}>Portal de Resultados</h3>
          <p style={{ margin: '10px 0 0', color: '#888', fontSize: 13 }}>Portal de resultados para pacientes</p>
        </div>

        {/* QR hint or validation message */}
        {(modo === 'login-qr' || qrParam) ? (
          <div style={{ background: '#d1ecf1', borderRadius: 10, padding: '12px 15px', marginBottom: 22, display: 'flex', gap: 12, alignItems: 'center', border: '2px solid #bee5eb' }}>
            <FaCheckCircle style={{ fontSize: 28, color: '#0c5460', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#0c5460', lineHeight: 1.5 }}>
              <strong>✓ Código QR válido</strong><br />
              Por seguridad, ingrese su usuario y contraseña para acceder a sus resultados.
            </p>
          </div>
        ) : (
          <div style={{ background: '#e8f4fd', borderRadius: 10, padding: '12px 15px', marginBottom: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            <FaQrcode style={{ fontSize: 28, color: C.accent, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
              <strong>¿Tiene el QR de su factura?</strong><br />
              Escanéelo con su teléfono y luego ingrese sus credenciales para acceder.
            </p>
          </div>
        )}

        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px 15px', borderRadius: 8, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Usuario</label>
            <div style={{ position: 'relative' }}>
              <FaUser style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input
                className="portal-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ej: juan4501"
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={styles.label}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input
                className="portal-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Su clave de la factura"
                style={styles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="portal-btn" style={styles.btnPrimary}>
            {loading
              ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
              : <><FaCheckCircle /> Ver Mis Resultados</>
            }
          </button>
        </form>

        <div style={{ marginTop: 20, padding: 15, background: '#f8f9fa', borderRadius: 10, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          💡 <strong>¿Dónde encuentro mi usuario y contraseña?</strong><br />
          Están impresos en la factura que recibió al registrarse. También puede escanear el código QR de la factura.
        </div>
      </div>
    </div>
  );
};

/* ─── Estilos reutilizables ─────────────────────────────────── */
const styles = {
  bg: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${C.dark} 0%, ${C.mid} 50%, ${C.blue} 100%)`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    background: C.white,
    borderRadius: 24,
    padding: '45px 40px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 30px 70px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  iconCircle: (bg) => ({
    width: 80, height: 80,
    background: `linear-gradient(135deg, ${bg}, ${C.accent})`,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
  }),
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#444',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 42px',
    borderRadius: 12,
    border: '2px solid #e0e0e0',
    boxSizing: 'border-box',
    fontSize: 15,
    transition: 'all 0.3s ease',
    background: '#fafafa',
  },
  btnPrimary: {
    width: '100%',
    padding: '16px',
    background: `linear-gradient(135deg, ${C.mid} 0%, ${C.blue} 50%, ${C.accent} 100%)`,
    color: C.white,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: `0 6px 20px rgba(41,128,185,0.4)`,
    transition: 'all 0.3s ease',
  },
  btnSecondary: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    color: C.mid,
    border: `2px solid ${C.mid}`,
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  btnPrint: {
    padding: '10px 18px',
    background: `linear-gradient(135deg, ${C.mid}, ${C.blue})`,
    color: C.white,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    boxShadow: '0 4px 12px rgba(26,58,92,0.25)',
    transition: 'all 0.3s ease',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 0',
    fontSize: 15,
  },
  resultsHeader: {
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(15px)',
    borderRadius: 18,
    padding: '20px 26px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: C.white,
    marginBottom: 22,
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  patientCard: {
    background: `linear-gradient(135deg, ${C.white} 0%, ${C.grayLight} 100%)`,
    borderRadius: 18,
    padding: '24px 28px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
    marginBottom: 12,
    border: '1px solid rgba(0,0,0,0.05)',
  },
  resultCard: {
    background: C.white,
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    boxShadow: '0 6px 25px rgba(0,0,0,0.1)',
    border: '1px solid rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
  },
  resultHeader: {
    background: `linear-gradient(135deg, #f8f9fa 0%, ${C.grayLight} 100%)`,
    padding: '18px 22px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    borderBottom: '2px solid #e8ecef',
  },
};

export default PortalPaciente;
