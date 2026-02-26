import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaSearch, FaPlus, FaTrash, FaSpinner, FaCheck, FaPrint, FaArrowRight, FaArrowLeft, FaIdCard, FaStethoscope, FaWallet, FaShieldAlt } from 'react-icons/fa';
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
      setFacturaGenerada({ ...factRes.data || factRes, montoPagado });
      setMostrarFactura(true);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.mensaje || err.message));
    } finally { setLoading(false); }
  };

  const reiniciar = () => {
    setPaso(1); setBusqueda(''); setPacientes([]); setPacienteSeleccionado(null); setEstudiosSeleccionados([]);
    setFacturaGenerada(null); setMostrarFactura(false); setDescuento(0); setMontoPagado(0);
    setNuevoPaciente({ nombre: '', apellido: '', cedula: '', telefono: '', email: '', fechaNacimiento: '', sexo: 'M', nacionalidad: 'Dominicano', tipoSangre: '', seguroNombre: '', seguroNumeroAfiliado: '' });
  };

  if (mostrarFactura && facturaGenerada) return (
    <FacturaTermica factura={facturaGenerada} paciente={pacienteSeleccionado} estudios={estudiosSeleccionados} onClose={reiniciar} />
  );

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        .crystal-step { transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
        .crystal-input { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 12px 16px; color: white; width: 100%; outline: none; transition: all 0.2s; }
        .crystal-input:focus { border-color: var(--color-primary); background: rgba(255,255,255,0.05); box-shadow: 0 0 0 4px rgba(0, 242, 255, 0.05); }
        .crystal-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block; }
      `}</style>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--color-white)', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <FaUserPlus size={20} />
          </div>
          Registro Inteligente
        </h1>
        <p style={{ margin: '12px 0 0', color: 'var(--text-muted)', fontSize: 16 }}>Flujo clínico optimizado para admisión y liquidación inmediata</p>
      </div>

      {/* ── Stepper Precision ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
        {[
          { step: 1, label: 'Identificación', icon: <FaIdCard /> },
          { step: 2, label: 'Estudios Médicos', icon: <FaStethoscope /> },
          { step: 3, label: 'Liquidación', icon: <FaWallet /> }
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '20px 24px', borderRadius: 12,
            background: paso === s.step ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255,255,255,0.01)',
            border: `1px solid ${paso === s.step ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)'}`,
            display: 'flex', alignItems: 'center', gap: 16, position: 'relative'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: paso >= s.step ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: paso >= s.step ? 'var(--color-dark)' : 'var(--text-muted)', fontSize: 14, fontWeight: 800
            }}>
              {paso > s.step ? <FaCheck /> : s.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>Fase 0{s.step}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: paso >= s.step ? 'white' : 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PASO 1: PACIENTE ── */}
      {paso === 1 && (
        <div className="crystal-step" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 32 }}>
          <div className="glass-panel" style={{ padding: 40 }}>
            <h3 style={{ margin: '0 0 32px', color: 'white', display: 'flex', alignItems: 'center', gap: 12, fontSize: 20 }}>
              <FaSearch style={{ color: 'var(--color-primary)', fontSize: 18 }} /> Búsqueda Rápida
            </h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
              <input className="crystal-input" placeholder="Nombre o Cédula..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyPress={e => e.key === 'Enter' && buscarPaciente()} />
              <button onClick={buscarPaciente} style={{ width: 56, background: 'var(--color-primary)', border: 'none', borderRadius: 10, color: 'var(--color-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? <FaSpinner className="spin" /> : <FaSearch />}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {pacientes.map(p => (
                <div key={p._id || p.id} onClick={() => seleccionarPacienteExistente(p)} style={{
                  padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s'
                }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'white' }}>{p.nombre} {p.apellido}</strong>
                    <FaArrowRight style={{ color: 'var(--color-primary)', fontSize: 13 }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{p.cedula} · {p.telefono}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 40 }}>
            <h3 style={{ margin: '0 0 32px', color: 'white', fontSize: 20 }}>Nuevo Registro</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div><label className="crystal-label">Nombre *</label><input className="crystal-input" value={nuevoPaciente.nombre} onChange={e => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })} /></div>
              <div><label className="crystal-label">Apellido *</label><input className="crystal-input" value={nuevoPaciente.apellido} onChange={e => setNuevoPaciente({ ...nuevoPaciente, apellido: e.target.value })} /></div>
              <div><label className="crystal-label">Cédula *</label><input className="crystal-input" placeholder="000-0000000-0" value={nuevoPaciente.cedula} onChange={e => setNuevoPaciente({ ...nuevoPaciente, cedula: e.target.value })} /></div>
              <div><label className="crystal-label">Teléfono *</label><input className="crystal-input" placeholder="809-000-0000" value={nuevoPaciente.telefono} onChange={e => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })} /></div>
              <div><label className="crystal-label">Nacimiento</label><input type="date" className="crystal-input" value={nuevoPaciente.fechaNacimiento} onChange={e => setNuevoPaciente({ ...nuevoPaciente, fechaNacimiento: e.target.value })} /></div>
              <div><label className="crystal-label">Sexo</label><select className="crystal-input" value={nuevoPaciente.sexo} onChange={e => setNuevoPaciente({ ...nuevoPaciente, sexo: e.target.value })}><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
            </div>
            <button onClick={crearPaciente} style={{ width: '100%', marginTop: 32, padding: 18, background: 'var(--color-primary)', border: 'none', borderRadius: 12, color: 'var(--color-dark)', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,242,255,0.2)' }}>Proceder al Paso 2 <FaArrowRight style={{ marginLeft: 10 }} /></button>
          </div>
        </div>
      )}

      {/* ── PASO 2: ESTUDIOS ── */}
      {paso === 2 && (
        <div className="crystal-step" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32 }}>
          <div className="glass-panel" style={{ padding: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: 20 }}>Selección de Servicios</h3>
              <input className="crystal-input" placeholder="Filtrar por código o nombre..." value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ width: 300 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, maxHeight: 600, overflowY: 'auto' }}>
              {estudios.filter(e => (e.nombre || '').toLowerCase().includes(filtroCategoria.toLowerCase())).map(e => (
                <div key={e._id || e.id} onClick={() => agregarEstudio(e)} style={{
                  padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }} onMouseEnter={ev => { ev.currentTarget.style.borderColor = 'var(--color-primary)'; }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{e.nombre}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Ref: {e.codigo || 'N/A'}</div>
                  </div>
                  <div style={{ color: 'var(--color-primary)', fontWeight: 800 }}>${(e.precio || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 32, height: 'fit-content', position: 'sticky', top: 20 }}>
            <h4 style={{ color: 'white', margin: '0 0 24px', fontSize: 16 }}>Orden de Servicio</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {estudiosSeleccionados.map(e => (
                <div key={e._id || e.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 10, borderLeft: '3px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{e.nombre}</span>
                    <button onClick={() => quitarEstudio(e._id || e.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><FaTrash size={12} /></button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>RD$ {e.precio}</span>
                    <input className="crystal-input" type="number" placeholder="Cobertura" value={e.cobertura} onChange={ev => actualizarCobertura(e._id || e.id, ev.target.value)} style={{ width: 80, padding: '4px 8px', fontSize: 12 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'baseline' }}>
                <span style={{ color: 'white', fontWeight: 800 }}>Total Estimado</span>
                <span style={{ color: 'var(--color-primary)', fontSize: 28, fontWeight: 900 }}>${calcularTotal().toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setPaso(1)} style={{ flex: 1, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}><FaArrowLeft /></button>
                <button onClick={() => setPaso(3)} disabled={estudiosSeleccionados.length === 0} style={{ flex: 2, padding: 14, borderRadius: 10, background: 'var(--color-primary)', border: 'none', color: 'var(--color-dark)', fontWeight: 800, cursor: 'pointer' }}>Liquidación <FaArrowRight /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 3: PAGO ── */}
      {paso === 3 && (
        <div className="crystal-step" style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: 48 }}>
            <h3 style={{ margin: '0 0 40px', color: 'white', textAlign: 'center', fontSize: 24 }}>Resumen de Cobro</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
              <div>
                <div style={{ marginBottom: 24 }}><label className="crystal-label">Forma de Pago</label><select className="crystal-input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta Bancaria</option></select></div>
                <div style={{ marginBottom: 24 }}><label className="crystal-label">Descuento Directo</label><input type="number" className="crystal-input" value={descuento} onChange={e => setDescuento(parseFloat(e.target.value) || 0)} /></div>
                <div style={{ marginBottom: 24 }}><label className="crystal-label">Monto a Recibir</label><input type="number" className="crystal-input" value={montoPagado} onChange={e => setMontoPagado(parseFloat(e.target.value) || 0)} style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-primary)' }} /></div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 32, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ color: 'var(--text-muted)' }}>Bruto</span><span style={{ color: 'white' }}>${calcularSubtotal().toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}><span style={{ color: 'var(--color-danger)' }}>Deducciones</span><span style={{ color: 'var(--color-danger)' }}>-${(calcularCobertura() + descuento).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, alignItems: 'flex-end' }}>
                  <span style={{ color: 'white', fontWeight: 800 }}>Neto</span>
                  <span style={{ color: 'var(--color-primary)', fontSize: 36, fontWeight: 900 }}>${calcularTotal().toLocaleString()}</span>
                </div>
                <button onClick={finalizarRegistro} disabled={loading} style={{ width: '100%', padding: 20, background: 'var(--color-primary)', border: 'none', borderRadius: 12, color: 'var(--color-dark)', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  {loading ? <FaSpinner className="spin" /> : <><FaPrint /> EMITIR & FINALIZAR</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroInteligente;
