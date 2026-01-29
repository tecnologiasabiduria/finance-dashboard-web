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
        'bg-dark-900 border border-dark-800 rounded-xl p-6',
        'transition-all duration-300',
        hover && 'hover:border-gold-400/30',
        glow && 'shadow-gold',
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
    default: 'border-dark-800 hover:border-gold-400/30',
    gold: 'border-gold-400/30 bg-gradient-to-br from-gold-400/10 to-transparent',
    success: 'border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 to-transparent',
    danger: 'border-red-400/30 bg-gradient-to-br from-red-400/10 to-transparent',
  };

  const iconVariants = {
    default: 'bg-gold-400/10 text-gold-400',
    gold: 'bg-gold-400/20 text-gold-400',
    success: 'bg-emerald-400/20 text-emerald-400',
    danger: 'bg-red-400/20 text-red-400',
  };

  return (
    <div
      className={clsx(
        'bg-dark-900/50 border rounded-xl p-5',
        'transition-all duration-300 hover:bg-dark-900/80',
        'group',
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm text-dark-400 font-medium">{title}</p>
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
