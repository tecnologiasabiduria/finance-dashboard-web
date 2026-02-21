import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/ui/Spinner';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * AuthCallback - Handles the redirect after clicking a Supabase magic link / invite link / recovery link.
 *
 * Supabase (with PKCE enabled, which is default) redirects to:
 *   /auth/callback?code=XXXXX
 *   /auth/callback?code=XXXXX&type=recovery  (password reset)
 *
 * This page:
 *  1. Exchanges the code for a session
 *  2. Detects if it's a recovery (password reset) → redirect to /reset-password
 *  3. Detects if it's an invite (new user) → redirect to /create-password
 *  4. Otherwise → redirect to /dashboard
 */
export default function AuthCallback() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          setError(errorDescription || errorParam);
          return;
        }

        const code = searchParams.get('code');
        const type = searchParams.get('type');

        if (code) {
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            console.error('Error exchanging code:', sessionError);
            setError(sessionError.message);
            return;
          }

          if (data?.session) {
            if (type === 'recovery') {
              navigate('/reset-password', { replace: true });
              return;
            }

            navigate('/create-password', { replace: true });
            return;
          }
        }

        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

        if (getSessionError) {
          setError(getSessionError.message);
          return;
        }

        if (session) {
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }

          navigate('/create-password', { replace: true });
          return;
        }

        setError('No se encontró un enlace válido. El enlace puede haber expirado.');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Error al procesar la autenticación');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <Logo size="lg" />
          </div>

          <div className="p-6 bg-dark-900 border border-dark-700 rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Error de autenticación
            </h2>

            <p className="text-dark-400 mb-6 text-sm">
              {error}
            </p>

            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                onClick={() => navigate('/login', { replace: true })}
              >
                Ir a iniciar sesión
              </Button>

              <p className="text-dark-500 text-xs">
                Si el problema persiste, contacta a soporte.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return <LoadingScreen message="Verificando tu cuenta..." />;
}
