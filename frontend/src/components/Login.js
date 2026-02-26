import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaSpinner } from 'react-icons/fa';
import api from '../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
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
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            onLogin(response.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error de conexión con el servidor');
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
                    <img src="/logo-centro.png" alt="Logo" className="login-logo" />
                    <h1 className="login-title">Centro Médico</h1>
                    <p className="login-subtitle">Gestión Clínica Profesional</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Acceso Usuario</label>
                        <div className="login-input-wrapper">
                            <input
                                type="text"
                                name="email"
                                className="login-input"
                                placeholder="Identificación o correo"
                                value={credentials.email}
                                onChange={handleChange}
                                required
                            />
                            <FaUser size={14} style={{ position: 'absolute', left: 16, color: '#94a3b8' }} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Contraseña</label>
                        <div className="login-input-wrapper">
                            <input
                                type="password"
                                name="password"
                                className="login-input"
                                placeholder="••••••••"
                                value={credentials.password}
                                onChange={handleChange}
                                required
                            />
                            <FaLock size={14} style={{ position: 'absolute', left: 16, color: '#94a3b8' }} />
                        </div>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? <FaSpinner className="spin" /> : 'CONECTAR AHORA'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
