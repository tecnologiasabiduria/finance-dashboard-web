import { clsx } from 'clsx';

const variants = {
  primary: 'bg-gradient-to-r from-gold-500 to-gold-400 text-dark-950 hover:from-gold-400 hover:to-gold-300 focus:ring-gold-400/50',
  secondary: 'bg-transparent border border-gold-400 text-gold-400 hover:bg-gold-400/10 focus:ring-gold-400/50',
  ghost: 'bg-transparent text-gold-400 hover:bg-gold-400/10 focus:ring-gold-400/50',
  danger: 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30 focus:ring-red-500/50',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-lg',
        'focus:outline-none focus:ring-2',
        'transition-all duration-300 transform',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        !disabled && 'hover:scale-[1.02]',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon className="h-5 w-5" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="h-5 w-5" />}
    </button>
  );
}
