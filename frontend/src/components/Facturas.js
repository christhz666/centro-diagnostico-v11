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

      const facturaConPago = {
        ...facturaCompleta,
        montoPagado: facturaCompleta.montoPagado || facturaCompleta.total_pagado || facturaCompleta.monto_pagado || 0,
        numero: facturaCompleta.numero || facturaCompleta.numero_factura,
        autorizacion: facturaCompleta.ncf || '',
      };
      setFacturaImprimir({
        factura: facturaConPago,
        paciente: pacienteData,
        estudios: estudios
      });
    } catch (err) {
      console.error('Error al cargar factura:', err);
    }
  };

  const crearFactura = async () => {
    if (!turnoActivo) {
      alert("Debe ABRIR EL TURNO DE CAJA antes de facturar.");
      return;
    }
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
        items,
        subtotal,
        cobertura,
        total,
        montoPagado: total,
        metodoPago: 'efectivo',
        estado: 'pagada'
      });

      setShowModalNueva(false);
      setCitaSeleccionada(null);
      fetchFacturas();
      fetchCitasPendientes();
    } catch (err) {
      alert('Error: ' + err.message);
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

  const calcularTotalMes = () => {
    const ahora = new Date();
    return facturas
      .filter(f => {
        const fecha = new Date(f.fecha_factura || f.createdAt);
        return fecha.getMonth() === ahora.getMonth() &&
          fecha.getFullYear() === ahora.getFullYear() &&
          f.estado !== 'anulada';
      })
      .reduce((sum, f) => sum + (f.total || 0), 0);
  };

  const getTexto = (valor) => {
    if (!valor) return 'N/A';
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'number') return valor.toString();
    if (typeof valor === 'object') {
      return valor.nombre || valor.tipo || valor.descripcion || 'N/A';
    }
    return String(valor);
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <FaSpinner className="spin" style={{ fontSize: 40, color: 'var(--color-primary)' }} />
      <p style={{ color: 'var(--text-muted)' }}>Cargando registros fiscales...</p>
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
      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--color-white)', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: 15 }}>
            <FaFileInvoiceDollar style={{ color: 'var(--color-primary)' }} />
            Facturación & Caja
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
            Gestión fiscal y control de turnos en tiempo real
          </p>
        </div>
        <button
          onClick={() => setShowModalNueva(true)}
          style={{
            padding: '12px 24px', borderRadius: 14,
            background: 'var(--color-primary)', color: 'white',
            border: 'none', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: 'var(--color-primary-glow)', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <FaPlus /> Nueva Factura
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>

        {/* Caja Card */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: turnoActivo ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: turnoActivo ? '#22c55e' : '#ef4444' }}>
              <FaWallet />
            </div>
            <button
              onClick={turnoActivo ? cerrarTurnoManual : abrirTurnoManual}
              style={{
                padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {turnoActivo ? 'Cerrar Turno' : 'Abrir Turno'}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {turnoActivo ? `Caja Abierta (${new Date(turnoActivo.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : 'Caja Cerrada'}
          </p>
          <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--color-white)' }}>
            {turnoActivo ? `RD$ ${calcularTotalHoy().toLocaleString()}` : '--'}
          </h2>
        </div>

        {/* Mensual Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', marginBottom: 15 }}>
            <FaChartLine />
          </div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Facturado este Mes</p>
          <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--color-white)' }}>
            RD$ {calcularTotalMes().toLocaleString()}
          </h2>
        </div>

        {/* Histórico Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: 15 }}>
            <FaCalendarAlt />
          </div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Comprobantes</p>
          <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--color-white)' }}>
            {facturas.length} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>docs</span>
          </h2>
        </div>
      </div>

      {/* ── Table Section ── */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--color-white)' }}>Historial de Facturación</h2>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            style={{
              padding: '10px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
              color: 'white', fontWeight: 600, fontSize: 13, outline: 'none'
            }}
          >
            <option value="" style={{ background: '#1a1a1a' }}>Todos los estados</option>
            <option value="emitida" style={{ background: '#1a1a1a' }}>Emitidas</option>
            <option value="pagada" style={{ background: '#1a1a1a' }}>Pagadas</option>
            <option value="anulada" style={{ background: '#1a1a1a' }}>Anuladas</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                {['Comprobante', 'Fecha', 'Paciente', 'Total RD$', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0 20px 12px', textAlign: h === 'Total RD$' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay facturas registradas en este periodo
                  </td>
                </tr>
              ) : (
                facturas.map(f => (
                  <tr key={f._id || f.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
                    <td style={{ padding: '20px', color: 'var(--color-sky)', fontWeight: 700, fontFamily: 'monospace', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}>
                      {f.numero || f.numero_factura}
                    </td>
                    <td style={{ padding: '20px', color: 'var(--color-white)' }}>
                      {new Date(f.fecha_factura || f.createdAt).toLocaleDateString('es-DO')}
                    </td>
                    <td style={{ padding: '20px', color: 'var(--color-white)', fontWeight: 600 }}>
                      {getTexto(f.datosCliente?.nombre || f.paciente?.nombre || f.paciente?.nombre_completo)}
                    </td>
                    <td style={{ padding: '20px', textAlign: 'right', fontWeight: 800, color: 'var(--color-white)' }}>
                      ${(f.total || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span style={{
                        padding: '6px 14px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        background: f.estado === 'pagada' ? 'rgba(34,197,94,0.1)' : f.estado === 'emitida' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: f.estado === 'pagada' ? '#22c55e' : f.estado === 'emitida' ? '#f59e0b' : '#ef4444',
                        border: `1px solid ${f.estado === 'pagada' ? '#22c55e33' : f.estado === 'emitida' ? '#f59e0b33' : '#ef444433'}`
                      }}>
                        {f.estado}
                      </span>
                    </td>
                    <td style={{ padding: '20px', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => verDetalle(f)} style={{ background: 'rgba(59,130,246,0.1)', border: 'none', color: '#3b82f6', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Detalles">
                          <FaEye />
                        </button>
                        <button onClick={() => imprimirFactura(f)} style={{ background: 'rgba(34,197,94,0.1)', border: 'none', color: '#22c55e', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Imprimir">
                          <FaPrint />
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

      {/* ── Modal Detalle ── */}
      {facturaDetalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: 20 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 650, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white' }}>
                Detalle de Factura <span style={{ color: 'var(--color-sky)', fontSize: 16, marginLeft: 8 }}>{facturaDetalle.numero || facturaDetalle.numero_factura}</span>
              </h2>
              <button onClick={() => setFacturaDetalle(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paciente</p>
                  <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>{getTexto(facturaDetalle.datosCliente?.nombre || facturaDetalle.paciente?.nombre)}</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>{getTexto(facturaDetalle.datosCliente?.cedula || facturaDetalle.paciente?.cedula)}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emisión</p>
                  <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>{new Date(facturaDetalle.fecha_factura || facturaDetalle.createdAt).toLocaleDateString('es-DO')}</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Sede Central</p>
                </div>
              </div>

              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>Estudios Realizados</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '12px 0', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12 }}>Descripción</th>
                    <th style={{ padding: '12px 0', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(facturaDetalle.items || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px 0', color: 'white', fontSize: 14 }}>{getTexto(item.descripcion || item.nombre)}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', color: 'white', fontWeight: 600 }}>RD$ {(item.precioUnitario || item.precio || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Subtotal Bruto</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>RD$ {(facturaDetalle.subtotal || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ color: '#ef4444', fontSize: 14 }}>Cobertura Seguro</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>- RD$ {(facturaDetalle.cobertura || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Total Neto</span>
                  <span style={{ color: 'var(--color-primary)', fontSize: 22, fontWeight: 900 }}>RD$ {(facturaDetalle.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: 16 }}>
              <button
                onClick={() => { setFacturaDetalle(null); imprimirFactura(facturaDetalle); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--color-primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <FaPrint /> Imprimir Comprobante
              </button>
              <button onClick={() => setFacturaDetalle(null)} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nueva Factura ── */}
      {showModalNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: 20 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Nueva Facturación</h2>
              <button onClick={() => setShowModalNueva(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 14 }}>Seleccione una cita del listado para generar el comprobante:</p>

              {citasPendientes.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <FaCalendarAlt style={{ fontSize: 40, color: 'var(--text-muted)', opacity: 0.3, marginBottom: 16 }} />
                  <p style={{ color: 'var(--text-muted)' }}>No hay citas pendientes de facturación hoy</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {citasPendientes.map(cita => (
                    <div
                      key={cita._id}
                      onClick={() => setCitaSeleccionada(cita)}
                      style={{
                        padding: '18px', borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s',
                        background: citaSeleccionada?._id === cita._id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${citaSeleccionada?._id === cita._id ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong style={{ color: 'white' }}>{getTexto(cita.paciente?.nombre)} {getTexto(cita.paciente?.apellido)}</strong>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>RD$ {(cita.total || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {cita.estudios?.map(e => getTexto(e.estudio?.nombre || 'Estudio')).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: 16 }}>
              <button
                onClick={crearFactura}
                disabled={!citaSeleccionada}
                style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--color-primary)', color: 'white', fontWeight: 700, border: 'none', cursor: citaSeleccionada ? 'pointer' : 'not-allowed', opacity: citaSeleccionada ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <FaCheck /> Confirmar Pago
              </button>
              <button onClick={() => { setShowModalNueva(false); setCitaSeleccionada(null); }} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturas;
