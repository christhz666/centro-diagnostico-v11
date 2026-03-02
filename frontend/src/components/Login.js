import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/* ── Starfield Canvas Animation ─────────────────────────── */
function StarfieldCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let stars = [];
        const STAR_COUNT = 180;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Initialize stars
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.8 + 0.3,
                speed: Math.random() * 0.3 + 0.05,
                opacity: Math.random(),
                twinkleSpeed: Math.random() * 0.02 + 0.005,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.opacity += s.twinkleSpeed;
                if (s.opacity > 1 || s.opacity < 0.1) s.twinkleSpeed *= -1;
                s.y -= s.speed;
                if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width; }

                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.opacity))})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

const Login = ({ onLogin, empresaConfig = {} }) => {
    const [credentials, setCredentials] = useState(() => {
        const savedEmail = localStorage.getItem('rememberedEmail') || '';
        return { email: savedEmail, password: '' };
    });
    const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.login(credentials);
            const user = response.user || response.usuario;
            const token = response.token || response.access_token;
            if (user && token) {
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', credentials.email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }
                onLogin(user, token, rememberMe);
                navigate('/');
            } else {
                throw new Error('Respuesta de sesión incompleta');
            }
        } catch (err) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-dark relative overflow-hidden font-body">
            {/* Starfield Animation */}
            <StarfieldCanvas />

            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }} className="border border-white/10 rounded-[32px] p-8 shadow-2xl glow-border">
                    <div className="flex flex-col items-center mb-8">
                        {empresaConfig.logo_login ? (
                            <img src={empresaConfig.logo_login} alt="Logo" className="max-h-20 max-w-[240px] object-contain mb-6" />
                        ) : (
                            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-neon mb-6">
                                <span className="material-icons-round text-background-dark text-3xl">science</span>
                            </div>
                        )}
                        <h1 className="text-3xl font-display font-bold text-white tracking-tight">{empresaConfig.nombre || empresaConfig.empresa_nombre || 'MedicCore'}</h1>
                        <p className="text-gray-400 text-sm mt-2 font-medium uppercase tracking-widest">Diagnóstico Inteligente</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <span className="material-icons-round text-lg">error_outline</span>
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Credenciales</label>
                            <div className="relative group">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors text-xl">person</span>
                                <input
                                    type="text"
                                    name="email"
                                    value={credentials.email}
                                    onChange={handleChange}
                                    placeholder="Usuario o Correo"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Clave de Seguridad</label>
                            <div className="relative group">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors text-xl">lock</span>
                                <input
                                    type="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    placeholder="••••••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-5 h-5 rounded-lg bg-white/5 border-white/10 text-primary focus:ring-0 focus:ring-offset-0 transition-all"
                                />
                                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Recordarme</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-dark text-background-dark font-bold py-4 rounded-2xl shadow-neon transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    ACCEDER AL PORTAL
                                    <span className="material-icons-round text-lg">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-gray-500 font-medium">
                        &copy; 2026 {empresaConfig.nombre || empresaConfig.empresa_nombre || 'MedicCore'}. <br />
                        Secure Transit SSL/TLS 1.3
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
