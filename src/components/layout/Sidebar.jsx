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
  TrendingUp,
  TrendingDown,
  Target,
  Tag,
} from 'lucide-react';
import { Logo } from './Logo';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Transacciones',
    href: '/transactions',
    icon: ArrowLeftRight,
  },
  {
    name: 'Nuevo Ingreso',
    href: '/transactions/new?type=income',
    icon: TrendingUp,
  },
  {
    name: 'Nuevo Gasto',
    href: '/transactions/new?type=expense',
    icon: TrendingDown,
  },
  {
    name: 'Metas',
    href: '/goals',
    icon: Target,
  },
  {
    name: 'Categorías',
    href: '/categories',
    icon: Tag,
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-dark-950 border-r border-dark-800',
        'flex flex-col transition-all duration-300 z-40',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-20 flex items-center justify-center border-b border-dark-800 px-4">
        <Logo size="md" showText={!collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                          location.pathname.startsWith(item.href.split('?')[0]);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-gold-400/20 to-transparent text-gold-400 border-l-2 border-gold-400'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
              )}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                  'group-hover:scale-110',
                  isActive && 'text-gold-400'
                )}
              />
              {!collapsed && (
                <span className="font-medium truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
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
    </aside>
  );
}
