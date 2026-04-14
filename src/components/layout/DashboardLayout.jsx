import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import anime from 'animejs';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import OnboardingTour from '../OnboardingTour';
import { AIAgentPanel } from '../AIAgentPanel';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

      {/* AI Agent Panel (FAB + slide-up panel) */}
      <AIAgentPanel />
    </div>
  );
}
