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

  return (
    <aside
      className={clsx(
        'bg-dark-950 border-r border-dark-800',
        'flex flex-col transition-all duration-300',
        mobile
          ? 'h-full w-64'
          : 'fixed left-0 top-0 h-screen z-40',
        !mobile && (collapsed ? 'w-20' : 'w-64')
      )}
    >
      {/* Logo + Close on mobile */}
      <div className="h-20 flex items-center justify-between border-b border-dark-800 px-4">
        <Logo size="md" showText={!collapsed} />
        {mobile && (
          <button
            onClick={onToggle}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
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
                isActive
                  ? 'bg-gradient-to-r from-gold-400/20 to-transparent text-gold-300 border-l-2 border-gold-400'
                  : 'text-dark-400 hover:text-gold-300 hover:bg-dark-800/50'
              )}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                  'group-hover:scale-110',
                  isActive && 'text-gold-300'
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
        <div className="p-4 border-t border-dark-800">
          <button
            onClick={onToggle}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-4 py-3',
              'text-dark-400 hover:text-white hover:bg-dark-800/50',
              'rounded-xl transition-all duration-200'
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
