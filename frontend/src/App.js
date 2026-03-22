import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import './App.css';

import { FaHeartbeat } from 'react-icons/fa';

import api from './services/api';
import Login from './components/Login';
import OfflineScreen from './components/OfflineScreen';
import PortalPaciente from './components/PortalPaciente';

const Dashboard = lazy(() => import('./components/Dashboard'));
const RegistroInteligente = lazy(() => import('./components/RegistroInteligente'));
const Facturas = lazy(() => import('./components/Facturas'));
const PortalMedico = lazy(() => import('./components/PortalMedico'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const AdminUsuarios = lazy(() => import('./components/AdminUsuarios'));
const AdminMedicos = lazy(() => import('./components/AdminMedicos'));
const GestionEstudios = lazy(() => import('./components/GestionEstudios'));
const Resultados = lazy(() => import('./components/Resultados'));
const ConsultaRapida = lazy(() => import('./components/ConsultaRapida'));
const AdminEquipos = lazy(() => import('./components/AdminEquipos'));
const Contabilidad = lazy(() => import('./components/Contabilidad'));
const DeployAgentes = lazy(() => import('./components/DeployAgentes'));
const DescargarApp = lazy(() => import('./components/DescargarApp'));
const CampanaWhatsApp = lazy(() => import('./components/CampanaWhatsApp'));
const Imagenologia = lazy(() => import('./components/Imagenologia'));
const Perfil = lazy(() => import('./components/Perfil'));

function App() {
  const [user, setUser] = useState(null);
  const [, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const [runTour, setRunTour] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState({});

  // Load empresa config (public endpoint, no auth needed)
  useEffect(() => {
    api.getEmpresaConfig()
      .then(data => {
        setEmpresaConfig(data || {});
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
    setAuthNotice('');
    // Show guided tour on first login
    const tourKey = `tour_done_${u?.email || u?.username || 'user'}`;
    if (!localStorage.getItem(tourKey)) {
      setTimeout(() => setRunTour(true), 1500);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    if (!updatedUser) return;

    setUser((prev) => {
      const nextUser = { ...(prev || {}), ...updatedUser };
      [window.localStorage, window.sessionStorage].forEach((storage) => {
        try {
          const raw = storage.getItem('user');
          if (!raw) return;
          const parsed = JSON.parse(raw);
          storage.setItem('user', JSON.stringify({ ...parsed, ...nextUser }));
        } catch (err) {
          console.error('No se pudo actualizar el usuario en sesión:', err);
        }
      });
      return nextUser;
    });
  };

  // Poll for notifications
  useEffect(() => {
    if (user && user.role === 'medico') {
      const fetchNotif = async () => {
        try {
          const res = await api.getNotificaciones();
          if (res && res.success) {
            setNotificaciones(res.data || []);
          }
        } catch (e) {
          console.error("Error fetching notifs", e);
        }
      };
      fetchNotif();
      const intervalId = setInterval(fetchNotif, 20000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    const onSessionExpired = (event) => {
      const reason = event?.detail?.reason || 'Su sesión expiró. Inicie sesión nuevamente.';
      setAuthNotice(reason);
      handleLogout();
    };

    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, []);

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
    { path: '/perfil', icon: 'badge', label: 'Mi Perfil', roles: ['admin', 'medico', 'recepcion', 'laboratorio'] },
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
        <div className={`min-h-screen flex flex-col transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-[#0b0e15] dark:text-[#f2f3fd] selection:bg-[#3df5e7]/30 selection:text-[#3df5e7] overflow-x-hidden relative font-body`}>
          
          {/* Ambient Glow Backgrounds */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${darkMode ? 'opacity-100' : 'opacity-60'}`}
              style={{
                background: darkMode
                  ? 'radial-gradient(circle at 0% 0%, rgba(61, 245, 231, 0.05) 0%, transparent 50%)'
                  : 'radial-gradient(circle at 8% 0%, rgba(0, 198, 207, 0.12) 0%, transparent 52%)'
              }}
            ></div>
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${darkMode ? 'opacity-100' : 'opacity-55'}`}
              style={{
                background: darkMode
                  ? 'radial-gradient(circle at 100% 100%, rgba(16, 79, 74, 0.2) 0%, transparent 50%)'
                  : 'radial-gradient(circle at 100% 92%, rgba(88, 119, 143, 0.18) 0%, transparent 54%)'
              }}
            ></div>
          </div>

          <PortalPacienteRoute>
            {!user ? (
              <Login onLogin={handleLogin} empresaConfig={empresaConfig} authNotice={authNotice} />
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
                  styles={{ options: { primaryColor: '#3df5e7', zIndex: 10000, backgroundColor: '#1c2029', textColor: '#f2f3fd' } }}
                />

                <div className="flex flex-1 overflow-hidden">
                  {/* Mobile overlay */}
                  {isMobile && sidebarOpen && (
                    <div
                      onClick={() => setSidebarOpen(false)}
                      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />
                  )}

                  {/* Sidebar Navigation */}
                  <aside className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col py-8 px-4 gap-y-6 transition-all duration-300 ease-in-out font-display tracking-tight
                      bg-white/80 dark:bg-[rgba(22,26,34,0.8)] backdrop-blur-[24px] border-r border-gray-200 dark:border-white/5 shadow-[20px_0px_40px_rgba(0,0,0,0.05)] dark:shadow-[20px_0px_40px_rgba(0,0,0,0.2)]
                      ${isMobile
                          ? (sidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full w-72')
                          : (sidebarOpen ? 'w-64 translate-x-0' : 'w-20 translate-x-0')}
                  `}>
                     {/* Brand Identity Section */}
                     <div className="flex items-center gap-x-3 px-2">
                       <div className={`w-10 h-10 rounded-lg bg-[#3df5e7]/10 flex items-center justify-center border border-[#3df5e7]/20 shadow-[0_0_15px_rgba(61,245,231,0.1)] transition-all flex-shrink-0 ${!sidebarOpen && !isMobile ? 'mx-auto' : ''}`}>
                          <span className="material-symbols-outlined text-[#3df5e7]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>clinical_notes</span>
                       </div>
                       {(sidebarOpen || isMobile) && (
                         <div className="flex flex-col overflow-hidden">
                           <span className="text-[#3df5e7] font-bold text-xl tracking-widest leading-none truncate">{empresaConfig.nombre || 'LUMINA'}</span>
                           <span className="text-gray-600 dark:text-[#bacac7] text-[10px] uppercase tracking-[0.2em] mt-1 opacity-70 truncate">Clinical Intelligence</span>
                         </div>
                       )}
                     </div>

                     {/* Navigation Links */}
                     <nav className="flex-1 px-1 space-y-1 py-4 overflow-y-auto custom-scrollbar flex flex-col gap-y-1 mt-4">
                        {filteredMenu.map((item, idx) => (
                          <NavLink
                              key={idx}
                              to={item.path}
                              end={item.path === '/'}
                              onClick={() => isMobile && setSidebarOpen(false)}
                              className={({ isActive }) => `
                              flex items-center gap-x-3 px-4 py-3 rounded-md transition-all duration-300 group relative
                              ${isActive
                                  ? 'bg-[#3df5e7]/10 text-[#3df5e7] font-semibold active:scale-95'
                                  : 'text-[#d6e6e3]/60 hover:text-[#d6e6e3] hover:bg-[#272c37]/50 active:scale-95'}
                              `}
                          >
                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{item.icon}</span>
                            <span className={`text-sm whitespace-nowrap transition-opacity duration-300 ${!sidebarOpen && !isMobile ? 'opacity-0 pointer-events-none w-0 overflow-hidden hidden' : 'block'}`}>
                              {item.label}
                            </span>
                            
                            {!sidebarOpen && !isMobile && (
                              <div className="absolute left-full ml-4 px-2 py-1 bg-[#272c37] border border-[#454850] text-[#f2f3fd] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity whitespace-nowrap shadow-xl">
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
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 group relative
                              ${adminOpen ? 'text-[#3df5e7]' : 'text-[#d6e6e3]/60 hover:text-[#d6e6e3] hover:bg-[#272c37]/50'}
                            `}
                            >
                              <div className="flex items-center gap-x-3">
                                <span className="material-symbols-outlined text-[20px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>admin_panel_settings</span>
                                <span className={`text-sm whitespace-nowrap transition-opacity duration-300 ${!sidebarOpen && !isMobile ? 'hidden' : 'block'}`}>Administración</span>
                              </div>
                              {(sidebarOpen || isMobile) && (
                                <span className={`material-icons-round text-sm transition-transform ${adminOpen ? 'rotate-180' : ''}`}>expand_more</span>
                              )}
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ${adminOpen && (sidebarOpen || isMobile) ? 'max-h-96 mt-1 opacity-100' : 'max-h-0 opacity-0'}`}>
                              <div className="ml-9 space-y-1 border-l border-[#3df5e7]/20 pl-3">
                                <NavLink to="/admin/usuarios" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>Usuarios</NavLink>
                                <NavLink to="/admin/medicos" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>Médicos (Horarios)</NavLink>
                                <NavLink to="/admin/equipos" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>Equipos</NavLink>
                                <NavLink to="/admin/estudios" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>Catálogo</NavLink>
                                <NavLink to="/admin" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>Configuración</NavLink>
                                <NavLink to="/contabilidad" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>Contabilidad</NavLink>
                                <NavLink to="/campana-whatsapp" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>WhatsApp</NavLink>
                                <NavLink to="/descargar-app" className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#3df5e7] font-bold bg-[#3df5e7]/5' : 'text-[#d6e6e3]/60 hover:text-[#3df5e7]'}`}>Descargas</NavLink>
                              </div>
                            </div>
                          </div>
                        )}
                     </nav>

                     {/* Bottom Navigation CTA */}
                     <div className="mt-auto px-2 border-t border-gray-200 dark:border-white/5 pt-4">
                       <button onClick={handleLogout} className="w-full bg-gray-100 dark:bg-[#32353c]/30 hover:bg-[#d7383b]/20 text-[#d7383b] font-bold py-3.5 rounded-md flex items-center justify-center gap-x-2 transition-all duration-300 active:scale-95 group">
                         <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>logout</span>
                         {(sidebarOpen || isMobile) && <span className="text-sm">Log Out</span>}
                       </button>
                     </div>
                  </aside>

                  {/* TopAppBar */}
                  <header className={`fixed top-0 right-0 h-16 bg-white/80 dark:bg-[rgba(16,19,27,0.7)] backdrop-blur-[16px] z-40 flex items-center justify-between px-4 lg:px-8 gap-x-6 border-b border-gray-200 dark:border-white/5 font-body text-sm transition-all duration-300
                    ${!isMobile ? (sidebarOpen ? 'left-64' : 'left-20') : 'left-0'}
                  `}>
                    <div className="flex items-center gap-4">
                      {isMobile ? (
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600 dark:text-[#bacac7] hover:text-[#3df5e7] p-2 transition-colors">
                          <span className="material-icons-round">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                        </button>
                      ) : (
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600 dark:text-[#bacac7] hover:text-[#3df5e7] p-2 transition-colors">
                          <span className="material-icons-round">{sidebarOpen ? 'chevron_left' : 'chevron_right'}</span>
                        </button>
                      )}
                      <h1 className="text-lg font-headline font-semibold text-[#e1e2eb] tracking-tight flex items-center gap-2">
                        <PageTitle />
                      </h1>
                    </div>

                    <div className="flex items-center gap-x-4">
                      {/* Theme Toggle Button */}
                      <button onClick={() => setDarkMode(!darkMode)} className="text-gray-500 dark:text-[#bacac7] hover:text-primary dark:hover:text-[#3df5e7] transition-colors p-2 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 bg-white dark:bg-[#161a22] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{darkMode ? 'light_mode' : 'dark_mode'}</span>
                      </button>

                      {/* Utilities - Notifications */}
                      <div className="relative">
                        <button onClick={() => setShowNotifMenu(!showNotifMenu)} className="relative text-gray-500 dark:text-[#bacac7] hover:text-primary dark:hover:text-[#3df5e7] transition-colors focus:ring-1 focus:ring-[#3df5e7]/40 p-1.5 rounded-full hidden sm:block">
                          <span className={`material-symbols-outlined text-[22px] ${notificaciones.length > 0 ? 'text-[#3df5e7]' : ''}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>notifications</span>
                          {notificaciones.length > 0 && (
                            <span className="absolute top-1 right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                        </button>

                        {/* Dropdown Menu */}
                        {showNotifMenu && (
                          <div className="absolute top-10 right-0 w-80 bg-white dark:bg-[#1d2027] border border-gray-200 dark:border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 flex justify-between items-center">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notificaciones</h3>
                              <span className="text-xs bg-[#3df5e7]/10 text-[#3df5e7] px-2 py-0.5 rounded-full font-bold">{notificaciones.length}</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                              {notificaciones.length === 0 ? (
                                <div className="p-6 text-center text-sm text-gray-500 dark:text-[#bacac7] flex flex-col items-center">
                                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_paused</span>
                                  No tienes alertas nuevas
                                </div>
                              ) : (
                                notificaciones.map(n => (
                                  <div key={n.id} className="p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group flex gap-3">
                                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.tipo === 'IMAGENES_SUBIDAS' ? 'bg-[#3df5e7]/10 text-[#3df5e7]' : 'bg-primary/10 text-primary'}`}>
                                      <span className="material-symbols-outlined text-sm">{n.tipo === 'IMAGENES_SUBIDAS' ? 'imagesmode' : 'science'}</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#3df5e7] transition-colors">{n.titulo}</p>
                                      <p className="text-xs text-gray-600 dark:text-[#bacac7] mt-1 leading-snug">{n.mensaje}</p>
                                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium">{new Date(n.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            {notificaciones.length > 0 && (
                               <div className="p-2 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                 <span className="text-xs font-bold text-[#3df5e7]">Cerrar</span>
                               </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="w-px h-6 bg-gray-300 dark:bg-[#454850]/40 mx-2 hidden sm:block"></div>

                      {/* Profile Section */}
                      <div className="flex items-center gap-x-3 group cursor-pointer" onClick={() => {/* profile nav logic if needed */}}>
                        <div className="hidden sm:flex flex-col items-end">
                          <span className="text-gray-800 dark:text-white font-semibold text-[13px] group-hover:text-primary transition-colors">{user.nombre || user.username || 'Dr. Lumina'}</span>
                          <span className="text-gray-500 dark:text-[#bacac7] text-[10px] uppercase tracking-wider opacity-60">{rol}</span>
                        </div>
                        <div className="relative">
                          <div className="w-9 h-9 rounded-lg bg-[#272c37] border border-[#454850]/50 group-hover:border-[#3df5e7]/50 transition-all flex items-center justify-center font-bold text-sm text-[#00e0d3]">
                            {(user.nombre || 'U')[0].toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#3df5e7] rounded-full border-2 border-[#10131b]"></div>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* Main Routing Area */}
                  <main className={`flex-1 relative z-10 min-h-[calc(100vh-64px)] mt-16 p-6 lg:p-8 transition-all duration-300
                      ${!isMobile && sidebarOpen ? 'ml-64' : (!isMobile ? 'ml-20' : 'ml-0')}
                  `}>
                    <Suspense fallback={<RouteLoader />}>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Navigate to="/" />} />
                        <Route path="/registro" element={<RegistroInteligente />} />
                        <Route path="/consulta" element={<ConsultaRapida />} />
                        <Route path="/facturas" element={<Facturas />} />
                        <Route path="/medico" element={<PortalMedico />} />
                        <Route path="/perfil" element={<Perfil user={user} onUserUpdate={handleUserUpdate} />} />
                        <Route path="/admin" element={<AdminPanel />} />
                        <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                        <Route path="/admin/medicos" element={<AdminMedicos />} />
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
                    </Suspense>
                  </main>
                </div>
              </>
            )}
            <div className="fixed bottom-2 right-4 text-[10px] font-mono text-slate-500 pointer-events-none opacity-50 z-[60]">
              OS v1.2.0 • Obsidian Pulse
            </div>
          </PortalPacienteRoute>
        </div>
      </Router>
    </OfflineScreen>
  );
}

function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
        <FaHeartbeat className="text-5xl text-primary relative animate-pulse" />
      </div>
    </div>
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
    '/perfil': 'Mi Perfil',
    '/resultados': 'Resultados',
    '/imagenologia': 'Imagenología',
    '/admin': 'Personalización',
    '/admin/usuarios': 'Usuarios',
    '/admin/medicos': 'Médicos y Productividad',
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

/* ── Ruta pública para Portal Paciente (accesible sin login de empleado) ── */
function PortalPacienteRoute({ children }) {
  const loc = useLocation();
  if (loc.pathname === '/mis-resultados') {
    return <PortalPaciente />;
  }
  return children;
}

export default App;
