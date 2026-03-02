import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const TOUR_STEPS = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '¡Bienvenido a Finanzas Sabias! 🎉',
    content: 'Te daremos un recorrido rápido por tu nuevo dashboard financiero. ¡Vamos!',
  },
  {
    target: '[data-tour="sidebar-nav"]',
    placement: 'right',
    title: 'Menú de navegación',
    content: 'Desde aquí accedes a todas las secciones: registros, transacciones, informes, metas y configuración.',
  },
  {
    target: '[data-tour="sidebar-new"]',
    placement: 'right',
    title: 'Nuevo Registro ✨',
    content: 'Este es tu botón más importante. Úsalo para registrar ingresos, gastos o transferencias.',
  },
  {
    target: '[data-tour="month-navigator"]',
    placement: 'bottom',
    title: 'Navegador de meses',
    content: 'Aquí puedes moverte entre meses para ver el informe de cada período.',
  },
  {
    target: '[data-tour="summary-cards"]',
    placement: 'bottom',
    title: 'Resumen financiero',
    content: 'Estas tarjetas muestran tus ingresos totales, gastos totales y la utilidad del mes seleccionado.',
  },
  {
    target: '[data-tour="charts-section"]',
    placement: 'top',
    title: 'Distribución por categoría',
    content: 'Aquí ves cómo se distribuyen tus ingresos por tipo y tus gastos por categoría, con gráficos interactivos.',
  },
  {
    target: '[data-tour="header-notifications"]',
    placement: 'bottom-end',
    title: 'Notificaciones 🔔',
    content: 'Aquí llegarán avisos importantes sobre tu cuenta y novedades de la plataforma.',
  },
  {
    target: '[data-tour="header-user"]',
    placement: 'bottom-end',
    title: 'Tu perfil',
    content: 'Desde aquí accedes a la configuración de tu cuenta y puedes cerrar sesión.',
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '¡Listo! Ya puedes empezar 🚀',
    content: 'Empieza registrando tu primer ingreso o gasto. Si necesitas ayuda, estaremos aquí. ¡Éxitos con tus finanzas!',
  },
];

// Custom styles matching dark theme + gold accent
const joyrideStyles = {
  options: {
    arrowColor: '#1a1a2e',
    backgroundColor: '#1a1a2e',
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    textColor: '#e5e5e5',
    primaryColor: '#D4AF37',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  tooltipTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#a3a3a3',
  },
  buttonNext: {
    backgroundColor: '#D4AF37',
    color: '#0a0a0f',
    borderRadius: '12px',
    padding: '10px 24px',
    fontWeight: '600',
    fontSize: '14px',
  },
  buttonBack: {
    color: '#a3a3a3',
    fontSize: '14px',
    marginRight: '8px',
  },
  buttonSkip: {
    color: '#666',
    fontSize: '13px',
  },
  buttonClose: {
    color: '#666',
  },
  spotlight: {
    borderRadius: '16px',
  },
  beacon: {
    display: 'none',
  },
};

export default function OnboardingTour() {
  const { user, setUser } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Only show tour if user hasn't completed onboarding
    if (user && user.onboardingCompleted === false) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleCallback = async (data) => {
    const { status, type, index } = data;

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }

    // Tour completed or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      try {
        await api.completeOnboarding();
        // Update user state so tour doesn't show again this session
        setUser((prev) => ({ ...prev, onboardingCompleted: true }));
      } catch (err) {
        console.error('Error completing onboarding:', err);
      }
    }
  };

  if (!user || user.onboardingCompleted !== false) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      disableScrolling={false}
      callback={handleCallback}
      styles={joyrideStyles}
      locale={{
        back: 'Anterior',
        close: 'Cerrar',
        last: '¡Empezar!',
        next: 'Siguiente',
        skip: 'Saltar tour',
        open: 'Abrir',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
