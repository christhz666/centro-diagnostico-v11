import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import './App.css';

import { FaHeartbeat } from 'react-icons/fa';

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
import CampanaWhatsApp from './components/CampanaWhatsApp';
import Imagenologia from './components/Imagenologia';
import OfflineScreen from './components/OfflineScreen';

function App() {
  const [user, setUser] = useState(null);
  const [, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const [runTour, setRunTour] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState({});

  // Load empresa config (public endpoint, no auth needed)
  useEffect(() => {
    fetch('/api/configuracion/empresa')
      .then(r => r.json())
      .then(data => {
        setEmpresaConfig(data || {});
        // Update page title if empresa_nombre is set
        const nombre = data?.nombre || data?.empresa_nombre;
        if (nombre) document.title = nombre;
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (savedToken && savedToken !== 'undefined' && savedUser && savedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
      } catch (e) {
        handleLogout();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (u, t, persist = true) => {
    api.forceLogin(u, t, persist);
    setToken(t);
    setUser(u);
    // Show guided tour on first login
    const tourKey = `tour_done_${u?.email || u?.username || 'user'}`;
    if (!localStorage.getItem(tourKey)) {
      setTimeout(() => setRunTour(true), 1500);
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background-dark">
      <div className="relative">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
        <FaHeartbeat className="text-6xl text-primary relative animate-pulse" />
      </div>
    </div>
  );

  const rol = user?.role || user?.rol || 'recepcion';
  const menuItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard', roles: ['admin', 'medico', 'recepcion', 'laboratorio'] },
    { path: '/registro', icon: 'person_add', label: 'Registro', roles: ['admin', 'recepcion'] },
    { path: '/consulta', icon: 'search', label: 'Consulta', roles: ['admin', 'recepcion', 'laboratorio'] },
    { path: '/facturas', icon: 'receipt_long', label: 'Facturas', roles: ['admin', 'recepcion'] },
    { path: '/medico', icon: 'medical_services', label: 'Médico', roles: ['admin', 'medico'] },
    { path: '/resultados', icon: 'science', label: 'Resultados', roles: ['admin', 'medico', 'laboratorio'] },
    { path: '/imagenologia', icon: 'settings_overscan', label: 'Imágenes', roles: ['admin', 'medico', 'laboratorio', 'recepcion'] },
    { path: '/admin', icon: 'settings', label: 'Panel Admin', roles: ['admin'] },
  ];



  const filteredMenu = menuItems.filter(i => i.roles.includes(rol) && i.path !== '/admin');
  const isAdmin = rol === 'admin';

  const tourSteps = [
    { target: 'nav', content: '📋 Menú de navegación: Accede a todas las secciones del sistema desde aquí.', placement: 'right', disableBeacon: true },
    { target: '[href="/"]', content: '📊 Dashboard: Vista general con estadísticas de pacientes, citas e ingresos del día.', placement: 'right' },
    { target: '[href="/registro"]', content: '➕ Registro: Ingresa nuevos pacientes y asigna estudios médicos.', placement: 'right' },
    { target: '[href="/consulta"]', content: '🔍 Consulta: Busca pacientes por nombre o cédula rápidamente.', placement: 'right' },
    { target: '[href="/resultados"]', content: '🔬 Resultados: Revisa, edita y valida los resultados de laboratorio.', placement: 'right' },
    { target: '[href="/imagenologia"]', content: '🖼️ Imagenología: Visor de imágenes DICOM con herramientas de ajuste (brillo, contraste, zoom, rotación).', placement: 'right' },
  ];

  const handleTourCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      const tourKey = `tour_done_${user?.email || user?.username || 'user'}`;
      localStorage.setItem(tourKey, 'true');
    }
  };

  return (
    <OfflineScreen>
      <Router>
        <div className={`min-h-screen flex flex-col transition-colors duration-300 bg-background-light dark:bg-background-dark`}>
          {!user ? (
            <Login onLogin={handleLogin} empresaConfig={empresaConfig} />
          ) : (
            <>
              <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showSkipButton
                showProgress
                callback={handleTourCallback}
                locale={{ back: 'Atrás', close: 'Cerrar', last: 'Finalizar', next: 'Siguiente', skip: 'Saltar tour' }}
                styles={{ options: { primaryColor: '#2563eb', zIndex: 10000 } }}
              />
              {/* Header */}
              <header className="sticky top-0 z-50 h-16 glass-header flex items-center justify-between px-4 lg:px-8 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl h-10 w-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors">
                    <span className="material-icons-round">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                  </button>
                  <h1 className="text-lg font-display font-semibold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <PageTitle />
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{rol}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.nombre}</span>
                  </div>

                  {/* Theme Toggle */}
                  <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-primary transition-all group">
                    <span className="material-icons-round text-xl group-hover:rotate-12 transition-transform">{darkMode ? 'light_mode' : 'dark_mode'}</span>
                  </button>

                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-blue-600 p-[1px] shadow-neon">
                    <div className="h-full w-full rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-white text-slate-800">
                      {(user.nombre || 'U')[0].toUpperCase()}
                    </div>
                  </div>
                </div>
              </header>

              <div className="flex flex-1 overflow-hidden">
                {/* Mobile overlay — tap to close sidebar */}
                {isMobile && sidebarOpen && (
                  <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      position: 'fixed', inset: 0, zIndex: 39,
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(2px)'
                    }}
                  />
                )}

                {/* Sidebar */}
                <aside className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out bg-white dark:bg-background-dark border-r border-gray-200 dark:border-white/5 flex flex-col
                  ${isMobile
                    ? (sidebarOpen ? 'w-72 translate-x-0 shadow-2xl' : '-translate-x-full w-72')
                    : (sidebarOpen ? 'w-64 translate-x-0' : 'w-20 translate-x-0')}
                `}>
                  <div className="p-6 flex items-center justify-center">
                    {empresaConfig.logo_sidebar ? (
                      <img src={empresaConfig.logo_sidebar} alt="Logo" className={`max-h-12 max-w-[160px] object-contain transition-all ${!sidebarOpen && 'scale-90 max-w-[40px]'}`} />
                    ) : (
                      <div className={`h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-neon transition-all ${!sidebarOpen && 'scale-90'}`}>
                        <span className="material-icons-round text-slate-900">medical_services</span>
                      </div>
                    )}
                  </div>

                  <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto custom-scrollbar">
                    {filteredMenu.map((item, idx) => (
                      <NavLink
                        key={idx}
                        to={item.path}
                        end={item.path === '/'}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        className={({ isActive }) => `
                          flex items-center gap-4 p-3 rounded-2xl transition-all group relative
                          ${isActive
                            ? 'bg-primary/10 text-primary shadow-inner-glow'
                            : 'text-slate-400 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary'}
                        `}>
                        <span className="material-icons-round transition-transform group-hover:scale-110">{item.icon}</span>
                        <span className={`font-medium whitespace-nowrap transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 pointer-events-none w-0 overflow-hidden'}`}>
                          {item.label}
                        </span>
                        {!sidebarOpen && !isMobile && (
                          <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity whitespace-nowrap">
                            {item.label}
                          </div>
                        )}
                      </NavLink>
                    ))}

                    {/* Admin Submenu Section */}
                    {isAdmin && (
                      <div className="pt-2">
                        <button
                          onClick={() => setAdminOpen(!adminOpen)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group relative
                            ${adminOpen ? 'text-primary' : 'text-slate-400 dark:text-gray-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5'}
                          `}
                        >
                          <div className="flex items-center gap-4">
                            <span className="material-icons-round">settings</span>
                            <span className={`font-medium whitespace-nowrap transition-opacity duration-300 ${!sidebarOpen && 'lg:opacity-0'}`}>Administración</span>
                          </div>
                          {sidebarOpen && (
                            <span className={`material-icons-round text-sm transition-transform ${adminOpen ? 'rotate-180' : ''}`}>expand_more</span>
                          )}
                        </button>

                        <div className={`overflow-hidden transition-all duration-300 ${adminOpen && sidebarOpen ? 'max-h-96 mt-1 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="ml-9 space-y-1 border-l-2 border-primary/20 pl-3">
                            <NavLink to="/admin/usuarios" className={({ isActive }) => `block p-2 text-sm rounded-xl transition-all ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-slate-400 dark:text-gray-500 hover:text-primary'}`}>Usuarios</NavLink>
                            <NavLink to="/admin/equipos" className={({ isActive }) => `block p-2 text-sm rounded-xl transition-all ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-slate-400 dark:text-gray-500 hover:text-primary'}`}>Equipos</NavLink>
                            <NavLink to="/admin/estudios" className={({ isActive }) => `block p-2 text-sm rounded-xl transition-all ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-slate-400 dark:text-gray-500 hover:text-primary'}`}>Catálogo</NavLink>
                            <NavLink to="/admin" className={({ isActive }) => `block p-2 text-sm rounded-xl transition-all ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-slate-400 dark:text-gray-500 hover:text-primary'}`}>Configuración</NavLink>
                            <NavLink to="/contabilidad" className={({ isActive }) => `block p-2 text-sm rounded-xl transition-all ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-slate-400 dark:text-gray-500 hover:text-primary'}`}>Contabilidad</NavLink>
                            <NavLink to="/campana-whatsapp" className={({ isActive }) => `block p-2 text-sm rounded-xl transition-all ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-slate-400 dark:text-gray-500 hover:text-primary'}`}>WhatsApp</NavLink>
                            <NavLink to="/descargar-app" className={({ isActive }) => `block p-2 text-sm rounded-xl transition-all ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-slate-400 dark:text-gray-500 hover:text-primary'}`}>Descargas</NavLink>
                          </div>
                        </div>
                      </div>
                    )}
                  </nav>

                  <div className="p-4 border-t border-gray-100 dark:border-white/5">
                    <button onClick={handleLogout} className="w-full flex items-center gap-4 p-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all group">
                      <span className="material-icons-round">logout</span>
                      <span className={`font-medium transition-opacity ${!sidebarOpen && 'lg:opacity-0'}`}>Sair</span>
                    </button>
                  </div>
                </aside>

                <main className={`flex-1 overflow-y-auto p-4 lg:p-8 relative transition-all duration-300
                  ${!isMobile && sidebarOpen ? 'ml-64' : (!isMobile ? 'ml-20' : 'ml-0')}
                `}>
                  <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
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
                </main>
              </div>
            </>
          )}
          <div className="fixed bottom-2 right-4 text-[10px] font-mono text-slate-400 pointer-events-none opacity-50 z-[60]">
            v1.2.0-PREMIUM
          </div>
        </div>
      </Router>
    </OfflineScreen>
  );
}


/* ── Título de la página actual ─────────────────────────── */
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
  return <span className="font-semibold text-gray-900 dark:text-white" style={{ fontSize: 16 }}>{title}</span>;
}

export default App;
