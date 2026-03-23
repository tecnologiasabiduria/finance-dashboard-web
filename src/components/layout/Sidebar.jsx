import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Target,
  Tag,
  BarChart3,
  Wallet,
  X,
  Upload,
  BookOpen,
} from 'lucide-react';
import { Logo } from './Logo';
import { useSettings } from '../../context/SettingsContext';

const navigation = [
  {
    name: 'Categorías',
    href: '/categories',
    icon: Tag,
  },
  {
    name: 'Nuevo Registro',
    href: '/transactions/new',
    icon: PlusCircle,
  },
  {
    name: 'Importar CSV',
    href: '/transactions/import',
    icon: Upload,
  },
  {
    name: 'Transacciones',
    href: '/transactions',
    icon: ArrowLeftRight,
  },
  {
    name: 'Informe Mensual',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Informe Anual',
    href: '/annual-report',
    icon: BarChart3,
  },
  {
    name: 'Metas',
    href: '/goals',
    icon: Wallet,
  },
  {
    name: 'Cartera',
    href: '/cartera',
    icon: BookOpen,
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({ collapsed, onToggle, mobile, onNavigate }) {
  const location = useLocation();
  const { sidebarStyle } = useSettings();
  const isBeige = sidebarStyle === 'beige';

  return (
    <aside
      className={clsx(
        isBeige
          ? 'sidebar-beige bg-gold-100 border-r border-gold-400/50'
          : 'bg-dark-900 border-r border-gold-700/20',
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
          : 'border-b border-gold-700/40 bg-gradient-to-br from-gold-700/25 via-gold-700/10 to-transparent'
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
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
                          location.pathname.startsWith(item.href.split('?')[0]);
          const Icon = item.icon;
          const tourId = item.href === '/transactions/new' ? 'sidebar-new' : undefined;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => onNavigate?.()}
              {...(tourId && { 'data-tour': tourId })}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'transition-all duration-200 group',
                isBeige
                  ? isActive
                    ? 'bg-gold-700/15 text-[#7e301f] border-l-2 border-gold-700 font-semibold'
                    : 'text-[#4d3f38] hover:text-[#7e301f] hover:bg-gold-200/70'
                  : isActive
                    ? 'bg-gradient-to-r from-gold-400/30 to-transparent text-gold-300 border-l-2 border-gold-400'
                    : 'text-dark-300 hover:text-gold-300 hover:bg-dark-800/60'
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
          isBeige ? 'border-gold-400/40' : 'border-gold-700/20'
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
