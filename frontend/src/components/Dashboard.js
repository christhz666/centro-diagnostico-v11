import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area
} from 'recharts';

/* ── Paleta para gráficos ──────────────────────────────────── */
const CHART_COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const StatCard = ({ title, value, subtext, icon, colorClass, index }) => {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 glow-border shadow-lg dark:shadow-none flex flex-col justify-between h-48 group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start">
                <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                    <span className="material-icons-round">{icon}</span>
                </div>
            </div>
            <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white">{value}</h3>
                <p className="text-xs text-gray-400 mt-1">{subtext}</p>
            </div>
        </div>
    );
};

/* ── Tooltip personalizado para gráficos ──────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: 0, fontSize: 13, fontWeight: 600, color: p.color || '#fff' }}>
                    {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('ingreso')
                        ? `RD$ ${p.value.toLocaleString('es-DO')}`
                        : p.value}
                </p>
            ))}
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({ citasHoy: 0, estudiosRealizados: 0, ingresosHoy: 0, pacientesNuevos: 0, facturacionMes: 0 });
    const [citasHoy, setCitasHoy] = useState([]);
    const [citasGrafica, setCitasGrafica] = useState([]);
    const [topEstudios, setTopEstudios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Stats principales
            const d = await api.getDashboardStats();
            const data = d?.data || d;
            if (data) {
                setStats({
                    citasHoy: data.citas?.hoy ?? 0,
                    estudiosRealizados: data.resultados?.completadosMes ?? 0,
                    ingresosHoy: data.facturacion?.hoy?.total ?? 0,
                    facturacionMes: data.facturacion?.mes?.total ?? 0,
                    pacientesNuevos: data.pacientes?.nuevosMes ?? 0,
                    resultadosPendientes: data.resultados?.pendientes ?? 0,
                    totalPacientes: data.pacientes?.total ?? 0,
                });
            }

            // Citas del día
            const c = await api.getCitas({ fecha: new Date().toISOString().split('T')[0] });
            setCitasHoy(Array.isArray(c) ? c.slice(0, 6) : (c.data?.slice(0, 6) || []));

            // Gráfica de citas (últimos 30 días)
            try {
                const cg = await api.getCitasGrafica();
                const chartData = (cg?.data || cg || []).map(item => ({
                    fecha: item._id?.split('-').slice(1).join('/'),  // "2026-03-01" -> "03/01"
                    total: item.total || 0,
                    completadas: item.completadas || 0,
                }));
                setCitasGrafica(chartData);
            } catch { }

            // Top estudios
            try {
                const te = await api.getTopEstudios();
                setTopEstudios((te?.data || te || []).slice(0, 6));
            } catch { }

        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 60000);
        return () => clearInterval(interval);
    }, []);

    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    const fmtMoney = (n) => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div>
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 dark:text-white mb-2">
                        {saludo}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">{user?.nombre?.split(' ')[0] || 'Doctor'}</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg flex items-center gap-2">
                        Panel de diagnóstico inteligente
                        <span className="h-1 w-1 rounded-full bg-gray-500"></span>
                        <span className="text-primary font-mono text-base uppercase">
                            {new Date().toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                    </p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className={`flex items-center justify-center h-12 w-12 rounded-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 shadow-lg text-gray-600 dark:text-primary transition-transform duration-500 hover:scale-110 active:scale-95 ${loading ? 'animate-spin' : ''}`}
                >
                    <span className="material-icons-round">refresh</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Citas Hoy" value={stats.citasHoy} subtext={`${citasHoy.length} en espera`} icon="calendar_today" colorClass="bg-blue-500/10 text-blue-500" />
                <StatCard title="Resultados Mes" value={stats.estudiosRealizados} subtext={`${stats.resultadosPendientes || 0} pendientes`} icon="science" colorClass="bg-primary/10 text-primary" />
                <StatCard title="Ingresos Hoy" value={fmtMoney(stats.ingresosHoy)} subtext={`Mes: ${fmtMoney(stats.facturacionMes)}`} icon="payments" colorClass="bg-green-500/10 text-green-500" />
                <StatCard title="Pacientes Nuevos" value={stats.pacientesNuevos} subtext={`${stats.totalPacientes || 0} total`} icon="people" colorClass="bg-purple-500/10 text-purple-500" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Gráfica de citas por día (Area Chart) — ocupa 2 columnas */}
                <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-3xl p-6 glow-border shadow-lg dark:shadow-none">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">Pacientes por Día</h3>
                            <p className="text-xs text-gray-400 mt-1">Últimos 30 días</p>
                        </div>
                        <span className="material-icons-round text-gray-300 dark:text-gray-600">show_chart</span>
                    </div>
                    {citasGrafica.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={citasGrafica}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="fecha" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorTotal)" />
                                <Area type="monotone" dataKey="completadas" name="Completadas" stroke="#10b981" strokeWidth={2} fill="url(#colorComp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-gray-400">
                            <span className="material-icons-round text-5xl mb-2">analytics</span>
                        </div>
                    )}
                </div>

                {/* Top Estudios (Pie Chart) */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 glow-border shadow-lg dark:shadow-none">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">Estudios Populares</h3>
                            <p className="text-xs text-gray-400 mt-1">Este mes</p>
                        </div>
                        <span className="material-icons-round text-gray-300 dark:text-gray-600">pie_chart</span>
                    </div>
                    {topEstudios.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={topEstudios.map(e => ({ name: e.nombre || 'Estudio', value: e.cantidad || 0 }))}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {topEstudios.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                                <Legend
                                    formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{val.length > 18 ? val.slice(0, 18) + '…' : val}</span>}
                                    wrapperStyle={{ fontSize: 11 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-gray-400">
                            <span className="material-icons-round text-5xl">donut_large</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Ingresos Semanales (Bar Chart) */}
            {citasGrafica.length > 0 && (
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 glow-border shadow-lg dark:shadow-none mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">Actividad de Citas</h3>
                            <p className="text-xs text-gray-400 mt-1">Total vs Completadas — últimos 30 días</p>
                        </div>
                        <span className="material-icons-round text-gray-300 dark:text-gray-600">bar_chart</span>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={citasGrafica}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                            <XAxis dataKey="fecha" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="total" name="Total" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={16} />
                            <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Patients Table Section */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-lg dark:shadow-none overflow-hidden glow-border">
                <div className="glass-header px-6 py-5 flex items-center justify-between sticky top-0 z-20">
                    <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">Pacientes de Hoy</h3>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">{citasHoy.length} activos</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5">
                                <th className="px-6 py-4 font-medium">Paciente</th>
                                <th className="px-6 py-4 font-medium">Estudio</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium text-right">Hora</th>
                                <th className="px-6 py-4 font-medium text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100 dark:divide-white/5">
                            {citasHoy.map((cita, i) => (
                                <tr key={i} className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary font-bold text-xs">
                                                {(cita.paciente?.nombre || 'P')[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{cita.paciente?.nombre} {cita.paciente?.apellido}</p>
                                                <p className="text-xs text-gray-500">ID: {cita.paciente_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            {cita.estudios?.[0]?.estudio?.nombre || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${cita.estado === 'Completada' ? 'bg-green-500' : 'bg-primary animate-pulse'}`}></span>
                                            <span className={`${cita.estado === 'Completada' ? 'text-green-500' : 'text-primary'} text-xs font-semibold`}>
                                                {cita.estado}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900 dark:text-white font-mono">{cita.horaInicio || '--:--'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => window.location.href = `/resultados?paciente=${cita.paciente_id}`}
                                            className="text-gray-400 hover:text-primary transition-colors"
                                        >
                                            <span className="material-icons-round">description</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {citasHoy.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No hay citas para hoy</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-center">
                    <button
                        onClick={() => window.location.href = '/consulta'}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                    >
                        Ver todos los pacientes <span className="material-icons-round text-sm">expand_more</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
