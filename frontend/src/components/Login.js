import React, { useState, useEffect } from 'react';
import { FaUser, FaLock, FaHeartbeat, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import api from '../services/api';
import './Login.css';

/* ─── Background Component ───────────────────────────────────── */
const BackgroundEffects = () => {
    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: -1, background: '#050505' }}>
            <div className="shimmer-bg" />
            <div className="glow-corner" style={{ top: '-10%', left: '-10%', background: 'rgba(59, 130, 246, 0.4)' }} />
            <div className="glow-corner" style={{ bottom: '-10%', right: '-10%', background: 'rgba(147, 51, 234, 0.3)' }} />
            {[...Array(20)].map((_, i) => (
                <div key={i} className="particle" style={{
                    width: Math.random() * 3 + 1 + 'px',
                    height: Math.random() * 3 + 1 + 'px',
                    left: Math.random() * 100 + '%',
                    top: Math.random() * 100 + '%',
                    animation: `float ${Math.random() * 10 + 5}s infinite ease-in-out`,
                    animationDelay: `${Math.random() * 5}s`,
                    opacity: Math.random() * 0.3 + 0.1
                }} />
            ))}
        </div>
    );
};

/* ─── Main Component ───────────────────────────────────────── */
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
        console.log('Login: Intentando iniciar sesión para:', username);
        if (!username.trim() || !password) {
            setError('Complete usuario y contraseña');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await api.login({ username, password });
            console.log('Login: Respuesta recibida:', data ? 'OK' : 'VACÍA');

            if (data && data.access_token) {
                console.log('Login: Éxito, guardando sesión...');
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.usuario));

                if (rememberMe) {
                    localStorage.setItem('savedUsername', username);
                    localStorage.setItem('savedPassword', password);
                } else {
                    localStorage.removeItem('savedUsername');
                    localStorage.removeItem('savedPassword');
                }

                try {
                    await api.request('/caja/abrir', { method: 'POST' });
                } catch (cajaErr) {
                    console.warn('Login: Error al abrir caja:', cajaErr);
                }

                onLogin(data.usuario, data.access_token);
            } else {
                console.warn('Login: Token no encontrado en la respuesta');
                setError('Usuario o contraseña incorrectos');
            }
        } catch (err) {
            console.error('Login: Error inesperado:', err);
            setError(err.message || 'Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <BackgroundEffects />

            <div className="login-card">
                <div className="login-logo-container">
                    {empresaConfig.logo_login ? (
                        <img
                            src={empresaConfig.logo_login}
                            alt={empresaConfig.nombre}
                            style={{ maxWidth: '180px', maxHeight: '80px', objectFit: 'contain', marginBottom: 20 }}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div style={{
                            width: 64, height: 64, background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 20, border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                            <FaHeartbeat style={{ fontSize: 32, color: '#3b82f6' }} />
                        </div>
                    )}
                    <h1 className="login-title">{empresaConfig.nombre || 'Centro Diagnóstico'}</h1>
                    <p className="login-subtitle">Sistema de Gestión Médica Premium</p>
                </div>

                {error && (
                    <div className="error-container">
                        <span>⚠️</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Usuario</label>
                        <div className="input-wrapper">
                            <FaUser className="input-icon" />
                            <input
                                className="login-input"
                                type="text"
                                placeholder="Ingresa tu usuario"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                autoFocus
                                autoComplete="username"
                                name="username"
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Contraseña</label>
                        <div className="input-wrapper">
                            <FaLock className="input-icon" />
                            <input
                                className="login-input"
                                type={showPass ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                name="password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                style={{
                                    position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center'
                                }}
                            >
                                {showPass ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, marginLeft: 4 }}>
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            style={{
                                width: 18, height: 18,
                                cursor: 'pointer', marginRight: 10
                            }}
                        />
                        <label htmlFor="rememberMe" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>
                            Recordar credenciales
                        </label>
                    </div>

                    <button type="submit" disabled={loading} className="login-btn">
                        {loading ? (
                            <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Validando...</>
                        ) : (
                            'Acceder al Portal'
                        )}
                    </button>
                </form>

                <div className="footer-text">
                    {empresaConfig.empresa_direccion || ''}
                    {empresaConfig.empresa_telefono && ` · ${empresaConfig.empresa_telefono}`}
                </div>
            </div>
        </div>
    );
};

export default Login;
