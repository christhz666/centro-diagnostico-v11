import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaEye, FaPrint, FaSpinner, FaPlus, FaCheck, FaTimes, FaCalendarAlt, FaChartLine, FaWallet } from 'react-icons/fa';
import api from '../services/api';
import FacturaTermica from './FacturaTermica';

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

  useEffect(() => {
    fetchFacturas();
    fetchCitasPendientes();
    fetchTurnoActivo();

    const interval = setInterval(() => {
      fetchFacturas(true);
      fetchCitasPendientes(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [filtroEstado]);

  const fetchTurnoActivo = async () => {
    try {
      const response = await api.getTurnoActivo();
      if (response && (response.data || response)) setTurnoActivo(response.data || response);
      else setTurnoActivo(null);
    } catch (err) {
      console.error('Error cargando turno:', err);
      setTurnoActivo(null);
    }
  };

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
    if (!window.confirm('¿Está segura que desea CERRAR la caja de hoy?')) return;
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

  const fetchFacturas = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await api.getFacturas(params);
      setFacturas(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error(err);
      if (!isSilent) setFacturas([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchCitasPendientes = async (isSilent = false) => {
    try {
      const response = await api.getCitas({ pagado: false });
      const citas = Array.isArray(response) ? response : (response.data || []);
      setCitasPendientes(citas.filter(c => c.estado === 'completada' || c.estado === 'programada'));
    } catch (err) {
      console.error(err);
    }
  };

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
    if (!turnoActivo) { alert("Debe ABRIR EL TURNO DE CAJA antes de facturar."); return; }
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

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <FaSpinner className="spin" style={{ fontSize: 40, color: 'var(--color-primary)' }} />
      <p style={{ color: 'var(--text-muted)' }}>Sincronizando registros fiscales...</p>
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
    <div style={{ padding: '32px', maxWidth: 1600, margin: '0 auto' }}>
      {/* ── Encabezado Cristal ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--color-white)', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
              <FaFileInvoiceDollar size={20} />
            </div>
            Gestión de Caja
          </h1>
          <p style={{ margin: '12px 0 0', color: 'var(--text-muted)', fontSize: 16 }}>Control de ingresos y comprobantes fiscales en tiempo real</p>
        </div>
        <button
          onClick={() => setShowModalNueva(true)}
          style={{
            padding: '14px 28px', borderRadius: 10,
            background: 'var(--color-primary)', color: 'var(--color-dark)',
            border: 'none', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 20px rgba(0, 242, 255, 0.2)', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <FaPlus /> NUEVA FACTURACIÓN
        </button>
      </div>

      {/* ── Stat Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>

        {/* Caja State Tile */}
        <div className="glass-panel" style={{ padding: '32px', borderLeft: `4px solid ${turnoActivo ? '#10b981' : 'var(--color-danger)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>ESTADO DE TURNO</div>
            <button
              onClick={turnoActivo ? cerrarTurnoManual : abrirTurnoManual}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}
            >
              {turnoActivo ? 'FINALIZAR TURNO' : 'INICIAR TURNO'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 36, fontWeight: 800 }}>
              RD$ {calcularTotalHoy().toLocaleString()}
            </h2>
            <span style={{ fontSize: 13, color: turnoActivo ? '#10b981' : 'var(--color-danger)', fontWeight: 700 }}>
              {turnoActivo ? '• ACTIVO' : '• CERRADO'}
            </span>
          </div>
        </div>

        {/* Global Stats Tile */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20 }}>VOLUMEN MENSUAL</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 36, fontWeight: 800 }}>RD$ {facturas.reduce((sum, f) => sum + (f.total || 0), 0).toLocaleString()}</h2>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(124, 77, 255, 0.05)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaChartLine />
            </div>
          </div>
        </div>
      </div>

      {/* ── Historial de Crystal Table ── */}
      <div className="glass-panel" style={{ padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Historial de Transacciones</h2>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            style={{
              padding: '10px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              color: 'white', fontWeight: 600, fontSize: 13, outline: 'none'
            }}
          >
            <option value="" style={{ background: '#0a0b10' }}>Todos los registros</option>
            <option value="pagada" style={{ background: '#0a0b10' }}>Pagadas</option>
            <option value="anulada" style={{ background: '#0a0b10' }}>Anuladas</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', background: 'transparent' }}>
            <thead>
              <tr>
                {['ID FISCAL', 'FECHA', 'PACIENTE', 'TOTAL RD$', 'ESTADO', 'ACCIONES'].map(h => (
                  <th key={h} style={{ padding: '0 24px 12px', textAlign: h === 'TOTAL RD$' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', border: 'none' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: 16 }}>
                    No se encontraron transacciones registradas
                  </td>
                </tr>
              ) : (
                facturas.map(f => (
                  <tr key={f._id} style={{ background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s' }}>
                    <td style={{ padding: '20px 24px', color: 'var(--color-primary)', fontWeight: 800, fontFamily: 'monospace', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                      #{f.numero || f.numero_factura}
                    </td>
                    <td style={{ padding: '20px 24px', color: 'white', fontSize: 14 }}>
                      {new Date(f.fecha_factura || f.createdAt).toLocaleDateString('es-DO')}
                    </td>
                    <td style={{ padding: '20px 24px', color: 'white', fontWeight: 700, fontSize: 14 }}>
                      {f.datosCliente?.nombre || f.paciente?.nombre || 'Paciente'}
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 900, color: 'white', fontSize: 16 }}>
                      ${(f.total || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                        background: f.estado === 'pagada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: f.estado === 'pagada' ? '#10b981' : '#ef4444',
                        border: `1px solid ${f.estado === 'pagada' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                      }}>
                        {f.estado}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => verDetalle(f)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaEye size={14} />
                        </button>
                        <button onClick={() => imprimirFactura(f)} style={{ background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.1)', color: 'var(--color-primary)', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaPrint size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Detalle Cristal ── */}
      {facturaDetalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7, 8, 12, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: 24 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>DETALLE FISCAL <span style={{ color: 'var(--color-primary)', marginLeft: 8 }}>#{facturaDetalle.numero || facturaDetalle.numero_factura}</span></h2>
              <button onClick={() => setFacturaDetalle(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FaTimes /></button>
            </div>
            <div style={{ padding: '32px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                <div><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>PACIENTE</div><div style={{ color: 'white', fontWeight: 700, marginTop: 4 }}>{facturaDetalle.datosCliente?.nombre || facturaDetalle.paciente?.nombre}</div></div>
                <div><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>FECHA</div><div style={{ color: 'white', fontWeight: 700, marginTop: 4 }}>{new Date(facturaDetalle.fecha_factura || facturaDetalle.createdAt).toLocaleDateString('es-DO')}</div></div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ color: 'var(--text-muted)' }}>Subtotal Bruto</span><span style={{ color: 'white' }}>${(facturaDetalle.subtotal || 0).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><span style={{ color: 'var(--color-danger)' }}>Cobertura</span><span style={{ color: 'var(--color-danger)' }}>-${(facturaDetalle.cobertura || 0).toLocaleString()}</span></div>
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: 800, color: 'white', fontSize: 18 }}>TOTAL NETO</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-primary)' }}>${(facturaDetalle.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: 12 }}>
              <button onClick={() => { setFacturaDetalle(null); imprimirFactura(facturaDetalle); }} style={{ flex: 1, padding: 14, borderRadius: 8, background: 'var(--color-primary)', border: 'none', color: 'var(--color-dark)', fontWeight: 800, cursor: 'pointer' }}>REIMPRIMIR TICKET</button>
              <button onClick={() => setFacturaDetalle(null)} style={{ flex: 1, padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nueva Factura Precision ── */}
      {showModalNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7, 8, 12, 0.95)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: 24 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 550, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>FACTURACIÓN PENDIENTE</h2>
              <button onClick={() => setShowModalNueva(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FaTimes /></button>
            </div>
            <div style={{ padding: '32px', overflowY: 'auto' }}>
              {citasPendientes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No hay citas para facturar hoy</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {citasPendientes.map(cita => (
                    <div key={cita._id} onClick={() => setCitaSeleccionada(cita)} style={{
                      padding: 20, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                      background: citaSeleccionada?._id === cita._id ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255,255,255,0.01)',
                      border: `1px solid ${citaSeleccionada?._id === cita._id ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ color: 'white', fontSize: 14 }}>{cita.paciente?.nombre} {cita.paciente?.apellido}</strong>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>${cita.total?.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SERVICIOS: {cita.estudios?.length || 0}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: 12 }}>
              <button onClick={crearFactura} disabled={!citaSeleccionada} style={{ flex: 1, padding: 16, borderRadius: 8, background: 'var(--color-primary)', border: 'none', color: 'var(--color-dark)', fontWeight: 800, cursor: citaSeleccionada ? 'pointer' : 'not-allowed', opacity: citaSeleccionada ? 1 : 0.5 }}>COBRAR & EMITIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturas;
