import React, { useState, useEffect } from 'react';
import { FaUserMd, FaCalendarCheck, FaVial, FaMicroscope, FaArrowUp, FaSync, FaClock, FaCheckCircle, FaHospitalUser } from 'react-icons/fa';
import api from '../services/api';

const StatCard = ({ title, value, icon: Icon, color, trend, index }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), index * 100); return () => clearTimeout(t); }, [index]);

    return (
        <div style={{
            background: 'var(--color-card)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 16, padding: '24px',
            color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            opacity: visible ? 1 : 0,
        }}
            className="crystal-card"
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            {/* Precision Accent Line */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaArrowUp size={10} /> {trend}
                    </div>
                )}
            </div>

            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
            <div style={{ marginTop: 8, fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'baseline', gap: 8 }}>
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
        { title: 'Citas Hoy', value: data.citasHoy, icon: FaCalendarCheck, color: 'var(--color-primary)', trend: '+12%', index: 0 },
        { title: 'Análisis Realizados', value: data.estudiosRealizados, icon: FaVial, color: '#8b5cf6', trend: '+5%', index: 1 },
        { title: 'Nuevos Pacientes', value: data.pacientesNuevos, icon: FaUserMd, color: '#06b6d4', trend: '+18%', index: 2 },
        { title: 'Equipo Activo', value: '14', icon: FaMicroscope, color: '#f59e0b', index: 3 }
    ];

    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    return (
        <div style={{ padding: '40px', maxWidth: 1600, margin: '0 auto' }}>
            <style>{`
                @keyframes heartbeat { 0%,100%{transform:scale(1)} 15%{transform:scale(1.15)} 30%{transform:scale(1)} }
                .crystal-card::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent); transition: 0.5s; }
                .crystal-card:hover::before { left: 100%; }
            `}</style>

            {/* ── Encabezado ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: 'var(--color-white)', fontFamily: 'var(--font-title)', letterSpacing: '-1px' }}>
                        {saludo}, <span style={{ color: 'var(--color-primary)' }}>{user?.nombre?.split(' ')[0] || 'Usuario'}</span>
                    </h1>
                    <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>
                        Panel de Control · <span style={{ color: 'var(--color-white)' }}>{new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </p>
                </div>
                <button onClick={fetchDashboardData} style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                    <FaSync className={loading ? 'spin' : ''} />
                </button>
            </div>

            {/* ── Grid Estadísticas ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 56 }}>
                {CARDS.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            {/* ── Sección de Citas — Estilo Lista Luxury ── */}
            <div className="glass-panel" style={{ padding: '40px', borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 10px var(--color-primary)' }} />
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Pacientes en Espera</h2>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{citasHoy.length} servicios hoy</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {citasHoy.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 16 }}>
                            <FaClock size={32} style={{ marginBottom: 16, opacity: 0.2 }} />
                            <p>No hay pacientes registrados para hoy todavía</p>
                        </div>
                    ) : (
                        citasHoy.map((cita, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px 24px', background: 'rgba(255,255,255,0.01)',
                                border: '1px solid rgba(255,255,255,0.03)', borderRadius: 12,
                                transition: 'all 0.2s'
                            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0, 242, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: 18 }}>
                                        <FaHospitalUser />
                                    </div>
                                    <div>
                                        <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{cita.paciente?.nombre} {cita.paciente?.apellido}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                                            {cita.estudios?.map(e => e.estudio?.nombre || 'General').join(', ') || 'Consulta General'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                                        <FaCheckCircle /> {cita.estado}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{cita.horaInicio || '00:00'} AM</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
