import { clsx } from 'clsx';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={clsx('relative', sizes[size], className)}>
      <div className="absolute inset-0 rounded-full border-2 border-dark-700" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-300 animate-spin" />
    </div>
  );
}

export function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div className="fixed inset-0 bg-dark-950 flex flex-col items-center justify-center gap-6 z-50">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-dark-800" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-gold-300 animate-spin" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          Finanzas Sabias
        </h2>
        <p className="text-dark-400">{message}</p>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size="lg" />
    </div>
  );
}
