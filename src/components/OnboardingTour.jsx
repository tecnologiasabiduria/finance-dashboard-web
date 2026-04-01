import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const createSteps = (isIOS) => [
  // ========== DASHBOARD ==========
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    route: '/dashboard',
    title: '¡Bienvenido a Sabiduría Empresarial!',
    content: 'Tu plataforma para gestionar las finanzas de tu negocio. Te mostraremos cada sección en ~3 minutos.',
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    route: '/dashboard',
    title: '📱 Instala la App en tu iPhone',
    content: isIOS 
      ? '1. Toca el botón Compartir (el cuadrado con flecha hacia arriba ↑) en la barra inferior de Safari.\n\n2. Desplázate y toca "Agregar a pantalla de inicio".\n\n3. Toca "Agregar" en la esquina superior derecha.\n\n¡Listo! La app se abrirá en pantalla completa.'
      : '1. Toca el menú ⋮ (tres puntos) en tu navegador.\n\n2. Selecciona "Instalar aplicación" o "Agregar a pantalla de inicio".\n\n¡Listo! La app se abrirá sin barra del navegador.',
  },
  {
    target: '[data-tour="month-navigator"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/dashboard',
    title: '📅 Navegador de Meses',
    content: 'Usa las flechas ◀ ▶ para moverte entre meses y ver el resumen financiero de cada período.',
  },
  {
    target: '[data-tour="quick-new"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/dashboard',
    title: '✨ Nuevo Registro',
    content: '¡Tu botón más importante! Registra ingresos o gastos. Hazlo a diario para datos precisos.',
  },
  {
    target: '[data-tour="charts-section"]',
    placement: 'top',
    disableBeacon: true,
    route: '/dashboard',
    title: '📊 Análisis Visual',
    content: 'Gráficos interactivos de ingresos por tipo y gastos por categoría. Toca para ver detalles.',
  },
  {
    target: '[data-tour="header-notifications"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/dashboard',
    title: '🔔 Notificaciones',
    content: 'Alertas de pagos pendientes, presupuestos excedidos y novedades de la plataforma.',
  },
  {
    target: '[data-tour="header-user"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/dashboard',
    title: '👤 Tu Perfil',
    content: 'Cambia tema, selecciona moneda, configura tu cuenta o cierra sesión.',
  },

  // ========== TRANSACCIONES ==========
  {
    target: '[data-tour="transactions-summary"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/transactions',
    title: '💳 Transacciones - Resumen',
    content: 'Vista rápida de tus totales: ingresos, gastos y resultado del período seleccionado.',
  },
  {
    target: '[data-tour="transactions-tabs"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/transactions',
    title: '📑 Filtrar por Tipo',
    content: 'Usa las pestañas para ver solo Ingresos, solo Gastos, o Todos los movimientos.',
  },

  // ========== INFORMES ==========
  {
    target: '[data-tour="reports-tabs"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/reports',
    title: '📈 Informes',
    content: 'Elige entre Informe Mensual (detalle del mes) o Informe Anual (comparativa mes a mes). Exporta a PDF.',
  },

  // ========== CARTERA ==========
  {
    target: '[data-tour="cartera-stats"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/cartera',
    title: '📒 Cartera - Resumen',
    content: 'Total cartera, cobrado, saldo pendiente y porcentaje de avance. Gestiona tus cuentas por cobrar.',
  },

  // ========== METAS ==========
  {
    target: '[data-tour="goals-target"]',
    placement: 'bottom',
    disableBeacon: true,
    route: '/goals',
    title: '🎯 Meta de Facturación',
    content: 'Define cuánto quieres vender en el año. El sistema calculará tu meta mensual automáticamente.',
  },
  {
    target: '[data-tour="goals-pockets"]',
    placement: 'top',
    disableBeacon: true,
    route: '/goals',
    title: '👛 Bolsillos de Presupuesto',
    content: 'Distribuye tu presupuesto en categorías (ej: Nómina 30%, Operación 20%). Te alertará si excedes.',
  },

  // ========== CONFIGURACIÓN ==========
  {
    target: '[data-tour="settings-tabs"]',
    placement: 'right',
    disableBeacon: true,
    route: '/settings',
    title: '⚙️ Configuración',
    content: 'Perfil, seguridad, apariencia y categorías. Personaliza colores e íconos de tus categorías.',
  },

  // ========== FINAL ==========
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    route: '/dashboard',
    title: '🚀 ¡Todo Listo!',
    content: 'Ya conoces Sabiduría Empresarial. Empieza configurando tu meta, luego registra tu primer movimiento. Si tienes dudas, escríbenos en el grupo de WhatsApp.',
  },
];

const joyrideStyles = {
  options: {
    arrowColor: '#1e1e28',
    backgroundColor: '#1e1e28',
    overlayColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#e5e5e5',
    primaryColor: '#da7d41',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '16px',
    padding: '0',
    border: '1px solid rgba(218, 125, 65, 0.3)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
    maxWidth: '340px',
  },
  tooltipContainer: {
    textAlign: 'left',
    padding: '20px',
  },
  tooltipTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '10px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#b3b3b3',
    whiteSpace: 'pre-line',
  },
  tooltipFooter: {
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  buttonNext: {
    backgroundColor: '#da7d41',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '10px 20px',
    fontWeight: '600',
    fontSize: '14px',
    border: 'none',
    boxShadow: '0 2px 8px rgba(218, 125, 65, 0.3)',
  },
  buttonBack: {
    color: '#8a8a95',
    fontSize: '14px',
    marginRight: '10px',
  },
  buttonSkip: {
    color: '#6e6e7a',
    fontSize: '13px',
  },
  buttonClose: {
    color: '#6e6e7a',
    width: '12px',
    height: '12px',
    top: '12px',
    right: '12px',
  },
  spotlight: {
    borderRadius: '12px',
  },
  beacon: {
    display: 'none',
  },
};

export default function OnboardingTour() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const pendingStepRef = useRef(null);

  const hasCompletedOnboarding = user?.onboardingCompleted ?? user?.onboarding_completed;

  useEffect(() => {
    if (user && hasCompletedOnboarding === false && !isCompleting) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      setSteps(createSteps(isIOS));
      
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard');
      }
      
      const timer = setTimeout(() => {
        setRun(true);
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [user, hasCompletedOnboarding, isCompleting]);

  useEffect(() => {
    if (isNavigating && pendingStepRef.current !== null) {
      const timer = setTimeout(() => {
        setStepIndex(pendingStepRef.current);
        pendingStepRef.current = null;
        setIsNavigating(false);
        setRun(true);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isNavigating]);

  const completeOnboarding = useCallback(async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    setRun(false);
    
    try {
      await api.completeOnboarding();
      setUser((prev) => ({
        ...prev,
        onboardingCompleted: true,
        onboarding_completed: true,
      }));
      
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setIsCompleting(false);
    }
  }, [isCompleting, location.pathname, navigate, setUser]);

  const handleJoyrideCallback = useCallback(async (data) => {
    const { status, action, index, type } = data;

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
      
      if (nextIndex >= 0 && nextIndex < steps.length) {
        const nextStep = steps[nextIndex];
        const currentRoute = location.pathname;
        const nextRoute = nextStep.route;
        
        if (nextRoute && nextRoute !== currentRoute) {
          setRun(false);
          setIsNavigating(true);
          pendingStepRef.current = nextIndex;
          navigate(nextRoute);
        } else {
          setStepIndex(nextIndex);
        }
      }
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + 1;
      if (nextIndex < steps.length) {
        const nextStep = steps[nextIndex];
        if (nextStep.route && nextStep.route !== location.pathname) {
          setRun(false);
          setIsNavigating(true);
          pendingStepRef.current = nextIndex;
          navigate(nextStep.route);
        } else {
          setStepIndex(nextIndex);
        }
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      await completeOnboarding();
    }
  }, [steps, location.pathname, navigate, completeOnboarding]);

  if (!user || hasCompletedOnboarding !== false || steps.length === 0 || isCompleting) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      disableScrolling={false}
      scrollOffset={100}
      spotlightPadding={10}
      callback={handleJoyrideCallback}
      styles={joyrideStyles}
      locale={{
        back: 'Anterior',
        close: 'Cerrar',
        last: '¡Comenzar!',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
