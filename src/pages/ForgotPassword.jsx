import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle, Sparkles } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/layout/Logo';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      if (err.code === 'RATE_LIMIT') {
        setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Error de conexión. Verifica que el servidor esté activo.');
      } else {
        setError(err.message || 'Error al enviar el email de recuperación');
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-dark-950 flex">
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-12">
              <Logo size="lg" />
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>

              <h1 className="text-3xl font-bold text-white mb-3">
                Revisa tu correo
              </h1>

              <p className="text-dark-400 text-lg mb-2">
                Hemos enviado un enlace de recuperación a
              </p>

              <p className="text-gold-400 font-medium text-lg mb-8">
                {email}
              </p>

              <div className="p-4 bg-dark-900 border border-dark-700 rounded-xl mb-8">
                <p className="text-dark-300 text-sm">
                  Haz clic en el enlace del correo para restablecer tu contraseña.
                  Si no lo ves, revisa tu carpeta de spam.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                  }}
                >
                  Enviar de nuevo
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm text-dark-400 hover:text-gold-400 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Decorative */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-dark-900 to-dark-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 right-20 w-72 h-72 bg-gold-400/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center p-16 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-400/10 border border-gold-400/20 rounded-full mb-6">
                <Mail className="h-4 w-4 text-gold-400" />
                <span className="text-sm text-gold-400 font-medium">
                  Correo enviado
                </span>
              </div>
            </div>

            <h2 className="text-4xl xl:text-5xl font-serif font-bold text-white mb-6 leading-tight">
              Revisa tu{' '}
              <span className="text-gradient-gold">bandeja de entrada</span>
            </h2>

            <p className="text-lg text-dark-300 max-w-md">
              El enlace de recuperación expira en 1 hora. Si no recibiste el correo,
              puedes reenviarlo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-12">
            <Logo size="lg" />
          </div>

          <div className="mb-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-gold-400 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al login
            </Link>

            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              ¿Olvidaste tu contraseña?
            </h1>

            <p className="text-dark-400 text-lg">
              No te preocupes. Ingresa tu correo electrónico y te enviaremos un
              enlace para restablecer tu contraseña.
            </p>
          </div>

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
              autoFocus
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              icon={Send}
              iconPosition="right"
            >
              Enviar enlace de recuperación
            </Button>
          </form>

          <p className="mt-8 text-center text-dark-400">
            ¿Recordaste tu contraseña?{' '}
            <Link
              to="/login"
              className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-dark-900 to-dark-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 right-20 w-72 h-72 bg-gold-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center p-16 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-400/10 border border-gold-400/20 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-gold-400" />
              <span className="text-sm text-gold-400 font-medium">
                Recuperación de cuenta
              </span>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-serif font-bold text-white mb-6 leading-tight">
            Recupera el acceso a{' '}
            <span className="text-gradient-gold">tu cuenta</span>
          </h2>

          <p className="text-lg text-dark-300 max-w-md mb-10">
            Te enviaremos un enlace seguro a tu correo para que puedas
            crear una nueva contraseña.
          </p>

          <div className="grid grid-cols-1 gap-4 max-w-sm w-full">
            {[
              { step: '1', label: 'Ingresa tu correo electrónico', active: true },
              { step: '2', label: 'Revisa tu bandeja de entrada', active: false },
              { step: '3', label: 'Crea una nueva contraseña', active: false },
              { step: '4', label: 'Accede a tu cuenta', active: false },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    item.active
                      ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-dark-950'
                      : 'bg-dark-800 text-dark-500'
                  }`}
                >
                  {item.step}
                </div>
                <span
                  className={`text-sm ${
                    item.active ? 'text-white font-medium' : 'text-dark-500'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
