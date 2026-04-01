import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import anime from 'animejs';
import { Sparkles, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import OnboardingTour from '../OnboardingTour';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const overlayRef = useRef(null);
  const sidebarRef = useRef(null);
  const animating = useRef(false);
  const pageRef = useRef(null);
  const desktopNavRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const overlay = overlayRef.current;
    const sidebar = sidebarRef.current;

    if (!overlay || !sidebar) return;

    if (mobileMenuOpen) {
      // ══════════ OPEN ══════════
      if (animating.current) return;
      animating.current = true;

      overlay.style.display = 'block';
      sidebar.style.display = 'block';

      anime({
        targets: overlay,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutCubic',
      });

      anime({
        targets: sidebar,
        translateX: ['-100%', 0],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutExpo',
      });

      const menuItems = sidebar.querySelectorAll('[data-menu-item]');
      if (menuItems.length > 0) {
        anime({
          targets: menuItems,
          opacity: [0, 1],
          translateX: [-20, 0],
          delay: anime.stagger(50, { start: 200 }),
          duration: 400,
          easing: 'easeOutCubic',
          complete: () => { animating.current = false; }
        });
      } else {
        animating.current = false;
      }
    } else {
      // ══════════ CLOSE ══════════
      // Always allow close — cancel any in-progress open animation
      anime.remove(overlay);
      anime.remove(sidebar);
      const menuItems = sidebar.querySelectorAll('[data-menu-item]');
      if (menuItems.length) anime.remove(menuItems);
      animating.current = false;

      anime({
        targets: sidebar,
        translateX: [0, '-100%'],
        opacity: [1, 0],
        duration: 300,
        easing: 'easeInCubic',
      });

      anime({
        targets: overlay,
        opacity: [1, 0],
        duration: 250,
        easing: 'easeInCubic',
        complete: () => {
          overlay.style.display = 'none';
          sidebar.style.display = 'none';
        }
      });
    }
  }, [mobileMenuOpen]);

  // ══════════ PAGE TRANSITION ══════════
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    anime.remove(el);
    anime({
      targets: el,
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 350,
      easing: 'easeOutCubic',
      complete: () => { el.style.transform = ''; },
    });
  }, [location.pathname]);

  // ══════════ SIDEBAR ACTIVE ITEM PULSE ══════════
  useEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav) return;
    const activeLink = nav.querySelector('[data-nav-active="true"]');
    if (!activeLink) return;
    const icon = activeLink.querySelector('svg');
    if (icon) {
      anime.remove(icon);
      anime({
        targets: icon,
        scale: [1, 1.35, 1],
        rotate: [0, -8, 0],
        duration: 500,
        easing: 'easeOutElastic(1, .5)',
      });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-dark-900 relative">
      {/* Ambient warm glows — rompen la monotonía del fondo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] bg-gold-700/[0.08] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold-700/[0.06] rounded-full blur-3xl" />
      </div>
      {/* Onboarding Tour for new users */}
      <OnboardingTour />

      {/* Sidebar */}
      <div className="hidden lg:block" ref={desktopNavRef}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-30 lg:hidden"
        style={{ display: 'none', opacity: 0 }}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed inset-y-0 left-0 z-40 lg:hidden"
        style={{ display: 'none', opacity: 0, transform: 'translateX(-100%)' }}
      >
        <Sidebar
          collapsed={false}
          mobile={true}
          onToggle={() => setMobileMenuOpen(false)}
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div
        className={clsx(
          'relative min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        <Header
          showMenuButton={true}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main ref={pageRef} className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant FAB (Floating Action Button) */}
      <button
        onClick={() => setShowAIModal(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-white rounded-full shadow-2xl hover:shadow-gold-400/30 hover:scale-110 transition-all duration-300 group"
        title="Asistente IA"
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* AI Coming Soon Modal */}
      {showAIModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAIModal(false)}
        >
          <div
            className="bg-dark-900 border border-gold-400/30 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-gold-400/20 to-gold-600/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-gold-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Agente IA Financiero</h3>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-gold-400/10 via-gold-500/10 to-gold-600/10 border border-gold-400/20 rounded-xl p-4">
                <p className="text-white text-sm leading-relaxed">
                  Estamos trabajando en un <span className="font-semibold text-gold-300">agente experto con inteligencia artificial</span> que
                  analizará tus datos financieros y te dará recomendaciones personalizadas.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-dark-300 text-sm flex items-center gap-2">
                  <span className="text-gold-400">✓</span> Análisis automático de tus transacciones
                </p>
                <p className="text-dark-300 text-sm flex items-center gap-2">
                  <span className="text-gold-400">✓</span> Consejos para optimizar tu presupuesto
                </p>
                <p className="text-dark-300 text-sm flex items-center gap-2">
                  <span className="text-gold-400">✓</span> Alertas inteligentes y predicciones
                </p>
                <p className="text-dark-300 text-sm flex items-center gap-2">
                  <span className="text-gold-400">✓</span> Chat en tiempo real sobre tus finanzas
                </p>
              </div>

              <div className="text-center pt-2">
                <p className="text-gold-400 font-semibold text-sm">
                  🚀 Próximamente disponible
                </p>
              </div>

              <button
                onClick={() => setShowAIModal(false)}
                className="w-full px-6 py-3 bg-gold-400 hover:bg-gold-500 text-white font-medium rounded-xl transition-colors duration-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
