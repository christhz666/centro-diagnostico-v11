import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaSearch, FaPlus, FaTrash, FaSpinner, FaCheck, FaPrint, FaArrowRight, FaArrowLeft, FaIdCard, FaStethoscope, FaWallet, FaShieldAlt, FaTimes } from 'react-icons/fa';
import api from '../services/api';
import FacturaTermica from './FacturaTermica';

const RegistroInteligente = () => {
  const [paso, setPaso] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [estudios, setEstudios] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [facturaGenerada, setFacturaGenerada] = useState(null);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [montoPagado, setMontoPagado] = useState(0);
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [autorizacion, setAutorizacion] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [nuevoPaciente, setNuevoPaciente] = useState({
    nombre: '', apellido: '', cedula: '', esMenor: false,
    telefono: '', email: '', fechaNacimiento: '', sexo: 'M',
    nacionalidad: 'Dominicano', tipoSangre: '', seguroNombre: '', seguroNumeroAfiliado: ''
  });

  useEffect(() => { fetchEstudios(); }, []);

  const fetchEstudios = async () => {
    try {
      const response = await api.getEstudios();
      setEstudios(Array.isArray(response) ? response : []);
    } catch (err) { setEstudios([]); }
  };

  const buscarPaciente = async () => {
    if (!busqueda.trim()) return;
    try {
      setLoading(true);
      const response = await api.getPacientes({ search: busqueda });
      setPacientes(Array.isArray(response) ? response : []);
    } catch (err) { setPacientes([]); } finally { setLoading(false); }
  };

  const seleccionarPacienteExistente = (paciente) => {
    setPacienteSeleccionado(paciente);
    setPaso(2);
  };

  const crearPaciente = async () => {
    if (!nuevoPaciente.nombre || !nuevoPaciente.apellido || (!nuevoPaciente.esMenor && !nuevoPaciente.cedula) || !nuevoPaciente.telefono || !nuevoPaciente.fechaNacimiento) {
      alert('Complete los campos obligatorios (*)');
      return;
    }
    try {
      setLoading(true);
      const pacienteData = {
        nombre: nuevoPaciente.nombre,
        apellido: nuevoPaciente.apellido,
        cedula: nuevoPaciente.cedula,
        esMenor: nuevoPaciente.esMenor,
        telefono: nuevoPaciente.telefono,
        email: nuevoPaciente.email,
        fechaNacimiento: nuevoPaciente.fechaNacimiento,
        sexo: nuevoPaciente.sexo,
        nacionalidad: nuevoPaciente.nacionalidad,
        tipoSangre: nuevoPaciente.tipoSangre,
        seguro: {
          nombre: nuevoPaciente.seguroNombre || '',
          numeroAfiliado: nuevoPaciente.seguroNumeroAfiliado || '',
          tipo: nuevoPaciente.seguroNombre ? 'ARS' : ''
        }
      };
      const response = await api.createPaciente(pacienteData);
      setPacienteSeleccionado(response.data || response);
      setPaso(2);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.mensaje || err.message));
    } finally { setLoading(false); }
  };

  const agregarEstudio = (estudio) => {
    if (!estudiosSeleccionados.find(e => (e._id || e.id) === (estudio._id || estudio.id))) {
      setEstudiosSeleccionados([...estudiosSeleccionados, { ...estudio, cantidad: 1, cobertura: 0 }]);
    }
  };

  const quitarEstudio = (id) => {
    setEstudiosSeleccionados(estudiosSeleccionados.filter(e => (e._id || e.id) !== id));
  };

  const actualizarCobertura = (id, cobertura) => {
    setEstudiosSeleccionados(estudiosSeleccionados.map(e =>
      (e._id || e.id) === id ? { ...e, cobertura: parseFloat(cobertura) || 0 } : e
    ));
  };

  const calcularSubtotal = () => estudiosSeleccionados.reduce((sum, e) => sum + ((e.precio || 0) * (e.cantidad || 1)), 0);
  const calcularCobertura = () => estudiosSeleccionados.reduce((sum, e) => sum + (e.cobertura || 0), 0);
  const calcularTotal = () => Math.max(0, calcularSubtotal() - calcularCobertura() - descuento);
  const calcularCambio = () => montoPagado - calcularTotal();

  const finalizarRegistro = async () => {
    if (estudiosSeleccionados.length === 0) { alert('Agregue al menos un estudio'); return; }
    try {
      setLoading(true);
      const ahora = new Date();
      const citaData = {
        paciente: pacienteSeleccionado._id || pacienteSeleccionado.id,
        fecha: ahora.toISOString().split('T')[0],
        horaInicio: ahora.toTimeString().split(' ')[0].substring(0, 5),
        estudios: estudiosSeleccionados.map(e => ({ estudio: e._id || e.id, precio: e.precio || 0, descuento: e.cobertura || 0 })),
        subtotal: calcularSubtotal(),
        descuentoTotal: calcularCobertura() + descuento,
        total: calcularTotal(),
        metodoPago: metodoPago,
        pagado: montoPagado >= calcularTotal(),
        estado: 'completada'
      };
      const citaRes = await api.createCita(citaData);
      const cita = citaRes.orden || citaRes.data || citaRes;

      const facturaData = {
        paciente: pacienteSeleccionado._id || pacienteSeleccionado.id,
        cita: cita._id || cita.id,
        items: estudiosSeleccionados.map(e => ({ descripcion: e.nombre, estudio: e._id || e.id, cantidad: 1, precioUnitario: e.precio || 0, descuento: e.cobertura || 0, subtotal: (e.precio || 0) - (e.cobertura || 0) })),
        subtotal: calcularSubtotal(),
        descuento: descuento, total: calcularTotal(),
        montoPagado: montoPagado, metodoPago,
        estado: montoPagado >= calcularTotal() ? 'pagada' : 'emitida',
        datosCliente: { nombre: `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`, cedula: pacienteSeleccionado.cedula || '', telefono: pacienteSeleccionado.telefono || '' }
      };
      const factRes = await api.createFactura(facturaData);
      setFacturaGenerada({ ...factRes.data || factRes, montoPagado, autorizacion });
      setMostrarFactura(true);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.mensaje || err.message));
    } finally { setLoading(false); }
  };

  const reiniciar = () => {
    setPaso(1); setBusqueda(''); setPacientes([]); setPacienteSeleccionado(null); setEstudiosSeleccionados([]);
    setFacturaGenerada(null); setMostrarFactura(false); setDescuento(0); setMontoPagado(0); setAutorizacion('');
    setNuevoPaciente({ nombre: '', apellido: '', cedula: '', telefono: '', email: '', fechaNacimiento: '', sexo: 'M', nacionalidad: 'Dominicano', tipoSangre: '', seguroNombre: '', seguroNumeroAfiliado: '' });
  };

  const getTexto = (valor) => {
    if (!valor) return '';
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'object') return valor.nombre || valor.tipo || '';
    return String(valor);
  };

  if (mostrarFactura && facturaGenerada) return (
    <FacturaTermica factura={facturaGenerada} paciente={pacienteSeleccionado} estudios={estudiosSeleccionados} onClose={reiniciar} />
  );

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        .wizard-step { animation: slideIn 0.4s ease-out; }
        .premium-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; color: white; width: 100%; outline: none; transition: all 0.2s; }
        .premium-input:focus { border-color: var(--color-primary); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .premium-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
      `}</style>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--color-white)', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <FaUserPlus />
          </div>
          Registro Inteligente
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 15 }}>Flujo optimizado para registro de pacientes y facturación express</p>
      </div>

      {/* ── Stepper ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 40, overflowX: 'auto', paddingBottom: 10 }}>
        {[
          { step: 1, label: 'Identificación', icon: <FaIdCard /> },
          { step: 2, label: 'Estudios Médicos', icon: <FaStethoscope /> },
          { step: 3, label: 'Liquidación', icon: <FaWallet /> }
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 200, padding: '16px 20px', borderRadius: 16,
            background: paso === s.step ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${paso === s.step ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', gap: 15, transition: 'all 0.3s'
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: paso >= s.step ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14
            }}>
              {paso > s.step ? <FaCheck /> : s.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase' }}>Paso 0{s.step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: paso >= s.step ? 'white' : 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PASO 1: PACIENTE ── */}
      {paso === 1 && (
        <div className="wizard-step" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 32 }}>
          {/* Buscar */}
          <div className="glass-panel" style={{ padding: 32 }}>
            <h3 style={{ margin: '0 0 24px', color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaSearch style={{ color: 'var(--color-sky)', fontSize: 18 }} /> Paciente Existente
            </h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <input className="premium-input" placeholder="Nombre, apellido o cédula..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyPress={e => e.key === 'Enter' && buscarPaciente()} />
              <button onClick={buscarPaciente} style={{ padding: '0 24px', background: 'var(--color-primary)', border: 'none', borderRadius: 12, color: 'white', cursor: 'pointer' }}>
                {loading ? <FaSpinner className="spin" /> : <FaSearch />}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
              {pacientes.map(p => (
                <div key={p._id || p.id} onClick={() => seleccionarPacienteExistente(p)} style={{
                  padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer'
                }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'white' }}>{p.nombre} {p.apellido}</strong>
                    <FaArrowRight style={{ color: 'var(--color-primary)', fontSize: 14 }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>ID: {p.cedula} · Tel: {p.telefono}</div>
                  {p.seguro?.nombre && <div style={{ fontSize: 11, color: 'var(--color-sky)', marginTop: 4 }}>Seguro: {p.seguro.nombre}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Nuevo */}
          <div className="glass-panel" style={{ padding: 32 }}>
            <h3 style={{ margin: '0 0 24px', color: 'white' }}>Nuevo Paciente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div><label className="premium-label">Nombre *</label><input className="premium-input" value={nuevoPaciente.nombre} onChange={e => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })} /></div>
              <div><label className="premium-label">Apellido *</label><input className="premium-input" value={nuevoPaciente.apellido} onChange={e => setNuevoPaciente({ ...nuevoPaciente, apellido: e.target.value })} /></div>
              <div><label className="premium-label">Cédula *</label><input className="premium-input" placeholder="000-0000000-0" value={nuevoPaciente.cedula} onChange={e => setNuevoPaciente({ ...nuevoPaciente, cedula: e.target.value })} /></div>
              <div><label className="premium-label">Teléfono *</label><input className="premium-input" placeholder="809-000-0000" value={nuevoPaciente.telefono} onChange={e => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })} /></div>
              <div><label className="premium-label">Fecha Nac. *</label><input type="date" className="premium-input" value={nuevoPaciente.fechaNacimiento} onChange={e => setNuevoPaciente({ ...nuevoPaciente, fechaNacimiento: e.target.value })} /></div>
              <div><label className="premium-label">Sexo</label><select className="premium-input" value={nuevoPaciente.sexo} onChange={e => setNuevoPaciente({ ...nuevoPaciente, sexo: e.target.value })}><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
            </div>
            <div style={{ marginTop: 24, padding: 20, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 16, border: '1px dashed rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15, color: 'var(--color-sky)' }}><FaShieldAlt /> <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Cobertura Médica</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div><label className="premium-label">ARS / Seguro</label><select className="premium-input" value={nuevoPaciente.seguroNombre} onChange={e => setNuevoPaciente({ ...nuevoPaciente, seguroNombre: e.target.value })}><option value="">Sin seguro</option><option value="SENASA">SENASA</option><option value="ARS Humano">ARS Humano</option><option value="ARS Palic">ARS Palic</option><option value="Otro">Otro</option></select></div>
                <div><label className="premium-label">No. Afiliado</label><input className="premium-input" value={nuevoPaciente.seguroNumeroAfiliado} onChange={e => setNuevoPaciente({ ...nuevoPaciente, seguroNumeroAfiliado: e.target.value })} /></div>
              </div>
            </div>
            <button onClick={crearPaciente} style={{ width: '100%', marginTop: 32, padding: 16, background: 'var(--color-primary)', border: 'none', borderRadius: 14, color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--color-primary-glow)' }}>Crear y Continuar <FaArrowRight style={{ marginLeft: 8 }} /></button>
          </div>
        </div>
      )}

      {/* ── PASO 2: ESTUDIOS ── */}
      {paso === 2 && (
        <div className="wizard-step" style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 450px', gap: 32 }}>
          <div className="glass-panel" style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, color: 'white' }}>Catálogo de Estudios</h3>
              <div style={{ position: 'relative', width: 250 }}>
                <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="premium-input" placeholder="Filtrar..." value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ paddingLeft: 36, fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, maxHeight: 600, overflowY: 'auto', paddingRight: 10 }}>
              {estudios.filter(e => {
                const q = filtroCategoria.toLowerCase();
                return getTexto(e.nombre).toLowerCase().includes(q) || (e.codigo || '').toLowerCase().includes(q);
              }).map(e => (
                <div key={e._id || e.id} onClick={() => agregarEstudio(e)} style={{
                  padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }} onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,0.08)'; ev.currentTarget.style.borderColor = 'var(--color-primary)'; }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{getTexto(e.nombre)}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{e.codigo}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--color-sky)', fontWeight: 800 }}>${(e.precio || 0).toLocaleString()}</div>
                    <FaPlus style={{ fontSize: 10, color: 'var(--color-primary)', marginTop: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
            <div className="glass-panel" style={{ padding: 32 }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paciente</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginTop: 4 }}>{pacienteSeleccionado?.nombre} {pacienteSeleccionado?.apellido}</div>
                {pacienteSeleccionado?.seguro?.nombre && <div style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 4 }}>{pacienteSeleccionado.seguro.nombre} · {pacienteSeleccionado.seguro.numeroAfiliado}</div>}
              </div>
              <h4 style={{ color: 'white', margin: '0 0 16px' }}>Estudios Seleccionados ({estudiosSeleccionados.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {estudiosSeleccionados.map(e => (
                  <div key={e._id || e.id} style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ color: 'white', fontSize: 13, fontWeight: 600, flex: 1 }}>{getTexto(e.nombre)}</div>
                      <button onClick={() => quitarEstudio(e._id || e.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FaTrash /></button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <div style={{ color: 'var(--color-sky)', fontSize: 12, fontWeight: 700 }}>${e.precio}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>COBERTURA</span>
                        <input className="premium-input" type="number" value={e.cobertura} onChange={ev => actualizarCobertura(e._id || e.id, ev.target.value)} style={{ width: 80, padding: '4px 8px', fontSize: 12, textAlign: 'right' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span style={{ color: 'white' }}>${calcularSubtotal().toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><span style={{ color: '#ef4444' }}>Seguro</span><span style={{ color: '#ef4444' }}>-${calcularCobertura().toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}><span style={{ color: 'white', fontWeight: 800 }}>Total Neto</span><span style={{ color: 'var(--color-primary)', fontSize: 28, fontWeight: 900 }}>${calcularTotal().toLocaleString()}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button onClick={() => setPaso(1)} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}><FaArrowLeft /></button>
                <button onClick={() => setPaso(3)} disabled={estudiosSeleccionados.length === 0} style={{ flex: 3, padding: 14, borderRadius: 12, background: 'var(--color-primary)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: estudiosSeleccionados.length === 0 ? 0.5 : 1 }}>Pagar Ahora <FaArrowRight style={{ marginLeft: 8 }} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 3: PAGO ── */}
      {paso === 3 && (
        <div className="wizard-step" style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: 40 }}>
            <h3 style={{ margin: '0 0 32px', color: 'white', textAlign: 'center' }}>Finalizar Transacción</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }}>
              <div>
                <div style={{ marginBottom: 24 }}><label className="premium-label">Método de Pago</label><select className="premium-input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta de Crédito / Débito</option><option value="transferencia">Transferencia Bancaria</option></select></div>
                <div style={{ marginBottom: 24 }}><label className="premium-label">Descuento Especial</label><input type="number" className="premium-input" value={descuento} onChange={e => setDescuento(parseFloat(e.target.value) || 0)} /></div>
                <div style={{ marginBottom: 24 }}><label className="premium-label">Monto Recibido</label><input type="number" className="premium-input" value={montoPagado} onChange={e => setMontoPagado(parseFloat(e.target.value) || 0)} style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }} /></div>
                {montoPagado > 0 && (
                  <div style={{
                    padding: 24, borderRadius: 20, textAlign: 'center',
                    background: calcularCambio() >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${calcularCambio() >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{calcularCambio() >= 0 ? 'Cambio a Devolver' : 'Monto Faltante'}</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: calcularCambio() >= 0 ? '#22c55e' : '#ef4444' }}>RD$ {Math.abs(calcularCambio()).toLocaleString()}</div>
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 32, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 20px', color: 'white', fontSize: 14, textTransform: 'uppercase' }}>Resumen</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Total Estudios</span><span style={{ color: 'white' }}>${calcularSubtotal().toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Seguro Médico</span><span style={{ color: '#ef4444' }}>-${calcularCobertura().toLocaleString()}</span></div>
                  {descuento > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Descuento</span><span style={{ color: '#ef4444' }}>-${descuento.toLocaleString()}</span></div>}
                  <div style={{ margin: '15px 0', borderTop: '1px dashed rgba(255,255,255,0.1)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}><span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>Total Neto</span><span style={{ color: 'var(--color-primary)', fontSize: 32, fontWeight: 900 }}>${calcularTotal().toLocaleString()}</span></div>
                </div>
                <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button onClick={finalizarRegistro} disabled={loading} style={{ width: '100%', padding: '18px', background: 'var(--color-primary)', border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {loading ? <FaSpinner className="spin" /> : <><FaPrint /> Emitir Factura</>}
                  </button>
                  <button onClick={() => setPaso(2)} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: 16, cursor: 'pointer' }}>Revisar Estudios</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroInteligente;
