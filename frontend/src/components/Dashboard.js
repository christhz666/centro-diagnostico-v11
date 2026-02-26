import React, { useState, useEffect } from 'react';
import api from '../services/api';

const StatCard = ({ title, value, subtext, icon, colorClass, trend, index }) => {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 glow-border shadow-lg dark:shadow-none flex flex-col justify-between h-48 group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start">
                <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                    <span className="material-icons-round">{icon}</span>
                </div>
                {trend && (
                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <span className="material-icons-round text-[10px]">arrow_upward</span> {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white">{value}</h3>
                <p className="text-xs text-gray-400 mt-1">{subtext}</p>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({ citasHoy: 0, estudiosRealizados: 0, ingresosHoy: 0, pacientesNuevos: 0 });
    const [citasHoy, setCitasHoy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const d = await api.getDashboardStats();
            setStats(d || stats);
            const c = await api.getCitas({ fecha: new Date().toISOString().split('T')[0] });
            setCitasHoy(Array.isArray(c) ? c.slice(0, 6) : (c.data?.slice(0, 6) || []));
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                {/* Featured Patient Card */}
                <div className="col-span-1 md:col-span-12 lg:col-span-5 row-span-2 bg-white dark:bg-surface-dark rounded-3xl p-6 glow-border shadow-lg dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-75"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full uppercase tracking-wider">Último Ingreso</span>
                            <button className="text-gray-400 hover:text-white transition-colors">
                                <span className="material-icons-round">more_horiz</span>
                            </button>
                        </div>
                        {citasHoy.length > 0 ? (
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary overflow-hidden">
                                    <span className="material-icons-round text-4xl">person</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                                        {citasHoy[0].paciente?.nombre} {citasHoy[0].paciente?.apellido}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">ID: #{citasHoy[0].paciente_id}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-xs font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-gray-500 dark:text-gray-300">
                                            {citasHoy[0].estudios?.[0]?.estudio?.nombre || 'Consulta'}
                                        </span>
                                        <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded text-primary uppercase">
                                            {citasHoy[0].estado}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-gray-400">Esperando pacientes...</div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 dark:bg-[#0B1121] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                <div className="text-gray-400 text-xs uppercase mb-1">Estado General</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white flex items-end gap-1">
                                    Estable
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#0B1121] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                <div className="text-gray-400 text-xs uppercase mb-1">Prioridad</div>
                                <div className="text-xl font-bold text-primary flex items-end gap-1">Normal</div>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 mt-auto">
                        <button
                            onClick={() => window.location.href = `/consulta?id=${citasHoy[0]?.paciente_id}`}
                            className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                            Ver Historial Completo
                            <span className="material-icons-round text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="col-span-1 md:col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard
                        title="Citas Hoy"
                        value={stats.citasHoy}
                        subtext={`${citasHoy.length} en espera`}
                        icon="calendar_today"
                        colorClass="bg-blue-500/10 text-blue-500"
                        trend="+12%"
                    />
                    <StatCard
                        title="Resultados"
                        value={stats.estudiosRealizados}
                        subtext="Listos para revisar"
                        icon="science"
                        colorClass="bg-primary/10 text-primary"
                        trend="+5%"
                    />
                    <StatCard
                        title="Ingresos"
                        value={`$${stats.ingresosHoy}`}
                        subtext="Generados hoy"
                        icon="payments"
                        colorClass="bg-green-500/10 text-green-500"
                        trend="+18%"
                    />

                    {/* System Status Card */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white dark:bg-surface-dark rounded-3xl p-6 glow-border shadow-lg dark:shadow-none flex items-center justify-between relative overflow-hidden">
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <span className="material-icons-round text-sm">dns</span>
                                </div>
                                <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold">Estado del Sistema</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Operativo</h3>
                                <span className="text-sm text-primary font-mono">99.9% Uptime</span>
                            </div>
                        </div>
                        <div className="relative flex items-center justify-center h-20 w-20">
                            <div className="absolute h-full w-full rounded-full border border-primary/20 pulse-circle" style={{ animationDelay: '0s' }}></div>
                            <div className="absolute h-3/4 w-3/4 rounded-full border border-primary/40 pulse-circle" style={{ animationDelay: '1s' }}></div>
                            <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_15px_rgba(0,229,255,1)] z-10"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Patients Table Section */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-lg dark:shadow-none overflow-hidden glow-border">
                <div className="glass-header px-6 py-5 flex items-center justify-between sticky top-0 z-20">
                    <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">Pacientes de Hoy</h3>
                    <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">{citasHoy.length} activos</span>
                    </div>
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
