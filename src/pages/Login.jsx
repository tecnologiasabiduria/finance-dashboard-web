import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/layout/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 401) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else if (err.status === 403) {
        // TODO: Suscripción se maneja externamente (GHL/Stripe)
        // Por ahora permitir acceso
        setError('Acceso denegado. Contacta soporte.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Error de conexión. Verifica que el servidor esté activo.');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-12">
            <Logo size="lg" />
          </div>

          {/* Welcome Text */}
          <div className="mb-10">
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-3">
              Bienvenido de nuevo
            </h1>
            <p className="text-dark-400 text-lg">
              Ingresa tus credenciales para acceder a tu panel de control financiero
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Input
              label="Correo electrónico"
              type="email"
              icon={Mail}
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-dark-600 bg-dark-900 text-gold-400 focus:ring-gold-400/50"
                />
                <span className="text-sm text-dark-400">Recordarme</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-gold-400 hover:text-gold-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-dark-400">
            ¿No tienes una cuenta?{' '}
            <Link
              to="/register"
              className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
            >
              Regístrate aquí
            </Link>
          </p>


        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-gold-700 via-gold-500 to-gold-400 relative overflow-hidden">
        {/* Decorative light overlays */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gold-300/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-16 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 border border-white/30 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm text-white font-medium">
                Inteligencia Financiera
              </span>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-serif font-bold text-white mb-6 leading-tight">
            Toma el control de{' '}
            <span className="text-dark-950/80">tus finanzas</span>
          </h2>

          <p className="text-lg text-white/80 max-w-md mb-10">
            Visualiza tus ingresos y gastos, analiza tendencias y toma decisiones
            financieras más inteligentes con nuestra plataforma.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            {[
              'Dashboard intuitivo',
              'Análisis en tiempo real',
              'Reportes detallados',
              'Alertas inteligentes',
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-white/80"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating cards decoration */}
        <div className="absolute bottom-32 right-16 animate-float">
          <div className="w-64 h-40 bg-dark-950/85 backdrop-blur-lg border border-dark-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-dark-400">Balance Total</span>
              <span className="text-xs text-emerald-400">+12.5%</span>
            </div>
            <p className="text-2xl font-bold text-white">$24,850.00</p>
            <div className="mt-4 h-12 flex items-end gap-1">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-gold-700/50 to-gold-400 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
