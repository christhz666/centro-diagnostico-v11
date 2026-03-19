import React, { useState, useEffect, useCallback } from 'react';
import { FaUserPlus, FaSearch, FaTrash, FaSpinner, FaCheck, FaPrint, FaArrowRight, FaArrowLeft, FaIdCard, FaStethoscope, FaWallet, FaShieldAlt } from 'react-icons/fa';
import api from '../services/api';
import FacturaTermica from './FacturaTermica';
import useDebounce from '../hooks/useDebounce';

const RegistroInteligente = () => {
  const [paso, setPaso] = useState(1);
  const [modoPaciente, setModoPaciente] = useState('nuevo');
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
  const debouncedBusqueda = useDebounce(busqueda, 300);

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

  const buscarPaciente = useCallback(async (queryInput = '') => {
    const query = String(queryInput || '').trim();
    if (!query) {
      setPacientes([]);
      return;
    }

    if (query.length < 2) {
      setPacientes([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getPacientes({ search: query });
      setPacientes(Array.isArray(response) ? response : []);
    } catch (err) { setPacientes([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (modoPaciente !== 'existente') return;
    buscarPaciente(debouncedBusqueda);
  }, [debouncedBusqueda, buscarPaciente, modoPaciente]);

  const seleccionarPacienteExistente = (paciente) => {
    setPacienteSeleccionado(paciente);
    setPaso(2);
  };

  const crearPaciente = async () => {
    if (!nuevoPaciente.nombre || !nuevoPaciente.apellido || !nuevoPaciente.telefono || !nuevoPaciente.fechaNacimiento) {
      alert('Complete los campos obligatorios (Nombre, Apellido, Teléfono, F. Nacimiento)');
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
  const finalizarRegistro = async () => {
    if (estudiosSeleccionados.length === 0) { alert('Agregue al menos un estudio'); return; }
    try {
      setLoading(true);
      const ahora = new Date();

      // ── Detectar si hay estudios de Rayos X ──────────────────────
      const CATEGORIAS_RAYOS_X = ['radiologia', 'radiography', 'rayos_x', 'rayos x', 'rx', 'radio', 'imagen', 'imagenologia', 'radiology'];
      const tieneRayosX = estudiosSeleccionados.some(e => {
        const cat = (e.categoria || e.category || '').toLowerCase();
        const nom = (e.nombre || e.name || '').toLowerCase();
        return CATEGORIAS_RAYOS_X.some(k => cat.includes(k) || nom.includes('rx') || nom.includes('radio') || nom.includes('rayos'));
      });

      // Obtener sucursal de Rayos X configurada
      let sucursalRayosXId = null;
      if (tieneRayosX) {
        try {
          const cfgResp = await fetch('/api/configuracion/empresa');
          const cfgData = await cfgResp.json();
          sucursalRayosXId = cfgData?.sucursal_rayos_x_id || null;
        } catch (_) { /* ignorar si falla */ }
      }

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
        estado: 'completada',
        // Si hay estudios de Rayos X y hay sucursal configurada, asignar esa sucursal
        ...(sucursalRayosXId ? { sucursalRayosX: sucursalRayosXId } : {})
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
        datosCliente: { nombre: `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`, cedula: pacienteSeleccionado.cedula || '', telefono: pacienteSeleccionado.telefono || '' },
        // Propagar sucursal de Rayos X a la factura también
        ...(sucursalRayosXId ? { sucursal: sucursalRayosXId } : {})
      };
      const factRes = await api.createFactura(facturaData);
      setFacturaGenerada({ ...factRes.data || factRes, montoPagado });
      setMostrarFactura(true);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.mensaje || err.message));
    } finally { setLoading(false); }
  };

  const reiniciar = () => {
    setModoPaciente('nuevo');
    setPaso(1); setBusqueda(''); setPacientes([]); setPacienteSeleccionado(null); setEstudiosSeleccionados([]);
    setFacturaGenerada(null); setMostrarFactura(false); setDescuento(0); setMontoPagado(0);
    setNuevoPaciente({ nombre: '', apellido: '', cedula: '', esMenor: false, telefono: '', email: '', fechaNacimiento: '', sexo: 'M', nacionalidad: 'Dominicano', tipoSangre: '', seguroNombre: '', seguroNumeroAfiliado: '' });
  };

  const cambiarModoPaciente = (modo) => {
    setModoPaciente(modo);
    if (modo === 'nuevo') {
      setBusqueda('');
      setPacientes([]);
    }
  };

  const getModoButtonStyle = (activo) => ({
    padding: '12px 18px',
    borderRadius: 10,
    border: `1px solid ${activo ? '#2563eb' : 'var(--legacy-border)'}`,
    background: activo ? 'rgba(37, 99, 235, 0.08)' : 'var(--legacy-surface)',
    color: activo ? '#2563eb' : 'var(--legacy-text)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: activo ? '0 10px 24px -18px rgba(37, 99, 235, 0.45)' : 'none'
  });

  if (mostrarFactura && facturaGenerada) return (
    <FacturaTermica factura={facturaGenerada} paciente={pacienteSeleccionado} estudios={estudiosSeleccionados} onClose={reiniciar} />
  );

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        .clinical-step { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .clinical-input { background: var(--legacy-surface); border: 1.5px solid var(--legacy-border); border-radius: 8px; padding: 12px 16px; color: var(--legacy-text); width: 100%; outline: none; transition: all 0.2s; font-size: 14px; }
        .clinical-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08); }
        .clinical-label { font-size: 12px; font-weight: 700; color: var(--legacy-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: block; }
        .clinical-form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .clinical-form-span-2 { grid-column: span 2; }
        .clinical-form-span-4 { grid-column: 1 / -1; }
        .clinical-insurance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1100px) {
          .clinical-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .clinical-form-span-2 { grid-column: span 1; }
        }
        @media (max-width: 720px) {
          .clinical-form-grid,
          .clinical-insurance-grid { grid-template-columns: 1fr; }
          .clinical-form-span-2,
          .clinical-form-span-4 { grid-column: 1 / -1; }
        }
      `}</style>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 44 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--color-dark)', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(37, 99, 235, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <FaUserPlus size={20} />
          </div>
          Registro de Paciente
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>Gestión integrada de admisiones y servicios médicos</p>
      </div>

      {/* ── Stepper ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 44 }}>
        {[
          { step: 1, label: 'Identificación', icon: <FaIdCard /> },
          { step: 2, label: 'Servicios Médicos', icon: <FaStethoscope /> },
          { step: 3, label: 'Liquidación', icon: <FaWallet /> }
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '16px 20px', borderRadius: 10,
            background: paso === s.step ? 'var(--legacy-surface-hover)' : 'var(--legacy-surface)',
            border: `1px solid ${paso === s.step ? 'rgba(96, 165, 250, 0.35)' : 'var(--legacy-border)'}`,
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: paso === s.step ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none'
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: paso >= s.step ? '#2563eb' : 'var(--legacy-surface-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: paso >= s.step ? 'white' : 'var(--legacy-text-muted)', fontSize: 13
            }}>
              {paso > s.step ? <FaCheck /> : s.icon}
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--legacy-text-muted)', textTransform: 'uppercase' }}>PASO 0{s.step}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: paso >= s.step ? 'var(--legacy-text)' : 'var(--legacy-text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PASO 1: PACIENTE ── */}
      {paso === 1 && (
        <div className="clinical-step" style={{ maxWidth: modoPaciente === 'nuevo' ? 1160 : 840, margin: '0 auto' }}>
          <div style={{ background: 'var(--legacy-surface)', padding: modoPaciente === 'nuevo' ? 24 : 32, borderRadius: 12, border: '1px solid var(--legacy-border)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: '0 0 8px', color: 'var(--color-dark)', fontSize: 18, fontWeight: 800 }}>Identificación del Paciente</h3>
                <p style={{ margin: 0, color: 'var(--legacy-text-muted)', fontSize: 14 }}>
                  {modoPaciente === 'existente'
                    ? 'Busque un paciente ya registrado para continuar con el ingreso.'
                    : 'Complete el formulario para registrar un nuevo paciente y continuar con el ingreso.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => cambiarModoPaciente('nuevo')} style={getModoButtonStyle(modoPaciente === 'nuevo')}>
                  Registrar Nuevo Paciente
                </button>
                <button type="button" onClick={() => cambiarModoPaciente('existente')} style={getModoButtonStyle(modoPaciente === 'existente')}>
                  Paciente Existente
                </button>
              </div>
            </div>

            {modoPaciente === 'existente' ? (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                  <input
                    className="clinical-input"
                    placeholder="Nombre completo o cédula"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => buscarPaciente(busqueda)}
                    style={{ width: 52, background: '#2563eb', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {loading ? <FaSpinner className="spin" /> : <FaSearch />}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                  {pacientes.map(p => (
                    <div
                      key={p._id || p.id}
                      onClick={() => seleccionarPacienteExistente(p)}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        border: '1px solid var(--legacy-border-soft)',
                        background: 'var(--legacy-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--legacy-surface-muted)'; e.currentTarget.style.borderColor = 'var(--legacy-border)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--legacy-surface)'; e.currentTarget.style.borderColor = 'var(--legacy-border-soft)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: 'var(--legacy-text)', fontSize: 14 }}>{p.nombre} {p.apellido}</strong>
                        <FaArrowRight style={{ color: '#2563eb', fontSize: 12 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--legacy-text-muted)', marginTop: 4 }}>{p.cedula} · {p.telefono}</div>
                    </div>
                  ))}

                  {pacientes.length === 0 && !loading && busqueda && (
                    <p style={{ textAlign: 'center', color: 'var(--legacy-text-muted)', fontSize: 13, marginTop: 20 }}>No se encontraron pacientes</p>
                  )}

                  {pacientes.length === 0 && !loading && !busqueda && (
                    <p style={{ textAlign: 'center', color: 'var(--legacy-text-muted)', fontSize: 13, marginTop: 20 }}>Escriba un nombre o cédula para buscar.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="clinical-form-grid">
                  <div className="clinical-form-span-2"><label className="clinical-label">Nombre *</label><input className="clinical-input" value={nuevoPaciente.nombre} onChange={e => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })} /></div>
                  <div className="clinical-form-span-2"><label className="clinical-label">Apellido *</label><input className="clinical-input" value={nuevoPaciente.apellido} onChange={e => setNuevoPaciente({ ...nuevoPaciente, apellido: e.target.value })} /></div>
                  <div><label className="clinical-label">F. Nacimiento *</label><input type="date" className="clinical-input" value={nuevoPaciente.fechaNacimiento} onChange={e => {
                    const val = e.target.value;
                    const updates = { ...nuevoPaciente, fechaNacimiento: val };
                    if (val) {
                      const hoy = new Date(); const nac = new Date(val);
                      let edad = hoy.getFullYear() - nac.getFullYear();
                      const m = hoy.getMonth() - nac.getMonth();
                      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
                      if (edad < 18) { updates.esMenor = true; updates.cedula = 'MENOR DE EDAD'; }
                      else { updates.esMenor = false; if (updates.cedula === 'MENOR DE EDAD') updates.cedula = ''; }
                    }
                    setNuevoPaciente(updates);
                  }} /></div>
                  <div><label className="clinical-label">Sexo *</label>
                    <select className="clinical-input" value={nuevoPaciente.sexo} onChange={e => setNuevoPaciente({ ...nuevoPaciente, sexo: e.target.value })}>
                      <option value="M">Masculino</option><option value="F">Femenino</option>
                    </select>
                  </div>
                  <div><label className="clinical-label">Cédula / ID</label><input className="clinical-input" placeholder={nuevoPaciente.esMenor ? 'Menor de edad' : '000-0000000-0'} value={nuevoPaciente.cedula} disabled={nuevoPaciente.esMenor} onChange={e => setNuevoPaciente({ ...nuevoPaciente, cedula: e.target.value })} />
                    {nuevoPaciente.esMenor && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginTop: 4, display: 'block' }}>⚠ Menor de edad</span>}
                  </div>
                  <div><label className="clinical-label">Teléfono *</label><input className="clinical-input" placeholder="809-000-0000" value={nuevoPaciente.telefono} onChange={e => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })} /></div>
                  <div className="clinical-form-span-2"><label className="clinical-label">Email</label><input type="email" className="clinical-input" placeholder="correo@ejemplo.com" value={nuevoPaciente.email} onChange={e => setNuevoPaciente({ ...nuevoPaciente, email: e.target.value })} /></div>
                  <div><label className="clinical-label">Nacionalidad</label>
                    <select className="clinical-input" value={nuevoPaciente.nacionalidad} onChange={e => setNuevoPaciente({ ...nuevoPaciente, nacionalidad: e.target.value })}>
                      <option value="Dominicano">Dominicano</option><option value="Haitiano">Haitiano</option><option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div><label className="clinical-label">Tipo de Sangre</label>
                    <select className="clinical-input" value={nuevoPaciente.tipoSangre} onChange={e => setNuevoPaciente({ ...nuevoPaciente, tipoSangre: e.target.value })}>
                      <option value="">Desconocido</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="clinical-form-span-4" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><FaShieldAlt style={{ color: '#2563eb' }} /><span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Seguro Médico</span></div>
                    <div className="clinical-insurance-grid">
                      <div><label className="clinical-label">Nombre del Seguro</label><input className="clinical-input" placeholder="ARS, SENASA, etc." value={nuevoPaciente.seguroNombre} onChange={e => setNuevoPaciente({ ...nuevoPaciente, seguroNombre: e.target.value })} /></div>
                      <div><label className="clinical-label">No. Afiliado</label><input className="clinical-input" placeholder="Número de afiliado" value={nuevoPaciente.seguroNumeroAfiliado} onChange={e => setNuevoPaciente({ ...nuevoPaciente, seguroNumeroAfiliado: e.target.value })} /></div>
                    </div>
                  </div>
                </div>

                <button onClick={crearPaciente} style={{ width: '100%', marginTop: 22, padding: 15, background: '#2563eb', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  CONTINUAR <FaArrowRight style={{ marginLeft: 8 }} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PASO 2: ESTUDIOS ── */}
      {paso === 2 && (
        <div className="clinical-step" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          <div style={{ background: 'var(--legacy-surface)', padding: 32, borderRadius: 12, border: '1px solid var(--legacy-border)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, color: 'var(--color-dark)', fontSize: 18, fontWeight: 800 }}>Catálogo de Servicios</h3>
              <input className="clinical-input" placeholder="Buscar estudio..." value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ width: 240 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, maxHeight: 550, overflowY: 'auto', padding: '2px' }}>
              {estudios.filter(e => (e.nombre || '').toLowerCase().includes(filtroCategoria.toLowerCase())).map(e => (
                <div key={e._id || e.id} onClick={() => agregarEstudio(e)} style={{
                  padding: 16, borderRadius: 10, background: 'var(--legacy-surface-muted)', border: '1.5px solid var(--legacy-border-soft)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                }} onMouseEnter={ev => { ev.currentTarget.style.borderColor = '#2563eb'; ev.currentTarget.style.background = 'var(--legacy-surface-hover)'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.borderColor = 'var(--legacy-border-soft)'; ev.currentTarget.style.background = 'var(--legacy-surface-muted)'; }}>
                  <div>
                    <div style={{ color: 'var(--legacy-text)', fontWeight: 700, fontSize: 13 }}>{e.nombre}</div>
                    <div style={{ color: 'var(--legacy-text-muted)', fontSize: 11, marginTop: 4 }}>ID: {e.codigo || 'N/A'}</div>
                  </div>
                  <div style={{ color: '#2563eb', fontWeight: 800, fontSize: 14 }}>${(e.precio || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--legacy-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--legacy-border)', boxShadow: 'var(--shadow-lg)', height: 'fit-content', position: 'sticky', top: 20 }}>
            <h4 style={{ color: 'var(--legacy-text)', margin: '0 0 20px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--legacy-border-soft)', paddingBottom: 12 }}>Resumen de Orden</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, maxHeight: 300, overflowY: 'auto' }}>
              {estudiosSeleccionados.map(e => (
                <div key={e._id || e.id} style={{ background: 'var(--legacy-surface-muted)', padding: 14, borderRadius: 8, border: '1px solid var(--legacy-border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--legacy-text)', fontWeight: 700, fontSize: 12 }}>{e.nombre}</span>
                    <button onClick={() => quitarEstudio(e._id || e.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FaTrash size={11} /></button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--legacy-text-muted)', fontSize: 11 }}>RD$ {e.precio}</span>
                    <input className="clinical-input" type="number" placeholder="Cobertura" value={e.cobertura} onChange={ev => actualizarCobertura(e._id || e.id, ev.target.value)} style={{ width: 80, padding: '4px 8px', fontSize: 11 }} />
                  </div>
                </div>
              ))}
              {estudiosSeleccionados.length === 0 && <p style={{ textAlign: 'center', color: 'var(--legacy-text-muted)', fontSize: 12 }}>Seleccione estudios a realizar</p>}
            </div>
            <div style={{ borderTop: '2px solid var(--legacy-border-soft)', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'baseline' }}>
                <span style={{ color: 'var(--legacy-text-muted)', fontWeight: 600, fontSize: 13 }}>Total Neto</span>
                <span style={{ color: 'var(--legacy-text)', fontSize: 26, fontWeight: 800 }}>${calcularTotal().toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPaso(1)} style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--legacy-surface-muted)', border: '1px solid var(--legacy-border-soft)', color: 'var(--legacy-text-muted)', cursor: 'pointer' }}><FaArrowLeft /></button>
                <button onClick={() => setPaso(3)} disabled={estudiosSeleccionados.length === 0} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#2563eb', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>CONTINUAR <FaArrowRight style={{ marginLeft: 6 }} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 3: PAGO ── */}
      {paso === 3 && (
        <div className="clinical-step" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ background: 'var(--legacy-surface)', padding: 48, borderRadius: 16, border: '1px solid var(--legacy-border)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: '0 0 32px', color: 'var(--legacy-text-strong)', textAlign: 'center', fontSize: 22, fontWeight: 800 }}>Liquidación de Servicios</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
              <div style={{ background: 'var(--legacy-surface-muted)', padding: 32, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ color: 'var(--legacy-text-muted)' }}>Subtotal</span><span style={{ color: 'var(--legacy-text)', fontWeight: 600 }}>${calcularSubtotal().toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}><span style={{ color: '#ef4444' }}>Cobertura Seguro</span><span style={{ color: '#ef4444', fontWeight: 600 }}>-${(calcularCobertura() + descuento).toLocaleString()}</span></div>
                <div style={{ borderTop: '1px solid var(--legacy-border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: 'var(--legacy-text-strong)', fontSize: 18 }}>TOTAL A PAGAR</span>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#2563eb' }}>${calcularTotal().toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div><label className="clinical-label">F. Pago</label><select className="clinical-input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option></select></div>
                <div><label className="clinical-label">Recibido</label><input type="number" className="clinical-input" value={montoPagado} onChange={e => setMontoPagado(parseFloat(e.target.value) || 0)} style={{ fontWeight: 800 }} /></div>
              </div>

              <button onClick={finalizarRegistro} disabled={loading} style={{ width: '100%', padding: 18, background: '#2563eb', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
                {loading ? <FaSpinner className="spin" /> : <><FaPrint /> PROCESAR Y EMITIR TICKET</>}
              </button>
              <button onClick={() => setPaso(2)} style={{ background: 'none', border: 'none', color: 'var(--legacy-text-muted)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>VOLVER AL DETALLE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroInteligente;
