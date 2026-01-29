import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  {
    label,
    error,
    options = [],
    placeholder = 'Seleccionar...',
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  return (
    <div className={clsx('space-y-2', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-dark-200">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 bg-dark-900 border rounded-lg appearance-none',
            'text-white',
            'focus:outline-none focus:ring-2 transition-all duration-300',
            'cursor-pointer',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-dark-700 focus:border-gold-400 focus:ring-gold-400/20',
            className
          )}
          {...props}
        >
          <option value="" className="bg-dark-900 text-dark-400">
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-dark-900 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400 pointer-events-none" />
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
