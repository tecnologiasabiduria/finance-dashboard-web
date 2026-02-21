import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, CheckCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { LoadingScreen } from '../components/ui/Spinner';
import { Logo } from '../components/layout/Logo';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.error('No active session for reset-password:', error);
          navigate('/login', { replace: true });
          return;
        }

        setUserEmail(session.user.email);
      } catch (err) {
        console.error('Session check error:', err);
        navigate('/login', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        setErrors({ general: updateError.message });
        setLoading(false);
        return;
      }

      setSuccess(true);

      try {
        await login(userEmail, password);
      } catch (loginErr) {
        console.error('Auto-login after password reset failed:', loginErr);
      }

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setErrors({ general: err.message || 'Error al restablecer la contraseña' });
      setLoading(false);
    }
  };

  if (checking) {
    return <LoadingScreen message="Verificando tu sesión..." />;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-slide-up">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            ¡Contraseña restablecida!
          </h2>

          <p className="text-dark-400 mb-2">
            Tu contraseña ha sido actualizada exitosamente.
          </p>

          <p className="text-dark-500 text-sm">
            Redirigiendo a tu panel de control...
          </p>

          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-400/10 border border-gold-400/20 rounded-full mb-6">
              <ShieldCheck className="h-4 w-4 text-gold-400" />
              <span className="text-sm text-gold-400 font-medium">
                Restablecer contraseña
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              Nueva contraseña
            </h1>

            <p className="text-dark-400 text-lg">
              Hola <span className="text-gold-400 font-medium">{userEmail}</span>,
              ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}

            <Input
              label="Nueva contraseña"
              type="password"
              icon={Lock}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
              autoComplete="new-password"
              autoFocus
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              icon={Lock}
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <div className="space-y-2">
              <p className="text-xs text-dark-500 font-medium">Tu contraseña debe tener:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Al menos 8 caracteres', valid: password.length >= 8 },
                  { label: 'Una letra mayúscula', valid: /[A-Z]/.test(password) },
                  { label: 'Una letra minúscula', valid: /[a-z]/.test(password) },
                  { label: 'Un número', valid: /[0-9]/.test(password) },
                ].map((hint) => (
                  <div key={hint.label} className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        hint.valid ? 'bg-emerald-400' : 'bg-dark-600'
                      }`}
                    />
                    <span
                      className={`text-xs transition-colors ${
                        hint.valid ? 'text-emerald-400' : 'text-dark-500'
                      }`}
                    >
                      {hint.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
            >
              Restablecer contraseña
            </Button>
          </form>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-dark-900 to-dark-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 right-20 w-72 h-72 bg-gold-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center p-16 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-400/10 border border-gold-400/20 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-gold-400" />
              <span className="text-sm text-gold-400 font-medium">
                Casi listo
              </span>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-serif font-bold text-white mb-6 leading-tight">
            Crea una contraseña{' '}
            <span className="text-gradient-gold">segura</span>
          </h2>

          <p className="text-lg text-dark-300 max-w-md mb-10">
            Elige una contraseña fuerte para mantener tu cuenta
            y tus datos financieros protegidos.
          </p>

          <div className="space-y-4 text-left max-w-sm w-full">
            {[
              { step: '1', label: 'Solicitud enviada', done: true },
              { step: '2', label: 'Email verificado', done: true },
              { step: '3', label: 'Nueva contraseña', done: false, active: true },
              { step: '4', label: 'Acceder al dashboard', done: false },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    item.done
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : item.active
                      ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-dark-950'
                      : 'bg-dark-800 text-dark-500'
                  }`}
                >
                  {item.done ? '✓' : item.step}
                </div>
                <span
                  className={`text-sm ${
                    item.done
                      ? 'text-emerald-400 line-through'
                      : item.active
                      ? 'text-white font-medium'
                      : 'text-dark-500'
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
