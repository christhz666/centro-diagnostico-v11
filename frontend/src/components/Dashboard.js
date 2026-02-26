import React, { useState, useEffect, useRef } from 'react';
import {
    FaUsers, FaCalendarAlt, FaFlask, FaFileInvoiceDollar,
    FaSyncAlt, FaSpinner, FaArrowUp, FaArrowRight,
    FaUserPlus, FaCheckCircle, FaClock, FaExclamationCircle,
    FaMoneyBillWave, FaChartLine, FaHeartbeat
} from 'react-icons/fa';
import api from '../services/api';

/* ── Animación del número al entrar ───────────────────────────── */
function AnimatedNumber({ value, prefix = '', duration = 1200 }) {
    const [displayed, setDisplayed] = useState(0);
    const startRef = useRef(null);
    const rafRef = useRef(null);
    const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;

    useEffect(() => {
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayed(Math.floor(eased * numVal));
            if (progress < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [numVal, duration]);

    if (typeof value === 'string' && value.includes('RD$')) {
        return <span>{prefix}RD$ {displayed.toLocaleString()}</span>;
    }
    return <span>{prefix}{displayed.toLocaleString()}</span>;
}

/* ── Barra de progreso animada ───────────────────────────────── */
function ProgressBar({ value, max, color }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 6, marginTop: 10 }}>
            <div style={{
                height: 6, borderRadius: 6,
                background: color || 'var(--color-sky)',
                width: `${pct}%`,
                transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
        </div>
    );
}

/* ── Tarjeta de estadística ─────────────────────────────────── */
function StatCard({ title, value, subtitle, icon, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

    return (
        <div style={{
            background: 'var(--color-card)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 24, padding: '24px 22px',
            color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: 'var(--shadow)',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            opacity: visible ? 1 : 0,
            cursor: 'default',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
        >
            <div style={{
                position: 'absolute', right: -20, top: -20,
                width: 100, height: 100, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)' }}>{title}</p>
                    <h2 style={{ margin: '10px 0 6px', fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-title)', background: 'linear-gradient(to bottom, #fff, #bbb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        <AnimatedNumber value={value} />
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{subtitle}</p>
                </div>
                <div style={{
                    width: 56, height: 56, borderRadius: 18,
                    background: 'var(--color-primary-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0, color: 'var(--color-white)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════ DASHBOARD PRINCIPAL ════════════════════ */
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [citasHoy, setCitasHoy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = api.getUser();
    const hora = new Date().getHours();
    const saludo = hora < 12 ? '☀️ Buenos días' : hora < 18 ? '🌤️ Buenas tardes' : '🌙 Buenas noches';

    useEffect(() => {
        loadDashboard();
        const interval = setInterval(() => { loadDashboard(true); }, 20000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboard = async (isSilent = false) => {
        if (!isSilent) { setLoading(true); setError(''); }
        try {
            const [sRes, cRes] = await Promise.all([api.getDashboardStats(), api.getCitasHoy()]);
            const sData = sRes?.data || sRes;
            const cData = cRes?.data || cRes;
            if (sData && typeof sData === 'object') setStats(sData);
            if (Array.isArray(cData)) setCitasHoy(cData);
            else if (cData?.citas) setCitasHoy(cData.citas);
        } catch (e) {
            if (!isSilent) setError(e.message || 'Error al cargar datos');
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
            <FaHeartbeat style={{ fontSize: 48, color: 'var(--color-danger)', animation: 'heartbeat 1.2s ease-in-out infinite' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Sincronizando portal premium...</p>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 30 }}>
            <FaExclamationCircle style={{ fontSize: 48, color: 'var(--color-danger)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, textAlign: 'center' }}>{error}</p>
            <button onClick={loadDashboard} style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: 'var(--color-primary)', color: 'white',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}>
                <FaSyncAlt /> Reintentar
            </button>
        </div>
    );

    const CARDS = [
        {
            title: 'Total Pacientes', icon: <FaUsers />,
            value: stats?.pacientes?.total || 0,
            subtitle: `+${stats?.pacientes?.nuevosMes || 0} nuevos este mes`,
            delay: 0,
        },
        {
            title: 'Citas Hoy', icon: <FaCalendarAlt />,
            value: stats?.citas?.hoy || 0,
            subtitle: `${stats?.citas?.completadasHoy || 0} completadas`,
            delay: 80,
        },
        {
            title: 'Resultados Pendientes', icon: <FaFlask />,
            value: stats?.resultados?.pendientes || 0,
            subtitle: `${stats?.resultados?.completadosMes || 0} completados este mes`,
            delay: 160,
        },
        {
            title: 'Facturación Hoy', icon: <FaMoneyBillWave />,
            value: `RD$ ${(stats?.facturacion?.hoy?.total || 0).toLocaleString()}`,
            subtitle: `${stats?.facturacion?.hoy?.cantidad || 0} facturas emitidas`,
            delay: 240,
        },
    ];

    const ESTADO_CONFIG = {
        programada: { color: '#3b82f6', label: 'Programada' },
        confirmada: { color: '#22c55e', label: 'Confirmada' },
        en_sala: { color: '#f59e0b', label: 'En Sala' },
        en_proceso: { color: '#8b5cf6', label: 'En Proceso' },
        completada: { color: '#10b981', label: 'Completada' },
        cancelada: { color: '#ef4444', label: 'Cancelada' },
        no_asistio: { color: '#6b7280', label: 'No Asistió' },
    };

    return (
        <div style={{ padding: '32px', maxWidth: 1600, margin: '0 auto', background: 'transparent' }}>
            <style>{`
                @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.2)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} }
                @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            `}</style>

            {/* ── Encabezado ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--color-white)', fontFamily: 'var(--font-title)' }}>
                        {saludo}, <span style={{ background: 'linear-gradient(45deg, var(--color-primary), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.nombre?.split(' ')[0] || 'Usuario'}</span> 👋
                    </h1>
                    <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
                        Explora el resumen de hoy en <span style={{ color: 'var(--color-sky)' }}>Centro Diagnóstico Mi Esperanza</span>
                    </p>
                </div>
                <button onClick={loadDashboard} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 24px', borderRadius: 14,
                    border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)',
                    color: 'white', fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)'
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <FaSyncAlt /> Actualizar Dashboard
                </button>
            </div>

            {/* ── Cards estadísticas ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginBottom: 40 }}>
                {CARDS.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            {/* ── Resumen rápido ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 40 }}>
                {[
                    { label: 'Citas del mes', value: stats?.citas?.mes || 0, icon: <FaCalendarAlt />, color: '#3b82f6' },
                    { label: 'Facturación mes', value: `RD$ ${(stats?.facturacion?.mes?.total || 0).toLocaleString()}`, icon: <FaChartLine />, color: '#8b5cf6' },
                    { label: 'Pacientes nuevos', value: stats?.pacientes?.nuevosMes || 0, icon: <FaUserPlus />, color: '#10b981' },
                    { label: 'Citas programadas', value: stats?.citas?.programadas || 0, icon: <FaClock />, color: '#f59e0b' },
                    { label: 'En proceso', value: stats?.citas?.enProceso || 0, icon: <FaHeartbeat />, color: '#ef4444' },
                    { label: 'Médicos activos', value: stats?.personal?.medicos || 0, icon: <FaCheckCircle />, color: '#06b6d4' },
                ].map((item, i) => (
                    <div key={i} style={{
                        background: 'var(--color-card)', borderRadius: 20, padding: '20px',
                        border: '1px solid var(--glass-border)',
                        display: 'flex', alignItems: 'center', gap: 16,
                        animation: `fadeInUp 0.4s ease ${i * 50}ms both`,
                        backdropFilter: 'blur(8px)',
                        transition: 'var(--transition)',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                    >
                        <div style={{
                            width: 44, height: 44, borderRadius: 12, background: `${item.color}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 20, flexShrink: 0,
                            border: `1px solid ${item.color}30`
                        }}>
                            {item.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-white)', lineHeight: 1.2 }}>{item.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tabla de citas de hoy ── */}
            <div className="glass-panel" style={{ padding: '32px', borderRadius: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-white)', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <FaCalendarAlt />
                        </div>
                        Citas de Hoy
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-sky)', borderRadius: 20, padding: '4px 14px', fontSize: 14, fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            {citasHoy.length}
                        </span>
                    </h2>
                </div>

                {citasHoy.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                        <FaCalendarAlt style={{ fontSize: 64, marginBottom: 24, opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>No hay citas registradas para el día de hoy.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px', minWidth: 700 }}>
                            <thead>
                                <tr>
                                    {['Horario', 'Paciente', 'Estudios Sugeridos', 'Estado Actual'].map(h => (
                                        <th key={h} style={{
                                            padding: '0 20px 12px', textAlign: 'left', color: 'var(--text-muted)',
                                            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px'
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {citasHoy.map((cita, i) => {
                                    const ec = ESTADO_CONFIG[cita.estado] || ESTADO_CONFIG.programada;
                                    return (
                                        <tr key={cita._id || i} style={{ background: 'rgba(255,255,255,0.02)', transition: 'all 0.3s', borderRadius: 16 }}>
                                            <td style={{ padding: '24px 20px', fontWeight: 700, color: 'var(--color-white)', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <FaClock style={{ color: 'var(--color-primary)', fontSize: 14 }} />
                                                    {cita.horaInicio}
                                                </div>
                                            </td>
                                            <td style={{ padding: '24px 20px' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--color-white)', fontSize: 16 }}>
                                                    {cita.paciente?.nombre} {cita.paciente?.apellido}
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{cita.paciente?.cedula}</div>
                                            </td>
                                            <td style={{ padding: '24px 20px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                    {(cita.estudios || []).map((e, j) => (
                                                        <span key={j} style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--color-sky)', padding: '5px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                                                            {e.estudio?.nombre || 'Estudio'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '24px 20px', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 10,
                                                    background: 'rgba(255,255,255,0.03)', color: ec.color,
                                                    padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                                                    border: `1px solid ${ec.color}40`
                                                }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: ec.color, boxShadow: `0 0 12px ${ec.color}` }} />
                                                    {ec.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
