import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import './App.css';

import {
  FaHeartbeat, FaChartPie, FaPlusCircle, FaFileInvoiceDollar,
  FaUserMd, FaCogs, FaSignOutAlt, FaBars, FaTimes, FaUsers,
  FaFlask, FaClipboardList, FaBarcode, FaChevronDown, FaChevronRight,
  FaBalanceScale, FaPalette, FaNetworkWired, FaDownload, FaWhatsapp,
  FaXRay, FaBell
} from 'react-icons/fa';

import api from './services/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RegistroInteligente from './components/RegistroInteligente';
import Facturas from './components/Facturas';
import PortalMedico from './components/PortalMedico';
import AdminPanel from './components/AdminPanel';
import AdminUsuarios from './components/AdminUsuarios';
import GestionEstudios from './components/GestionEstudios';
import Resultados from './components/Resultados';
import ConsultaRapida from './components/ConsultaRapida';
import AdminEquipos from './components/AdminEquipos';
import Contabilidad from './components/Contabilidad';
import DeployAgentes from './components/DeployAgentes';
import DescargarApp from './components/DescargarApp';
import PortalPaciente from './components/PortalPaciente';
import CampanaWhatsApp from './components/CampanaWhatsApp';
import Imagenologia from './components/Imagenologia';
import OfflineScreen from './components/OfflineScreen';

/* ── Sidebar expandido por hover ─────────────────────────────── */
const SIDEBAR_W = 240;
const SIDEBAR_MINI = 64;

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState({});
  const hoverTimeout = useRef(null);

  // Estado para el Tutorial Interactivo
  const [runTour, setRunTour] = useState(false);

  // Pasos del tutorial interactivo
  const tourSteps = [
    {
      target: 'body',
      placement: 'center',
      content: '¡Bienvenido al Sistema Médico! Realicemos un rápido recorrido para que conozcas las funciones principales.',
    },
    {
      target: '.tour-step-home',
      content: 'Este es tu Dashboard. Aquí verás el resumen diario y los ingresos.',
    },
    {
      target: '.tour-step-registro',
      content: 'Registro Inteligente. Desde aquí crearás nuevas citas y leerás Cédulas rápidamente.',
    },
    {
      target: '.tour-step-facturas',
      content: 'Módulo de Facturación. Completa los pagos de las citas registradas y ábre tu turno de caja diario.',
    },
    {
      target: '.tour-step-resultados',
      content: 'Panel de Resultados. Sube y visualiza las analíticas y PDF del laboratorio.',
    },
    {
      target: '.tour-step-imagenologia',
      content: 'Imagenología y Descargas. Los doctores podrán ver los visores o descargar instalaciones desde aquí.',
    },
    {
      target: '.sidebar-colapsador',
      content: 'Usa este botón para expandir o contraer el menú en cualquier momento.',
    }
  ];

  const handleTourCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('tourCompleted', 'true');
    }
  };

  const sidebarExpanded = isMobile ? sidebarMobileOpen : sidebarHovered;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarHovered(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (savedToken && savedToken !== 'undefined' && savedUser && savedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && typeof parsedUser === 'object') {
          console.log('[App] Recovering session for:', parsedUser.nombre);
          setToken(savedToken);
          setUser(parsedUser);
          if (!localStorage.getItem('tourCompleted')) {
            setTimeout(() => setRunTour(true), 1500);
          }
        } else {
          throw new Error('Invalid user object');
        }
      }
      catch (e) {
        console.error('Session recovery failed:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/configuracion/empresa', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => { if (d && typeof d === 'object') setEmpresaConfig(d); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleSessionExpired = (e) => {
      const reason = e.detail?.reason || 'Sin detalles';
      console.warn(`[App] Session expired event received. Reason: ${reason}`);
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  const handleLogin = (u, t, persist = true) => {
    // Sincronizar vía API Service
    api.forceLogin(u, t, persist);

    setToken(t);
    setUser(u);
    if (!localStorage.getItem('tourCompleted')) {
      setTimeout(() => setRunTour(true), 1200);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  /* Hover delay (suaviza el colapso) */
  const onSidebarEnter = () => { clearTimeout(hoverTimeout.current); setSidebarHovered(true); };
  const onSidebarLeave = () => { hoverTimeout.current = setTimeout(() => { setSidebarHovered(false); setAdminMenuOpen(false); }, 220); };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <FaHeartbeat style={{ fontSize: 60, color: '#2563eb', animation: 'heartbeat 1.2s ease-in-out infinite' }} />
    </div>
  );

  /* Rutas públicas del portal paciente */
  if (window.location.pathname === '/portal-paciente' || window.location.pathname.startsWith('/mis-resultados')) {
    return (
      <Router>
        <Routes>
          <Route path="/portal-paciente" element={<PortalPaciente />} />
          <Route path="/mis-resultados" element={<PortalPaciente />} />
          <Route path="*" element={<PortalPaciente />} />
        </Routes>
      </Router>
    );
  }


  const isElectron = window.isElectron === true;
  const rol = user?.role || user?.rol || 'recepcion';

  const ROL_COLORS = {
    admin: '#8e44ad',
    medico: '#16a085',
    laboratorio: '#e67e22',
    recepcion: '#2980b9',
  };

  const menuItems = [
    { path: '/', icon: <FaChartPie />, label: 'Dashboard', roles: ['admin', 'medico', 'recepcion', 'laboratorio'] },
    { path: '/registro', icon: <FaPlusCircle />, label: 'Nuevo Registro', roles: ['admin', 'recepcion'] },
    { path: '/consulta', icon: <FaBarcode />, label: 'Consulta Rápida', roles: ['admin', 'recepcion', 'laboratorio'] },
    { path: '/facturas', icon: <FaFileInvoiceDollar />, label: 'Facturas', roles: ['admin', 'recepcion'] },
    { path: '/medico', icon: <FaUserMd />, label: 'Portal Médico', roles: ['admin', 'medico'] },
    { path: '/resultados', icon: <FaFlask />, label: 'Resultados', roles: ['admin', 'medico', 'laboratorio'] },
    { path: '/imagenologia', icon: <FaXRay />, label: 'Imagenología', roles: ['admin', 'medico', 'laboratorio', 'recepcion'] },
    { path: '/descargar-app', icon: <FaDownload />, label: 'Descargar Plataformas', roles: ['admin', 'medico', 'recepcion', 'laboratorio'] }
  ];

  const adminSubItems = [
    { path: '/admin', icon: <FaPalette />, label: 'Personalización', roles: ['admin'] },
    { path: '/admin/usuarios', icon: <FaUsers />, label: 'Usuarios', roles: ['admin'] },
    { path: '/admin/equipos', icon: <FaCogs />, label: 'Equipos', roles: ['admin'] },
    { path: '/admin/estudios', icon: <FaClipboardList />, label: 'Catálogo Estudios', roles: ['admin'] },
    { path: '/contabilidad', icon: <FaBalanceScale />, label: 'Contabilidad', roles: ['admin'] },
    { path: '/campana-whatsapp', icon: <FaWhatsapp />, label: 'Campañas WhatsApp', roles: ['admin'] },
    ...(isElectron ? [{ path: '/deploy', icon: <FaNetworkWired />, label: 'Deploy Agentes', roles: ['admin'] }] : [])
  ];

  const filteredMenu = menuItems.filter(i => i.roles.includes(rol));
  const filteredAdminSub = adminSubItems.filter(i => i.roles.includes(rol));
  const showAdminMenu = filteredAdminSub.length > 0;

  const sidebarW = sidebarExpanded ? SIDEBAR_W : SIDEBAR_MINI;

  const adminNavLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 20px 11px 40px',
    color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
    textDecoration: 'none',
    background: isActive ? 'var(--color-primary-glow)' : 'transparent',
    fontSize: 13, transition: 'all 0.2s',
    whiteSpace: 'nowrap', overflow: 'hidden',
    margin: '2px 12px',
    borderRadius: '10px'
  });

  const empresaNombre = empresaConfig.nombre || 'Mi Esperanza';
  const logoUrl = empresaConfig.logo_sidebar || empresaConfig.logo_resultados || null;

  return (
    <OfflineScreen>
      <Router>
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
            @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.2)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} }
            @keyframes fadeSlideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
            @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            .spin { animation: spin 0.8s linear infinite; }
            .sidebar-nav-item:hover { background: #f1f5f9 !important; color: var(--color-primary) !important; transform: translateX(4px); }
            .sidebar-nav-item:hover a, .sidebar-nav-item:hover { color: var(--color-primary) !important; }
            .nav-label-text { opacity: ${sidebarExpanded ? 1 : 0}; max-width: ${sidebarExpanded ? '180px' : '0px'}; transition: opacity 0.25s, max-width 0.25s; overflow: hidden; white-space: nowrap; display: inline-block; }
            .app-main-content { transition: margin-left 0.3s ease; }
            ::-webkit-scrollbar { width:5px; }
            ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius:4px; }
          `}</style>

          {!user ? (
            <Login onLogin={handleLogin} />
          ) : (
            <div style={{ display: 'flex', flex: 1 }}>
              <Joyride
                steps={tourSteps}
                run={runTour}
                continuous={true}
                showProgress={true}
                showSkipButton={true}
                callback={handleTourCallback}
                styles={{
                  options: {
                    primaryColor: '#2563eb',
                    zIndex: 10000,
                  }
                }}
                locale={{ last: 'Finalizar', next: 'Siguiente', skip: 'Saltar Tour', back: 'Atrás' }}
              />

              {/* ─── Overlay móvil ─── */}
              {isMobile && sidebarMobileOpen && (
                <div onClick={() => { setSidebarMobileOpen(false); setAdminMenuOpen(false); }} style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
                  zIndex: 999, backdropFilter: 'blur(2px)'
                }} />
              )}

              {/* ══════════ SIDEBAR ══════════ */}
              <aside
                onMouseEnter={!isMobile ? onSidebarEnter : undefined}
                onMouseLeave={!isMobile ? onSidebarLeave : undefined}
                className="sidebar-v2"
                style={{
                  width: isMobile ? (sidebarMobileOpen ? SIDEBAR_W : 0) : sidebarW,
                  left: isMobile && !sidebarMobileOpen ? '-100%' : 0
                }}
              >
                {/* Logo / nombre empresa */}
                <div style={{
                  padding: '24px 16px', borderBottom: '1px solid var(--glass-border)',
                  display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, flexShrink: 0,
                }}>
                  {logoUrl
                    ? <img src={logoUrl} alt={empresaNombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, background: 'rgba(37,99,235,0.05)', border: '1.5px solid rgba(37,99,235,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FaHeartbeat style={{ color: '#2563eb', fontSize: 18, animation: 'heartbeat 1.5s ease-in-out infinite' }} />
                    </div>
                  }
                  <div className="nav-label-text" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--color-dark)', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{empresaNombre}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginTop: 2 }}>PLATAFORMA MÉDICA</div>
                  </div>
                </div>

                {/* Menú principal */}
                <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto', overflowX: 'hidden' }}>
                  {filteredMenu.map((item, i) => (
                    <NavLink key={i} to={item.path} end={item.path === '/'}
                      className={({ isActive }) => `nav-link-v2 ${isActive ? 'active' : ''} tour-step-${item.path.replace(/\//g, '') || 'home'}`}
                      onClick={() => { if (isMobile) setSidebarMobileOpen(false); }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                      <span className="nav-label-text">{item.label}</span>
                    </NavLink>
                  ))}

                  {showAdminMenu && (
                    <>
                      <div style={{ margin: '8px 16px', borderTop: '1px solid var(--glass-border)' }} />
                      <div
                        onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                          color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
                          fontSize: 14, fontWeight: 600, margin: '4px 12px', borderRadius: 8
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0 }}><FaCogs /></span>
                        <span className="nav-label-text" style={{ flex: 1 }}>Configuración</span>
                        <span className="nav-label-text" style={{ fontSize: 11, maxWidth: 16 }}>
                          {adminMenuOpen ? <FaChevronDown /> : <FaChevronRight />}
                        </span>
                      </div>
                      {adminMenuOpen && filteredAdminSub.map((item, i) => (
                        <NavLink key={`a${i}`} to={item.path} style={adminNavLinkStyle}
                          onClick={() => { if (isMobile) setSidebarMobileOpen(false); }}
                        >
                          <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                          <span className="nav-label-text">{item.label}</span>
                        </NavLink>
                      ))}
                    </>
                  )}
                </nav>

                {/* Footer del sidebar */}
                <div style={{ padding: '20px 16px', borderTop: '1px solid var(--glass-border)', flexShrink: 0 }}>
                  {/* Info usuario */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px', marginBottom: 16,
                    background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, background: ROL_COLORS[rol] || '#3498db',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800,
                      fontSize: 14, flexShrink: 0
                    }}>
                      {(user.nombre || 'U')[0].toUpperCase()}
                    </div>
                    <div className="nav-label-text" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--color-dark)', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nombre}</div>
                      <div style={{ color: 'var(--color-primary)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{rol}</div>
                    </div>
                  </div>

                  <button onClick={handleLogout} style={{
                    width: '100%', padding: '12px', background: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: 10, color: '#ef4444',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}
                  >
                    <FaSignOutAlt style={{ fontSize: 16 }} />
                    <span className="nav-label-text">Finalizar Sesión</span>
                  </button>
                </div>
              </aside>

              {/* ══════════ MAIN ══════════ */}
              <main className="app-main-content" style={{
                flex: 1,
                marginLeft: isMobile ? 0 : sidebarW,
                minHeight: '100vh',
                background: 'var(--color-bg)',
                transition: 'margin-left 0.3s ease',
              }}>
                {/* Header */}
                <header className="header-v2" style={{ background: 'white !important' }}>
                  {/* Botón menú (móvil o siempre visible) */}
                  <button
                    className="sidebar-colapsador"
                    onClick={() => isMobile ? setSidebarMobileOpen(!sidebarMobileOpen) : setSidebarHovered(!sidebarHovered)}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 18, cursor: 'pointer', color: 'var(--color-dark)', width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                  >
                    {(isMobile ? sidebarMobileOpen : sidebarHovered) ? <FaTimes /> : <FaBars />}
                  </button>

                  {/* Breadcrumb / título página */}
                  <div style={{ flex: 1, paddingLeft: 16 }}>
                    <PageTitle />
                  </div>

                  {/* Info usuario derecha */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#888', fontSize: 14 }}>
                        Hola, <strong style={{ color: '#1b262c' }}>{user.nombre}</strong>
                      </span>
                      <span style={{
                        background: ROL_COLORS[rol] || '#3498db',
                        color: 'white', padding: '3px 10px',
                        borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        {rol}
                      </span>
                    </div>
                  </div>
                </header>

                {/* Contenido de las rutas */}
                <div style={{ padding: '0' }}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/" />} />
                    <Route path="/registro" element={<RegistroInteligente />} />
                    <Route path="/consulta" element={<ConsultaRapida />} />
                    <Route path="/facturas" element={<Facturas />} />
                    <Route path="/medico" element={<PortalMedico />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                    <Route path="/admin/equipos" element={<AdminEquipos />} />
                    <Route path="/admin/estudios" element={<GestionEstudios />} />
                    <Route path="/contabilidad" element={<Contabilidad />} />
                    <Route path="/resultados" element={<Resultados />} />
                    <Route path="/imagenologia" element={<Imagenologia />} />
                    <Route path="/deploy" element={<DeployAgentes />} />
                    <Route path="/descargar-app" element={<DescargarApp />} />
                    <Route path="/campana-whatsapp" element={<CampanaWhatsApp />} />
                    <Route path="/login" element={<Navigate to="/" />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </div>
              </main>
            </div>
          )}
          <div style={{ position: 'fixed', bottom: 4, right: 8, fontSize: 10, color: 'rgba(0,0,0,0.15)', pointerEvents: 'none', zIndex: 9999, fontWeight: 600 }}>
            v1.1.1-PREMIUM
          </div>
        </div>
      </Router>
    </OfflineScreen >
  );
}

/* Componente de título de la página actual */
function PageTitle() {
  const loc = useLocation();
  const titles = {
    '/': 'Dashboard',
    '/registro': 'Nuevo Registro',
    '/consulta': 'Consulta Rápida',
    '/facturas': 'Facturas',
    '/medico': 'Portal Médico',
    '/resultados': 'Resultados',
    '/imagenologia': 'Imagenología',
    '/admin': 'Personalización',
    '/admin/usuarios': 'Usuarios',
    '/admin/equipos': 'Equipos',
    '/admin/estudios': 'Catálogo de Estudios',
    '/contabilidad': 'Contabilidad',
    '/campana-whatsapp': 'Campañas WhatsApp',
    '/descargar-app': 'Descargar App',
    '/deploy': 'Deploy Agentes',
  };
  const title = titles[loc.pathname] || 'Sistema';
  return <span style={{ fontWeight: 600, color: '#1b262c', fontSize: 16 }}>{title}</span>;
}

export default App;
