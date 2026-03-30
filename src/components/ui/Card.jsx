import { clsx } from 'clsx';

export function Card({
  children,
  className = '',
  hover = true,
  glow = false,
  ...props
}) {
  return (
    <div
      className={clsx(
        'bg-dark-900 border border-white/[0.06] rounded-2xl p-6',
        'shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
        'transition-all duration-300',
        hover && 'hover:border-gold-400/20 hover:shadow-[0_4px_16px_rgba(218,125,65,0.06)]',
        glow && 'shadow-gold border-gold-400/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  className = '',
}) {
  const variants = {
    default: 'border-dark-700/40 hover:border-gold-400/25 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_0_1px_rgba(218,125,65,0.06)]',
    gold: 'border-gold-400/25 bg-gradient-to-br from-gold-400/8 via-transparent to-transparent shadow-[0_2px_12px_rgba(218,125,65,0.1)]',
    success: 'border-emerald-400/20 bg-gradient-to-br from-emerald-400/6 via-transparent to-transparent',
    danger: 'border-red-400/20 bg-gradient-to-br from-red-400/6 via-transparent to-transparent',
  };

  const iconVariants = {
    default: 'bg-gold-400/15 text-gold-300',
    gold: 'bg-gold-400/25 text-gold-300',
    success: 'bg-emerald-400/20 text-emerald-400',
    danger: 'bg-red-400/20 text-red-400',
  };

  return (
    <div
      className={clsx(
        'bg-dark-900 border rounded-2xl p-5',
        'transition-all duration-300 hover:bg-dark-800/70',
        'group',
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm text-dark-300 font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-dark-400">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={clsx(
                  'text-sm font-medium',
                  trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
              <span className="text-xs text-dark-500">vs mes anterior</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={clsx(
              'p-3 rounded-lg transition-transform duration-300 group-hover:scale-110',
              iconVariants[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
