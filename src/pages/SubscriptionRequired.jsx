import { Link } from 'react-router-dom';
import { CreditCard, LogOut, Crown, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { Logo } from '../components/layout/Logo';

export default function SubscriptionRequired() {
  const { logout, user } = useAuth();

  const plans = [
    {
      name: 'Básico',
      price: '$9.99',
      period: '/mes',
      features: [
        'Hasta 100 transacciones/mes',
        'Dashboard básico',
        'Reportes mensuales',
        'Soporte por email',
      ],
      popular: false,
    },
    {
      name: 'Premium',
      price: '$19.99',
      period: '/mes',
      features: [
        'Transacciones ilimitadas',
        'Dashboard avanzado',
        'Reportes en tiempo real',
        'Alertas personalizadas',
        'Soporte prioritario',
        'API access',
      ],
      popular: true,
    },
    {
      name: 'Empresarial',
      price: '$49.99',
      period: '/mes',
      features: [
        'Todo en Premium',
        'Múltiples usuarios',
        'Integración bancaria',
        'Consultoría financiera',
        'Soporte 24/7',
        'Personalización completa',
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-dark-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-dark-400 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-8 py-16">
        <div className="max-w-6xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-400/10 border border-gold-400/20 mb-8">
            <CreditCard className="h-10 w-10 text-gold-400" />
          </div>

          {/* Title */}
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Activa tu suscripción
          </h1>
          <p className="text-lg text-dark-400 max-w-2xl mx-auto mb-12">
            Hola{user?.name ? `, ${user.name}` : ''}. Para acceder al panel de control financiero, 
            necesitas una suscripción activa. Elige el plan que mejor se adapte a tus necesidades.
          </p>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-gold-400/10 to-dark-900 border-2 border-gold-400 shadow-gold-lg scale-105'
                    : 'bg-dark-900 border border-dark-700 hover:border-gold-400/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-gold-700 to-gold-400 rounded-full">
                      <Crown className="h-4 w-4 text-white" />
                      <span className="text-xs font-bold text-white uppercase">
                        Más popular
                      </span>
                    </div>
                  </div>
                )}

                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gradient-gold">{plan.price}</span>
                  <span className="text-dark-400">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-dark-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="w-full"
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Seleccionar
                </Button>
              </div>
            ))}
          </div>

          {/* Alternative */}
          <p className="text-dark-500">
            ¿Tienes preguntas?{' '}
            <a href="mailto:soporte@sabiduriaempresarial.com" className="text-gold-400 hover:text-gold-300">
              Contáctanos
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-dark-800">
        <div className="max-w-7xl mx-auto text-center text-sm text-dark-500">
          © 2026 Finanzas Sabias. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
