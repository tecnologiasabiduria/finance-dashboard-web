import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ArrowLeftRight,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wallet,
  X,
  BookOpen,
  Target,
} from 'lucide-react';
import { Logo } from './Logo';
import { useSettings } from '../../context/SettingsContext';

const navigation = [
  {
    name: 'Transacciones',
    href: '/transactions',
    icon: ArrowLeftRight,
    tourId: 'nav-transactions',
    description: 'Historial de ingresos y gastos',
  },
  {
    name: 'Cuentas',
    href: '/accounts',
    icon: Wallet,
    tourId: 'nav-accounts',
    description: 'Cuentas bancarias y efectivo',
  },
  {
    name: 'Informes',
    href: '/reports',
    icon: BarChart3,
    tourId: 'nav-reports',
    description: 'Reportes mensuales y anuales',
  },
  {
    name: 'Cartera',
    href: '/cartera',
    icon: BookOpen,
    tourId: 'nav-cartera',
    description: 'Cuentas por cobrar',
  },
  {
    name: 'Presupuesto',
    href: '/goals',
    icon: Target,
    tourId: 'nav-goals',
    description: 'Presupuesto y bolsillos',
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
    tourId: 'nav-settings',
    description: 'Personaliza tu experiencia',
  },
];

export function Sidebar({ collapsed, onToggle, mobile, onNavigate }) {
  const location = useLocation();
  const { theme } = useSettings();
  const isBeige = theme === 'sand-beige';

  return (
    <aside
      className={clsx(
        isBeige
          ? 'sidebar-beige bg-gold-100 border-r border-gold-400/50'
          : 'bg-gradient-to-b from-dark-900 via-dark-900 to-dark-950 border-r border-gold-700/15',
        'flex flex-col transition-all duration-300',
        mobile
          ? 'h-full w-64'
          : 'fixed left-0 top-0 h-screen z-40',
        !mobile && (collapsed ? 'w-20' : 'w-64')
      )}
    >
      {/* Logo + Close on mobile */}
      <div className={clsx(
        'h-20 flex items-center justify-between px-4',
        isBeige
          ? 'border-b border-gold-400/40 bg-gradient-to-b from-gold-300/50 to-transparent'
          : 'border-b border-gold-700/20 bg-gradient-to-br from-gold-700/15 via-gold-400/5 to-transparent'
      )}>
        <Logo size="md" showText={!collapsed} />
        {mobile && (
          <button
            onClick={onToggle}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isBeige
                ? 'text-[#7e301f] hover:text-[#261c21] hover:bg-gold-200'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav data-tour="sidebar-nav" className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {navigation.map((item, index) => {
          const isActive = location.pathname === item.href ||
                          location.pathname.startsWith(item.href.split('?')[0]);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => onNavigate?.()}
              data-menu-item
              data-nav-active={isActive ? 'true' : undefined}
              data-tour={item.tourId}
              style={mobile ? { opacity: 0 } : undefined}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'transition-all duration-200 group',
                isBeige
                  ? isActive
                    ? 'bg-gold-700/15 text-[#7e301f] border-l-2 border-gold-700 font-semibold'
                    : 'text-[#4d3f38] hover:text-[#7e301f] hover:bg-gold-200/70'
                  : isActive
                    ? 'bg-gradient-to-r from-gold-400/15 via-gold-400/8 to-transparent text-gold-300 border-l-[3px] border-gold-400 shadow-[inset_0_0_20px_rgba(218,125,65,0.06)]'
                    : 'text-dark-300 hover:text-gold-300 hover:bg-dark-800/40'
              )}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                  'group-hover:scale-110',
                  isBeige
                    ? isActive ? 'text-[#7e301f]' : 'text-[#6b5a50]'
                    : isActive ? 'text-gold-300' : ''
                )}
              />
              {!collapsed && (
                <span className="font-medium truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle - only on desktop */}
      {!mobile && (
        <div className={clsx(
          'p-4 border-t',
          isBeige ? 'border-gold-400/40' : 'border-gold-700/12'
        )}>
          <button
            onClick={onToggle}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-4 py-3',
              'rounded-xl transition-all duration-200',
              isBeige
                ? 'text-[#6b5a50] hover:text-[#261c21] hover:bg-gold-200/70'
                : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">Colapsar</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
