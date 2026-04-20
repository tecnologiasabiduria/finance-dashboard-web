import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-400/10 rounded-xl">
              <Shield className="h-6 w-6 text-gold-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Política de Privacidad</h1>
              <p className="text-dark-400 text-sm mt-0.5">Sabiduría Empresarial — App Financiera</p>
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-dark-200 leading-relaxed">
          <p className="text-dark-400 text-sm">Última actualización: 20 de abril de 2026</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Responsable del tratamiento</h2>
            <p>
              Sabiduría Empresarial, identificada con correo de contacto{' '}
              <a href="mailto:tecnologia.sabiduria@gmail.com" className="text-gold-400 hover:text-gold-300">
                tecnologia.sabiduria@gmail.com
              </a>
              , es responsable del tratamiento de los datos personales recolectados a través de esta aplicación.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Datos que recolectamos</h2>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li>Nombre, correo electrónico y contraseña para crear tu cuenta.</li>
              <li>Información financiera que ingresas voluntariamente: transacciones, ingresos, gastos, cuentas bancarias y cartera de clientes.</li>
              <li>Datos de clientes y proveedores que registras en la plataforma.</li>
              <li>Información técnica de uso (logs, errores) para mejorar el servicio.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Finalidad del tratamiento</h2>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li>Proveerte el servicio de gestión financiera empresarial.</li>
              <li>Generar reportes y análisis personalizados de tu negocio.</li>
              <li>Enviarte notificaciones relacionadas con tu cuenta y suscripción.</li>
              <li>Mejorar funcionalidades de la plataforma.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Base legal</h2>
            <p>
              El tratamiento se realiza con base en tu consentimiento al registrarte, y en la necesidad de ejecutar el contrato de servicio que aceptas al crear tu cuenta. En Colombia, nos regimos por la{' '}
              <strong className="text-white">Ley 1581 de 2012</strong> (Habeas Data) y sus decretos reglamentarios.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Almacenamiento y seguridad</h2>
            <p>
              Los datos se almacenan en servidores seguros con cifrado en tránsito (HTTPS/TLS) y en reposo. Utilizamos Supabase como proveedor de base de datos, con políticas de acceso por fila (<em>Row Level Security</em>) que garantizan que solo tú puedes ver tus propios datos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Compartición de datos</h2>
            <p>
              No vendemos ni compartimos tus datos personales con terceros con fines comerciales. Solo los compartimos con proveedores de infraestructura (Supabase, Stripe vía GoHighLevel) en la medida necesaria para operar el servicio, quienes están obligados contractualmente a protegerlos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Inteligencia artificial</h2>
            <p>
              La app incluye un asesor financiero con IA. Para generar recomendaciones, puede procesar datos financieros agregados de tu cuenta. No se comparten datos identificadores personales con el proveedor de IA. Puedes desactivar esta función desde Configuración.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Tus derechos (Habeas Data)</h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li><strong className="text-white">Conocer</strong> qué datos tenemos sobre ti.</li>
              <li><strong className="text-white">Actualizar</strong> o corregir tus datos.</li>
              <li><strong className="text-white">Suprimir</strong> tus datos (eliminar tu cuenta).</li>
              <li><strong className="text-white">Revocar</strong> tu consentimiento en cualquier momento.</li>
              <li><strong className="text-white">Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC).</li>
            </ul>
            <p>
              Para ejercer estos derechos, escríbenos a{' '}
              <a href="mailto:tecnologia.sabiduria@gmail.com" className="text-gold-400 hover:text-gold-300">
                tecnologia.sabiduria@gmail.com
              </a>
              . Respondemos en un plazo máximo de 10 días hábiles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">9. Retención de datos</h2>
            <p>
              Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta, tus datos serán borrados en un plazo máximo de 30 días, salvo obligación legal de conservarlos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">10. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política periódicamente. Te notificaremos por correo con al menos 10 días de anticipación ante cambios sustanciales. El uso continuado del servicio implica aceptación de la nueva política.
            </p>
          </section>

          <div className="mt-10 p-5 bg-dark-900 border border-dark-700 rounded-xl">
            <p className="text-sm text-dark-400">
              ¿Preguntas sobre esta política?{' '}
              <a href="mailto:tecnologia.sabiduria@gmail.com" className="text-gold-400 hover:text-gold-300 font-medium">
                tecnologia.sabiduria@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
