import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaSpinner } from 'react-icons/fa';
import api from '../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [rememberMe, setRememberMe] = useState(true);
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
                onLogin(user, token, rememberMe);
                navigate('/');
            } else {
                console.error('[Login] Missing data:', { user, token });
                throw new Error('Respuesta de sesión incompleta del servidor.');
            }
        } catch (err) {
            console.error('Login error detail:', err);
            const msg = err.message || (err.response?.data?.mensaje) || 'Error de conexión con el servidor';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-aura" />
            <div className="login-aura-2" />

            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo-container">
                        <img src="/logo-centro.png" alt="Logo" className="login-logo" />
                    </div>
                    <h1 className="login-title">MedicCore AI</h1>
                    <p className="login-subtitle">Sistema de Gestión Clínica Inteligente</p>
                </div>

                {error && (
                    <div className="login-error">
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        {error}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Credenciales de Acceso</label>
                        <div className="login-input-wrapper">
                            <input
                                type="text"
                                name="email"
                                className="login-input"
                                placeholder="Usuario o Correo Electrónico"
                                value={credentials.email}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                            />
                            <FaUser size={16} style={{ position: 'absolute', left: 18, color: 'var(--color-electric)', opacity: 0.7 }} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label>Clave de Seguridad</label>
                        <div className="login-input-wrapper">
                            <input
                                type="password"
                                name="password"
                                className="login-input"
                                placeholder="••••••••••••"
                                value={credentials.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                            />
                            <FaLock size={16} style={{ position: 'absolute', left: 18, color: 'var(--color-electric)', opacity: 0.7 }} />
                        </div>
                    </div>

                    <div className="login-options">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            Recordarme en este equipo
                        </label>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? <FaSpinner className="spin" /> : 'ACCEDER AL PORTAL'}
                    </button>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                        &copy; 2026 MedicCore AI Systems. Todos los derechos reservados.
                    </div>
                </form>
            </div>

            <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1, color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 600, letterSpacing: '1px' }}>
                ENCRYPTED TRANSIT SSL/TLS 1.3
            </div>
        </div>
    );
};

export default Login;
