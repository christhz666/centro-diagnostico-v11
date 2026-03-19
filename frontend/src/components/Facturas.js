import React, { useState, useEffect, useCallback } from 'react';
import { FaFileInvoiceDollar, FaEye, FaPrint, FaSpinner, FaPlus, FaChartLine, FaMoneyBillWave, FaFileExcel } from 'react-icons/fa';
import api from '../services/api';
import FacturaTermica from './FacturaTermica';
import { loadXLSX } from '../utils/loadXlsx';

const theme = {
  surface: 'var(--legacy-surface)',
  surfaceMuted: 'var(--legacy-surface-muted)',
  surfaceHover: 'var(--legacy-surface-hover)',
  panel: 'var(--legacy-surface-panel)',
  border: 'var(--legacy-border)',
  borderSoft: 'var(--legacy-border-soft)',
  text: 'var(--legacy-text)',
  textStrong: 'var(--legacy-text-strong)',
  textMuted: 'var(--legacy-text-muted)'
};

const Facturas = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const [citasPendientes, setCitasPendientes] = useState([]);
  const [showModalNueva, setShowModalNueva] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [facturaImprimir, setFacturaImprimir] = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [showModalPago, setShowModalPago] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');

  const fetchTurnoActivo = useCallback(async () => {
    try {
      const response = await api.getTurnoActivo();
      if (response && (response.data || response)) setTurnoActivo(response.data || response);
      else setTurnoActivo(null);
    } catch (err) {
      console.error('Error cargando turno:', err);
      setTurnoActivo(null);
    }
  }, []);

  const abrirTurnoManual = async () => {
    try {
      setLoading(true);
      await api.abrirTurnoCaja();
      fetchTurnoActivo();
    } catch (err) {
      console.error('Error abriendo caja:', err);
    } finally {
      setLoading(false);
    }
  };

  const cerrarTurnoManual = async () => {
    if (!window.confirm('¿Desea cerrar la caja actual?')) return;
    try {
      setLoading(true);
      await api.cerrarTurnoCaja();
      setTurnoActivo(null);
    } catch (err) {
      console.error('Error cerrando caja:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacturas = useCallback(async (isSilent = false, estado = filtroEstado) => {
    try {
      if (!isSilent) setLoading(true);
      const params = estado ? { estado } : {};
      const response = await api.getFacturas(params);
      setFacturas(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error(err);
      if (!isSilent) setFacturas([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [filtroEstado]);

  const fetchCitasPendientes = useCallback(async (isSilent = false) => {
    try {
      const response = await api.getCitas({ pagado: false });
      const citas = Array.isArray(response) ? response : (response.data || []);
      setCitasPendientes(citas.filter(c => c.estado === 'completada' || c.estado === 'programada'));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchFacturas();
    fetchCitasPendientes();
    fetchTurnoActivo();

    const interval = setInterval(() => {
      fetchFacturas(true);
      fetchCitasPendientes(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchFacturas, fetchCitasPendientes, fetchTurnoActivo]);

  const verDetalle = async (factura) => {
    try {
      const response = await api.getFactura(factura._id || factura.id);
      setFacturaDetalle(response);
    } catch (err) {
      console.error(err);
    }
  };

  const imprimirFactura = async (factura) => {
    try {
      const response = await api.getFactura(factura._id || factura.id);
      const facturaCompleta = response;
      let pacienteData = facturaCompleta.paciente || facturaCompleta.datosCliente;

      if (typeof pacienteData === 'string') {
        try {
          const pacienteResponse = await api.getPaciente(pacienteData);
          pacienteData = pacienteResponse.data;
        } catch (e) {
          pacienteData = facturaCompleta.datosCliente || { nombre: 'N/A' };
        }
      }

      const estudios = (facturaCompleta.detalles || facturaCompleta.items || []).map(item => ({
        nombre: item.descripcion || item.nombre || 'Estudio',
        precio: item.precioUnitario || item.precio_unitario || item.precio || 0,
        cobertura: item.descuento || item.cobertura || 0
      }));

      setFacturaImprimir({
        factura: { ...facturaCompleta, numero: facturaCompleta.numero || facturaCompleta.numero_factura },
        paciente: pacienteData,
        estudios: estudios
      });
    } catch (err) {
      console.error('Error al cargar factura:', err);
    }
  };

  const crearFactura = async () => {
    if (!turnoActivo) { alert("Inicie el turno de caja."); return; }
    if (!citaSeleccionada) return;

    try {
      const items = citaSeleccionada.estudios?.map(e => ({
        descripcion: e.estudio?.nombre || 'Estudio',
        nombre: e.estudio?.nombre || 'Estudio',
        estudio: e.estudio?._id || e.estudio,
        cantidad: 1,
        precio: e.precio || 0,
        precioUnitario: e.precio || 0,
        cobertura: e.cobertura || 0,
        subtotal: e.precio || 0
      })) || [];

      const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
      const cobertura = items.reduce((sum, i) => sum + (i.cobertura || 0), 0);
      const total = subtotal - cobertura;

      await api.createFactura({
        paciente: citaSeleccionada.paciente?._id || citaSeleccionada.paciente,
        cita: citaSeleccionada._id,
        items, subtotal, cobertura, total,
        montoPagado: total, metodoPago: 'efectivo', estado: 'pagada'
      });

      setShowModalNueva(false);
      setCitaSeleccionada(null);
      fetchFacturas();
      fetchCitasPendientes();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const registrarPago = async () => {
    if (!showModalPago || !montoPago) return;
    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) { alert('Ingrese un monto válido'); return; }

    try {
      setLoading(true);
      await api.pagarFactura(showModalPago._id || showModalPago.id, monto, metodoPago);
      setShowModalPago(null);
      setMontoPago('');
      setMetodoPago('efectivo');
      fetchFacturas();
    } catch (err) {
      alert('Error al registrar pago: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalHoy = () => {
    if (!turnoActivo) return 0;
    const inicioTurno = new Date(turnoActivo.fechaInicio).getTime();
    return facturas
      .filter(f => {
        if (f.estado === 'anulada') return false;
        const fTime = new Date(f.fecha_factura || f.createdAt).getTime();
        return fTime >= inicioTurno;
      })
      .reduce((sum, f) => sum + (f.total || 0), 0);
  };

  const exportarExcel = async () => {
    const XLSX = await loadXLSX();
    const data = facturas.map(f => ({
      'Número': f.numero || f._id,
      'Paciente': `${f.paciente?.nombre || ''} ${f.paciente?.apellido || ''}`.trim(),
      'Cédula': f.paciente?.cedula || '',
      'Fecha': new Date(f.fecha_factura || f.createdAt).toLocaleDateString('es-DO'),
      'Estado': f.estado || '',
      'Total': f.total || 0,
      'Pagado': f.montoPagado || 0,
      'Pendiente': Math.max(0, (f.total || 0) - (f.montoPagado || 0)),
      'Método': f.metodoPago || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, `Facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <FaSpinner className="spin" style={{ fontSize: 32, color: '#2563eb' }} />
      <p style={{ color: theme.textMuted, fontWeight: 500 }}>Sincronizando caja fiscal...</p>
    </div>
  );

  if (facturaImprimir) {
    return (
      <FacturaTermica
        factura={facturaImprimir.factura}
        paciente={facturaImprimir.paciente}
        estudios={facturaImprimir.estudios}
        onClose={() => setFacturaImprimir(null)}
      />
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 44, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(37, 99, 235, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <FaFileInvoiceDollar size={20} />
            </div>
            Gestión Fiscal
          </h1>
          <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 16, fontWeight: 500 }}>Control de ingresos y comprobantes autorizados</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={exportarExcel}
            style={{
              padding: '14px 20px', borderRadius: 10,
              background: '#10b981', color: 'white',
              border: 'none', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
            }}
          >
            <FaFileExcel /> EXPORTAR EXCEL
          </button>
          <button
            onClick={() => setShowModalNueva(true)}
            style={{
              padding: '14px 24px', borderRadius: 10,
              background: '#2563eb', color: 'white',
              border: 'none', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}
          >
            <FaPlus /> FACTURACIÓN RÁPIDA
          </button>
        </div>
      </div>

      {/* ── Stat Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 44 }}>
        <div style={{ background: theme.surface, padding: 28, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase' }}>Caja de Hoy</div>
            <button onClick={turnoActivo ? cerrarTurnoManual : abrirTurnoManual} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              {turnoActivo ? 'CERRAR CAJA' : 'ABRIR CAJA'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: theme.textStrong }}>RD$ {calcularTotalHoy().toLocaleString()}</h2>
            <span style={{ fontSize: 12, color: turnoActivo ? '#10b981' : '#ef4444', fontWeight: 800 }}>
              {turnoActivo ? 'ACTIVA' : 'CERRADA'}
            </span>
          </div>
        </div>

        <div style={{ background: theme.surface, padding: 28, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', marginBottom: 16 }}>Operaciones del Mes</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: theme.textStrong }}>RD$ {facturas.reduce((sum, f) => sum + (f.total || 0), 0).toLocaleString()}</h2>
            <div style={{ color: '#2563eb' }}><FaChartLine size={20} /></div>
          </div>
        </div>
      </div>

      {/* ── Tabla de Historial ── */}
      <div style={{ background: theme.surface, borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${theme.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: theme.textStrong }}>Registros Emitidos</h2>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, outline: 'none', fontSize: 13, background: theme.surface, color: theme.text }}>
            <option value="">Estados: Todos</option>
            <option value="pagada">Pagadas</option>
            <option value="emitida">Pendientes</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme.surfaceMuted }}>
                {['COMPROBANTE', 'FECHA', 'PACIENTE', 'TOTAL RD$', 'PAGADO', 'PENDIENTE', 'ESTADO', 'ACCIONES'].map(h => (
                  <th key={h} style={{ padding: '16px 24px', textAlign: (h === 'TOTAL RD$' || h === 'PAGADO' || h === 'PENDIENTE') ? 'right' : 'left', color: theme.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Sin transacciones registradas</td></tr>
              ) : (
                facturas.map(f => {
                  const pendiente = Math.max(0, (f.total || 0) - (f.montoPagado || 0));
                  const tienePendiente = pendiente > 0 && f.estado !== 'anulada';
                  return (
                    <tr key={f._id} style={{ borderBottom: `1px solid ${theme.borderSoft}`, transition: 'all 0.1s' }} className="hover-row">
                      <td style={{ padding: '20px 24px', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>#{f.numero || f.numero_factura}</td>
                      <td style={{ padding: '20px 24px', color: theme.textMuted, fontSize: 14 }}>{new Date(f.fecha_factura || f.createdAt).toLocaleDateString('es-DO')}</td>
                      <td style={{ padding: '20px 24px', color: theme.text, fontWeight: 600, fontSize: 14 }}>{f.datosCliente?.nombre || f.paciente?.nombre || 'Paciente'}</td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 800, color: theme.textStrong, fontSize: 15 }}>${(f.total || 0).toLocaleString()}</td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 600, color: '#10b981', fontSize: 14 }}>${(f.montoPagado || 0).toLocaleString()}</td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 700, color: tienePendiente ? '#ef4444' : '#10b981', fontSize: 14 }}>
                        {tienePendiente ? `$${pendiente.toLocaleString()}` : '$0'}
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          background: f.estado === 'pagada' ? '#ecfdf5' : f.estado === 'anulada' ? '#fef2f2' : '#fff3cd',
                          color: f.estado === 'pagada' ? '#10b981' : f.estado === 'anulada' ? '#ef4444' : '#856404'
                        }}>{f.estado === 'emitida' && tienePendiente ? 'pendiente' : f.estado}</span>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => verDetalle(f)} style={{ background: theme.surfaceMuted, border: 'none', color: theme.textStrong, width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }}><FaEye size={12} /></button>
                          <button onClick={() => imprimirFactura(f)} style={{ background: '#eff6ff', border: 'none', color: '#2563eb', width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }}><FaPrint size={12} /></button>
                          {tienePendiente && (
                            <button onClick={() => { setShowModalPago(f); setMontoPago(pendiente.toString()); }} style={{ background: '#ecfdf5', border: 'none', color: '#10b981', width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }} title="Registrar pago"><FaMoneyBillWave size={12} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modales ── */}
      {facturaDetalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: theme.surface, borderRadius: 12, width: '100%', maxWidth: 500, padding: 32, boxShadow: 'var(--shadow-lg)', border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: theme.textStrong }}>Comprobante #{facturaDetalle.numero || facturaDetalle.numero_factura}</h3>
            <div style={{ background: theme.surfaceMuted, padding: 20, borderRadius: 10, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: theme.textMuted }}>Subtotal</span><span style={{ color: theme.text }}>{(facturaDetalle.subtotal || 0).toLocaleString() ? `$${(facturaDetalle.subtotal || 0).toLocaleString()}` : '$0'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#ef4444' }}>Cobertura</span><span style={{ color: '#ef4444' }}>-${(facturaDetalle.cobertura || facturaDetalle.descuento || 0).toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: 10, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: theme.text }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: theme.textStrong }}>${(facturaDetalle.total || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#10b981' }}>Monto Pagado</span><span style={{ color: '#10b981', fontWeight: 700 }}>${(facturaDetalle.montoPagado || 0).toLocaleString()}</span></div>
              {Math.max(0, (facturaDetalle.total || 0) - (facturaDetalle.montoPagado || 0)) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: 10 }}>
                  <span style={{ fontWeight: 800, color: '#ef4444' }}>PENDIENTE</span>
                  <span style={{ fontWeight: 900, color: '#ef4444', fontSize: 22 }}>${Math.max(0, (facturaDetalle.total || 0) - (facturaDetalle.montoPagado || 0)).toLocaleString()}</span>
                </div>
              )}
              {Math.max(0, (facturaDetalle.total || 0) - (facturaDetalle.montoPagado || 0)) <= 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: 15 }}>
                  <span style={{ fontWeight: 800, color: theme.text }}>PAGADO COMPLETO</span>
                  <span style={{ fontWeight: 900, color: '#10b981', fontSize: 22 }}>✓</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setFacturaDetalle(null); imprimirFactura(facturaDetalle); }} style={{ flex: 1, padding: 12, borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>REIMPRIMIR</button>
              <button onClick={() => setFacturaDetalle(null)} style={{ padding: 12, borderRadius: 8, background: theme.surfaceMuted, border: `1px solid ${theme.border}`, color: theme.text, fontWeight: 700, cursor: 'pointer' }}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {showModalNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: theme.surface, borderRadius: 12, width: '100%', maxWidth: 500, padding: 32, boxShadow: 'var(--shadow-lg)', border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: theme.textStrong }}>Admisiones Pendientes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 350, overflowY: 'auto', marginBottom: 24 }}>
              {citasPendientes.map(cita => (
                <div key={cita._id} onClick={() => setCitaSeleccionada(cita)} style={{
                  padding: 16, borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${citaSeleccionada?._id === cita._id ? '#2563eb' : theme.border}`,
                  background: citaSeleccionada?._id === cita._id ? theme.panel : theme.surface
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 14, color: theme.textStrong }}>{cita.paciente?.nombre} {cita.paciente?.apellido}</strong>
                    <span style={{ color: '#2563eb', fontWeight: 800 }}>${cita.total?.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>ESTUDIOS: {cita.estudios?.length || 0}</div>
                </div>
              ))}
              {citasPendientes.length === 0 && <p style={{ textAlign: 'center', color: theme.textMuted }}>No hay registros por cobrar</p>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={crearFactura} disabled={!citaSeleccionada} style={{ flex: 1, padding: 14, borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: citaSeleccionada ? 'pointer' : 'not-allowed', opacity: citaSeleccionada ? 1 : 0.5 }}>COBRAR SERVICIOS</button>
              <button onClick={() => setShowModalNueva(false)} style={{ padding: 14, borderRadius: 8, background: theme.surfaceMuted, border: `1px solid ${theme.border}`, color: theme.text, fontWeight: 700, cursor: 'pointer' }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {showModalPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: theme.surface, borderRadius: 12, width: '100%', maxWidth: 420, padding: 32, boxShadow: 'var(--shadow-lg)', border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: theme.textStrong }}>Registrar Pago</h3>
            <p style={{ margin: '0 0 20px', color: theme.textMuted, fontSize: 14 }}>Factura #{showModalPago.numero || showModalPago.numero_factura}</p>

            <div style={{ background: theme.surfaceMuted, padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: theme.textMuted }}>Total factura</span>
                <span style={{ fontWeight: 700, color: theme.text }}>${(showModalPago.total || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#10b981' }}>Ya pagado</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>${(showModalPago.montoPagado || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
                <span style={{ fontWeight: 800, color: '#ef4444' }}>Pendiente</span>
                <span style={{ fontWeight: 800, color: '#ef4444' }}>${Math.max(0, (showModalPago.total || 0) - (showModalPago.montoPagado || 0)).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>Monto a pagar (RD$)</label>
              <input
                type="number"
                value={montoPago}
                onChange={e => setMontoPago(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `2px solid ${theme.border}`, fontSize: 16, fontWeight: 700, boxSizing: 'border-box', background: theme.surface, color: theme.textStrong }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>Método de pago</label>
              <select
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `2px solid ${theme.border}`, fontSize: 14, boxSizing: 'border-box', background: theme.surface, color: theme.text }}
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={registrarPago} style={{ flex: 1, padding: 14, borderRadius: 8, background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <FaMoneyBillWave />REGISTRAR PAGO
              </button>
              <button onClick={() => { setShowModalPago(null); setMontoPago(''); }} style={{ padding: 14, borderRadius: 8, background: theme.surfaceMuted, border: `1px solid ${theme.border}`, color: theme.text, fontWeight: 700, cursor: 'pointer' }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturas;
