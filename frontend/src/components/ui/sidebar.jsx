import React from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

function MenuLink({ item, isMobile, sidebarOpen, darkMode, onClick }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-x-3 px-4 py-3 rounded-md transition-all duration-200 group relative',
          isActive
            ? 'bg-[#3df5e7]/15 text-[#008f98] dark:text-[#3df5e7] font-semibold'
            : darkMode
              ? 'text-[#d6e6e3]/65 hover:text-[#d6e6e3] hover:bg-[#272c37]/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
        )
      }
    >
      <span
        className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 flex-shrink-0"
        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        {item.icon}
      </span>
      <motion.span
        animate={{
          opacity: sidebarOpen || isMobile ? 1 : 0,
          width: sidebarOpen || isMobile ? 'auto' : 0,
          display: sidebarOpen || isMobile ? 'inline-block' : 'none',
        }}
        transition={{ duration: 0.18 }}
        className="text-sm whitespace-nowrap overflow-hidden"
      >
        {item.label}
      </motion.span>

      {!sidebarOpen && !isMobile && (
        <div className={cn(
          'absolute left-full ml-4 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity whitespace-nowrap shadow-xl',
          darkMode
            ? 'bg-[#272c37] border border-[#454850] text-[#f2f3fd]'
            : 'bg-slate-100 border border-slate-300 text-slate-800'
        )}>
          {item.label}
        </div>
      )}
    </NavLink>
  );
}

function AdminSection({
  isAdmin,
  adminOpen,
  setAdminOpen,
  isMobile,
  sidebarOpen,
  darkMode,
  closeMobile,
}) {
  if (!isAdmin) return null;

  return (
    <div className="pt-2">
      <button
        onClick={() => setAdminOpen(!adminOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-200 group relative',
          adminOpen
            ? 'text-[#008f98] dark:text-[#3df5e7] bg-[#3df5e7]/10'
            : darkMode
              ? 'text-[#d6e6e3]/65 hover:text-[#d6e6e3] hover:bg-[#272c37]/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
        )}
      >
        <div className="flex items-center gap-x-3">
          <span
            className="material-symbols-outlined text-[20px] flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            admin_panel_settings
          </span>
          {(sidebarOpen || isMobile) && <span className="text-sm whitespace-nowrap">Administracion</span>}
        </div>
        {(sidebarOpen || isMobile) && (
          <ChevronDown className={cn('h-4 w-4 transition-transform', adminOpen ? 'rotate-180' : 'rotate-0')} />
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          adminOpen && (sidebarOpen || isMobile) ? 'max-h-96 mt-1 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="ml-9 space-y-1 border-l border-[#3df5e7]/20 pl-3">
          <NavLink to="/admin/usuarios" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>Usuarios</NavLink>
          <NavLink to="/admin/medicos" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>Medicos (Horarios)</NavLink>
          <NavLink to="/admin/equipos" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>Equipos</NavLink>
          <NavLink to="/admin/estudios" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>Catalogo</NavLink>
          <NavLink to="/admin" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>Configuracion</NavLink>
          <NavLink to="/contabilidad" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>Contabilidad</NavLink>
          <NavLink to="/campana-whatsapp" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>WhatsApp</NavLink>
          <NavLink to="/descargar-app" onClick={closeMobile} className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-all ${isActive ? 'text-[#008f98] dark:text-[#3df5e7] font-bold bg-[#3df5e7]/10' : (darkMode ? 'text-[#d6e6e3]/60 hover:text-[#3df5e7]' : 'text-slate-600 hover:text-[#008f98]')}`}>Descargas</NavLink>
        </div>
      </div>
    </div>
  );
}

export default function AppSidebar({
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  darkMode,
  filteredMenu,
  isAdmin,
  adminOpen,
  setAdminOpen,
  empresaConfig,
  handleLogout,
}) {
  const closeMobile = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const sidebarBase =
    'fixed top-0 bottom-0 left-0 z-50 flex flex-col py-6 px-4 gap-y-4 font-display tracking-tight ' +
    'bg-white/80 dark:bg-[rgba(22,26,34,0.85)] backdrop-blur-[24px] border-r border-gray-200 dark:border-white/5 ' +
    'shadow-[20px_0px_40px_rgba(0,0,0,0.05)] dark:shadow-[20px_0px_40px_rgba(0,0,0,0.2)]';

  return (
    <>
      {isMobile && (
        <div className="fixed top-3 left-3 z-[60] md:hidden">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="h-10 w-10 rounded-xl bg-white/85 dark:bg-[#151922]/90 border border-gray-200 dark:border-white/10 shadow-lg flex items-center justify-center"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(sidebarBase, isMobile ? 'w-72' : 'w-[64px]')}
        animate={
          isMobile
            ? { x: sidebarOpen ? 0 : -320 }
            : { width: sidebarOpen ? 260 : 80, x: 0 }
        }
        transition={{ duration: 0.24, ease: 'easeInOut' }}
        onMouseEnter={() => {
          if (!isMobile) setSidebarOpen(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) setSidebarOpen(false);
        }}
      >
        {isMobile && (
          <div className="absolute right-4 top-4">
            <button
              onClick={closeMobile}
              className="h-8 w-8 rounded-md border border-gray-300/70 dark:border-white/10 flex items-center justify-center"
              aria-label="Cerrar menu"
            >
              <X className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-x-3 px-2 min-h-12">
          <div className={cn(
            'w-10 h-10 rounded-xl bg-[#3df5e7]/10 flex items-center justify-center border border-[#3df5e7]/20 shadow-[0_0_15px_rgba(61,245,231,0.1)] transition-all flex-shrink-0',
            !sidebarOpen && !isMobile ? 'mx-auto' : ''
          )}>
            <span
              className="material-symbols-outlined text-[#3df5e7]"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              clinical_notes
            </span>
          </div>
          {(sidebarOpen || isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col overflow-hidden"
            >
              <span className="text-[#3df5e7] font-bold text-xl tracking-widest leading-none truncate">
                {empresaConfig.nombre || 'LUMINA'}
              </span>
              <span className="text-gray-600 dark:text-[#bacac7] text-[10px] uppercase tracking-[0.2em] mt-1 opacity-70 truncate">
                Clinical Intelligence
              </span>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 px-1 py-4 overflow-y-auto custom-scrollbar flex flex-col gap-y-1 mt-2">
          {filteredMenu.map((item) => (
            <MenuLink
              key={item.path}
              item={item}
              isMobile={isMobile}
              sidebarOpen={sidebarOpen}
              darkMode={darkMode}
              onClick={closeMobile}
            />
          ))}

          <AdminSection
            isAdmin={isAdmin}
            adminOpen={adminOpen}
            setAdminOpen={setAdminOpen}
            isMobile={isMobile}
            sidebarOpen={sidebarOpen}
            darkMode={darkMode}
            closeMobile={closeMobile}
          />
        </nav>

        <div className="mt-auto px-2 border-t border-gray-200 dark:border-white/5 pt-4">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 dark:bg-[#32353c]/30 hover:bg-[#d7383b]/20 text-[#d7383b] font-bold py-3 rounded-md flex items-center justify-center gap-x-2 transition-all duration-200"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              logout
            </span>
            {(sidebarOpen || isMobile) && <span className="text-sm">Log Out</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
