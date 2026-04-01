import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/layout/Logo';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      
      // Si el backend indica que requiere confirmación de email
      if (result?.requiresEmailConfirmation) {
        setEmailSent(true);
      } else {
        // TODO: Cuando se implemente suscripción externa, evaluar si redirigir a /subscription-required
        // Por ahora, ir directo al login para que inicie sesión
        navigate('/login');
      }
    } catch (err) {
      if (err.status === 400) {
        setErrors({ email: err.message || 'El email ya está registrado' });
      } else {
        setErrors({ general: err.message || 'Error al registrar' });
      }
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    'Control total de tus finanzas',
    'Reportes y análisis detallados',
    'Alertas personalizadas',
    'Acceso desde cualquier dispositivo',
    'Soporte prioritario',
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-gold-700 via-gold-500 to-gold-400 relative overflow-hidden">
        {/* Decorative light overlays */}
        <div className="absolute inset-0">
          <div className="absolute top-40 left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-20 w-64 h-64 bg-gold-300/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-16">
          <h2 className="text-4xl xl:text-5xl font-serif font-bold text-white mb-6 leading-tight">
            Únete a la{' '}
            <span className="text-dark-950/80">revolución financiera</span>
          </h2>

          <p className="text-lg text-white/80 mb-10 max-w-md">
            Miles de empresarios ya confían en Finanzas Sabias para
            gestionar sus finanzas de manera inteligente.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8">
            {[
              { value: '10K+', label: 'Usuarios activos' },
              { value: '$50M+', label: 'Gestionados' },
              { value: '99.9%', label: 'Disponibilidad' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-serif font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/70 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-10 lg:hidden">
            <Logo size="lg" />
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-3">
              Crear cuenta
            </h1>
            <p className="text-dark-400 text-lg">
              Comienza tu camino hacia finanzas más inteligentes
            </p>
          </div>

          {/* Email Sent Confirmation */}
          {emailSent ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold-700 to-gold-400 flex items-center justify-center">
                <Mail className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                ¡Revisa tu correo!
              </h2>
              <p className="text-dark-400 mb-6 max-w-sm mx-auto">
                Hemos enviado un enlace de verificación a{' '}
                <span className="text-gold-400 font-medium">{formData.email}</span>.
                Haz clic en el enlace para activar tu cuenta.
              </p>
              <div className="space-y-4">
                <p className="text-dark-500 text-sm">
                  ¿No recibes el correo? Revisa tu carpeta de spam
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors font-medium"
                >
                  <Sparkles className="h-5 w-5" />
                  Ir a iniciar sesión
                </Link>
              </div>
            </div>
          ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.general && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}

            <Input
              label="Nombre completo"
              name="name"
              icon={User}
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              autoComplete="name"
            />

            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              icon={Mail}
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              name="password"
              type="password"
              icon={Lock}
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              icon={Lock}
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 rounded border-dark-600 bg-dark-900 text-gold-400 focus:ring-gold-400/50"
                />
                <span className="text-sm text-dark-400">
                  Acepto los{' '}
                  <Link to="/terms" className="text-gold-400 hover:text-gold-300">
                    términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link to="/privacy" className="text-gold-400 hover:text-gold-300">
                    política de privacidad
                  </Link>
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
            >
              Crear cuenta
            </Button>
          </form>
          )}

          {/* Login Link */}
          {!emailSent && (
          <p className="mt-8 text-center text-dark-400">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to="/login"
              className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
          )}
        </div>
      </div>
    </div>
  );
}
