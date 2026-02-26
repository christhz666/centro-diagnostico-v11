import React, { useState, useEffect } from 'react';
import { FaUserMd, FaCalendarCheck, FaVial, FaMicroscope, FaArrowUp, FaSync, FaClock, FaCheckCircle, FaHospitalUser } from 'react-icons/fa';
import api from '../services/api';

const StatCard = ({ title, value, icon: Icon, color, trend, index }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), index * 100); return () => clearTimeout(t); }, [index]);

    return (
        <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '24px',
            color: 'var(--text-main)', position: 'relative', overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: visible ? 'translateY(0)' : 'translateY(15px)',
            opacity: visible ? 1 : 0,
        }}
            className="clinical-tile"
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                    <Icon size={22} />
                </div>
                {trend && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaArrowUp size={10} /> {trend}
                    </div>
                )}
            </div>

            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
            <div style={{ marginTop: 8, fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'baseline', gap: 8, color: 'var(--color-dark)' }}>
                {value}
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>hoy</span>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [data, setData] = useState({ citasHoy: 0, estudiosRealizados: 0, ingresosHoy: 0, pacientesNuevos: 0 });
    const [citasHoy, setCitasHoy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const stats = await api.getDashboardStats();
            setData(stats || data);
            const citas = await api.getCitas({ fecha: new Date().toISOString().split('T')[0] });
            setCitasHoy(Array.isArray(citas) ? citas.slice(0, 6) : (citas.data?.slice(0, 6) || []));
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    const CARDS = [
        { title: 'Citas Hoy', value: data.citasHoy, icon: FaCalendarCheck, color: '#2563eb', trend: '+12%', index: 0 },
        { title: 'Análisis Realizados', value: data.estudiosRealizados, icon: FaVial, color: '#4f46e5', trend: '+5%', index: 1 },
        { title: 'Nuevos Pacientes', value: data.pacientesNuevos, icon: FaUserMd, color: '#0891b2', trend: '+18%', index: 2 },
        { title: 'Equipos Activos', value: '14', icon: FaMicroscope, color: '#f59e0b', index: 3 }
    ];

    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    return (
        <div style={{ padding: '40px', maxWidth: 1400, margin: '0 auto' }}>
            {/* ── Encabezado Moderno ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 44 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--color-dark)', fontFamily: 'var(--font-title)', letterSpacing: '-0.5px' }}>
                        {saludo}, <span style={{ color: 'var(--color-primary)' }}>{user?.nombre?.split(' ')[0] || 'Usuario'}</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>
                        {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <button onClick={fetchDashboardData} style={{ width: 44, height: 44, borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <FaSync className={loading ? 'spin' : ''} size={14} />
                </button>
            </div>

            {/* ── Grid Estadísticas ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
                {CARDS.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            {/* ── Sección de Pacientes ── */}
            <div className="glass-panel" style={{ padding: '0', borderRadius: 12, overflow: 'hidden', background: 'white', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-dark)' }}>Próximas Citas</h2>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: '#f8fafc', padding: '4px 12px', borderRadius: 20 }}>{citasHoy.length} hoy</span>
                </div>

                <div style={{ padding: '12px' }}>
                    {citasHoy.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <FaClock size={24} style={{ marginBottom: 16, opacity: 0.3 }} />
                            <p style={{ margin: 0, fontSize: 14 }}>No hay pacientes registrados para hoy</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {citasHoy.map((cita, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px', borderRadius: 8, transition: 'all 0.2s'
                                }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                            <FaHospitalUser size={18} />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--color-dark)', fontWeight: 700, fontSize: 15 }}>{cita.paciente?.nombre} {cita.paciente?.apellido}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                                                {cita.estudios?.map(e => e.estudio?.nombre || 'General').join(', ') || 'Consulta General'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                                            <FaCheckCircle size={14} /> {cita.estado}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{cita.horaInicio || '--:--'} AM</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ padding: '16px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ver toda la agenda</button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
