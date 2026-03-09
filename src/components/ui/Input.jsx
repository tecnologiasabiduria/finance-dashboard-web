import { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    icon: Icon,
    type = 'text',
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={clsx('space-y-2', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-dark-200">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          className={clsx(
            'w-full px-4 py-3 bg-dark-900 border rounded-lg',
            'text-white placeholder-dark-400',
            'focus:outline-none focus:ring-2 transition-all duration-300',
            Icon && 'pl-12',
            isPassword && 'pr-12',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-dark-700 focus:border-gold-400 focus:ring-gold-400/20',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-gold-300 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
          {error}
        </p>
      )}
    </div>
  );
});
