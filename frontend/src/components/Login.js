import React, { useState, useEffect } from 'react';
import { FaUser, FaLock, FaHeartbeat, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import api from '../services/api';
import './Login.css';

/* ─── Paleta ───────────────────────────────────────────────── */
const C = {
    dark: '#0d2137',
    mid: '#1a3a5c',
    blue: '#2980b9',
    sky: '#87CEEB',
    white: '#ffffff',
    glass: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.18)',
};

/* ─── Animación de partículas flotantes ─────────────────────── */
const Particles = () => (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(12)].map((_, i) => (
            <div key={i} style={{
                position: 'absolute',
                width: `${6 + (i % 5) * 4}px`,
                height: `${6 + (i % 5) * 4}px`,
                borderRadius: '50%',
                background: `rgba(135,206,235, ${0.06 + (i % 4) * 0.04})`,
                left: `${(i * 23 + 5) % 95}%`,
                top: `${(i * 17 + 10) % 90}%`,
                animation: `float-particle ${8 + i * 1.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
            }} />
        ))}
    </div>
);

/* ─── Ondas decorativas ──────────────────────────────────────── */
const Waves = ({ color }) => (
    <svg viewBox="0 0 1440 120" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', opacity: 0.15 }}>
        <path fill={color || C.sky}
            d="M0,64 C180,100 360,20 540,60 C720,100 900,20 1080,55 C1260,90 1380,30 1440,50 L1440,120 L0,120 Z" />
    </svg>
);

/* ─── Efecto de puntos que siguen el mouse ───────────────────── */
const MouseTrail = () => {
  const [dots, setDots] = useState([]);
  useEffect(() => {
    const handleMove = e => {
      const newDot = { x: e.clientX, y: e.clientY, id: Date.now() };
      setDots(prev => [...prev.slice(-8), newDot]);
    };
    window.addEventListener('mousemove', handleMove);
    const interval = setInterval(() => setDots(d => d.slice(1)), 50);
    return () => { window.removeEventListener('mousemove', handleMove); clearInterval(interval); };
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {dots.map(d => (
        <div key={d.id} style={{
          position: 'absolute', left: d.x, top: d.y,
          width: 8, height: 8, background: 'rgba(135,206,235,0.6)',
          borderRadius: '50%', transform: 'translate(-50%, -50%)',
          animation: 'trail 0.6s linear'
        }} />
      ))}
    </div>
  );
};

/* ─── Componente principal ─────────────────────────────────── */
const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [empresaConfig, setEmpresaConfig] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        fetch('/api/configuracion/empresa')
            .then(r => r.json())
            .then(d => setEmpresaConfig(d || {}))
            .catch(() => { });

        const savedUsername = localStorage.getItem('savedUsername');
        const savedPassword = localStorage.getItem('savedPassword');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
        if (savedPassword) {
            setPassword(savedPassword);
        }

        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            setError('Complete usuario y contraseña');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await api.login({ username, password });
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.usuario));

                if (rememberMe) {
                    localStorage.setItem('savedUsername', username);
                    localStorage.setItem('savedPassword', password);
                } else {
                    localStorage.removeItem('savedUsername');
                    localStorage.removeItem('savedPassword');
                }

                // Disparar en background la apertura del turno de caja del dia
                try {
                    await api.request('/caja/abrir', { method: 'POST' });
                    console.log('Turno de caja diario verificado/iniciado');
                } catch (cajaErr) {
                    console.log('Caja lista o usuario no aplica:', cajaErr);
                }

                onLogin(data.usuario, data.access_token);
            } else {
                setError('Usuario o contraseña incorrectos');
            }
        } catch {
            setError('Usuario o contraseña incorrectos');
        } finally {
            setLoading(false);
        }
    };

    const colorA = empresaConfig.color_primario || C.mid;
    const colorB = empresaConfig.color_secundario || C.blue;

    /* ═══════════════ RENDER ══════════════════════════════════ */
    return (
        <div style={{
            minHeight: '100vh',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '16px' : '24px',
            fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Encabezado móvil */}
            {isMobile && (
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    {empresaConfig.logo_login ? (
                        <img
                            src={empresaConfig.logo_login}
                            alt={empresaConfig.nombre}
                            style={{
                                maxWidth: '220px', maxHeight: '90px', objectFit: 'contain', marginBottom: 16,
                                filter: 'brightness(1.1) drop-shadow(0 4px 10px rgba(0,0,0,0.3))'
                            }}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div style={{
                            width: 72, height: 72,
                            background: 'rgba(135,206,235,0.1)',
                            border: `2px solid ${C.sky}`,
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px',
                            animation: 'pulse-ring 2.5s ease-out infinite',
                        }}>
                            <FaHeartbeat style={{ fontSize: 34, color: C.sky, animation: 'heartbeat 1.5s ease-in-out infinite' }} />
                        </div>
                    )}
                    <h2 style={{ color: C.dark, margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
                        {empresaConfig.nombre || 'Centro Diagnóstico'}
                    </h2>
                    <p style={{ color: 'rgba(135,206,235,0.7)', margin: 0, fontSize: 13 }}>Sistema de Gestión Médica</p>
                </div>
            )}

            {/* tarjeta glass con contenido */}
            <div style={{
                background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(12px)',
                borderRadius: 20,
                padding: isMobile ? '24px' : '40px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.08)',
                maxWidth: 420,
                width: '100%',
                position: 'relative',
                zIndex: 1,
                animation: 'fadeInUp 0.5s ease'
            }}>
                {/* Título del formulario */}
                <div style={{ marginBottom: 32 }}>
                    <h2 style={{ color: C.dark, margin: '0 0 6px', fontSize: isMobile ? 24 : 28, fontWeight: 700 }}>
                        Iniciar Sesión
                    </h2>
                    <p style={{ color: 'rgba(44,62,80,0.7)', margin: 0, fontSize: 14 }}>
                        Ingresa tus credenciales de acceso
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '13px 16px', background: 'rgba(231,76,60,0.15)',
                        border: '1px solid rgba(231,76,60,0.4)', borderRadius: 12,
                        color: '#ff8a80', fontSize: 14, marginBottom: 22,
                        display: 'flex', alignItems: 'center', gap: 8,
                        animation: 'fadeInUp 0.3s ease',
                    }}>
                        ⚠️ {error}
                    </div>
                )}



                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                        {/* Campo: Usuario */}
                        <div>
                            <label style={{
                                color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
                                display: 'block', marginBottom: 8, letterSpacing: '0.3px'
                            }}>
                                Usuario o Correo
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaUser style={{
                                    position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
                                    color: 'rgba(135,206,235,0.5)', fontSize: 15
                                }} />
                                <input
                                    className="login-input"
                                    type="text"
                                    placeholder="Tu usuario o correo electrónico"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    autoFocus
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Campo: Contraseña */}
                        <div>
                            <label style={{
                                color: 'rgba(44,62,80,0.6)', fontSize: 13, fontWeight: 500,
                                display: 'block', marginBottom: 8, letterSpacing: '0.3px'
                            }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{
                                    position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
                                    color: 'rgba(135,206,235,0.5)', fontSize: 15
                                }} />
                                <input
                                    className="login-input"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Tu contraseña"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: 4, display: 'flex', alignItems: 'center',
                                }}>
                                    {showPass ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        {/* Recuérdame */}
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '-4px' }}>
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{ marginRight: '8px', cursor: 'pointer', opacity: 0.8, width: 14, height: 14 }}
                            />
                            <label htmlFor="rememberMe" style={{ color: 'rgba(44,62,80,0.75)', fontSize: 13, cursor: 'pointer' }}>
                                Recuérdame en este equipo
                            </label>
                        </div>

                        {/* Botón submit */}
                        <button type="submit" disabled={loading} className="login-btn"
                            style={{ marginTop: 8 }}>
                            {loading
                                ? <><FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} /> Verificando...</>
                                : '→ Ingresar al Sistema'
                            }
                        </button>
                    </form>

                    {/* Footer */}
                    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>
                            {empresaConfig.empresa_direccion || ''}{empresaConfig.empresa_telefono ? ` · ${empresaConfig.empresa_telefono}` : ''}
                        </p>
                    </div>
                </div>

            </div>

    );
};

export default Login;
