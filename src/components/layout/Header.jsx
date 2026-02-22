import { useState, useRef, useEffect, useCallback } from 'react';
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
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  Megaphone,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const TYPE_CONFIG = {
  info:    { icon: Info,           color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  warning: { icon: AlertTriangle,  color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  promo:   { icon: Megaphone,      color: 'text-gold-400',   bg: 'bg-gold-400/10' },
  update:  { icon: RefreshCw,      color: 'text-green-400',  bg: 'bg-green-400/10' },
  alert:   { icon: ShieldAlert,    color: 'text-red-400',    bg: 'bg-red-400/10' },
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function Header({ onMenuClick, showMenuButton }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count on mount + every 30 seconds
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.getUnreadNotificationCount();
      setUnreadCount(res.data?.count ?? 0);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const res = await api.getNotifications(30);
      setNotifications(res.data || []);
      // Refresh count
      fetchUnreadCount();
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  }, [fetchUnreadCount]);

  const handleToggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) fetchNotifications();
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  return (
    <header className="h-16 sm:h-20 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800 sticky top-0 z-30">
      <div className="h-full px-3 sm:px-6 flex items-center justify-between">
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
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleToggleNotifications}
              className="relative p-3 text-dark-400 hover:text-white hover:bg-dark-800 rounded-xl transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-gold-400 text-dark-950 rounded-full leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-[4.5rem] sm:top-auto mt-0 sm:mt-2 sm:w-96 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl animate-slide-up overflow-hidden z-50">
                {/* Header */}
                <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Marcar todo leído
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {loadingNotifs ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-5 w-5 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="h-8 w-8 text-dark-600 mx-auto mb-2" />
                      <p className="text-sm text-dark-400">
                        No tienes notificaciones
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={notif.id}
                          className={clsx(
                            'flex items-start gap-3 px-4 py-3 border-b border-dark-800/50 hover:bg-dark-800/50 transition-colors cursor-pointer',
                            !notif.read && 'bg-dark-800/30'
                          )}
                          onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                        >
                          <div
                            className={clsx(
                              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
                              cfg.bg
                            )}
                          >
                            <Icon className={clsx('h-4 w-4', cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={clsx(
                                  'text-sm font-medium truncate',
                                  notif.read ? 'text-dark-400' : 'text-white'
                                )}
                              >
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-gold-400" />
                              )}
                            </div>
                            {notif.message && (
                              <p className="text-xs text-dark-500 mt-0.5 line-clamp-2">
                                {notif.message}
                              </p>
                            )}
                            <p className="text-[11px] text-dark-600 mt-1">
                              {timeAgo(notif.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
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
