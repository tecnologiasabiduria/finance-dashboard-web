import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Header({ onMenuClick, showMenuButton }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800 sticky top-0 z-30">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}

          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
              <input
                type="text"
                placeholder="Buscar transacciones..."
                className="w-80 pl-12 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl
                         text-white placeholder-dark-500 text-sm
                         focus:outline-none focus:border-gold-400/50 focus:ring-2 focus:ring-gold-400/20
                         transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 text-dark-400 hover:text-white hover:bg-dark-800 rounded-xl transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-gold-400 rounded-full" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl animate-slide-up">
                <div className="p-4 border-b border-dark-800">
                  <h3 className="font-semibold text-white">Notificaciones</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-dark-400 text-center py-4">
                    No tienes notificaciones nuevas
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 pr-4 hover:bg-dark-800 rounded-xl transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <span className="font-semibold text-dark-950">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">
                  {user?.name || 'Usuario'}
                </p>
                <p className="text-xs text-dark-400">
                  {user?.email || 'usuario@email.com'}
                </p>
              </div>
              <ChevronDown
                className={clsx(
                  'h-4 w-4 text-dark-400 transition-transform duration-200',
                  showUserMenu && 'rotate-180'
                )}
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl animate-slide-up overflow-hidden">
                <div className="p-2">
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-dark-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Configuración</span>
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
