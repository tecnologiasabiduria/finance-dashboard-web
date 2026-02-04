📊 REVIEW COMPLETA DEL PROYECTO
🏷️ Sugerencias de Nombre para la Ruta
En lugar de /programa, considera:

Nombre	URL	Concepto
finanzas	/finanzas	Directo y descriptivo
mifinanzas	/mifinanzas	Personal, amigable
control	/control	Control de gastos
panel	/panel	Panel de control
app	/app	Genérico pero moderno
cuenta	/cuenta	Tu cuenta financiera
dashboard	/dashboard	Técnico pero reconocible
gestor	/gestor	Gestor financiero
Mi recomendación: /finanzas o /app - cortos, memorables y profesionales.

📈 CALIFICACIÓN GENERAL: 62/100
🔍 DESGLOSE POR CATEGORÍAS
Categoría	Puntos	Max	Notas
Arquitectura	12	15	Buena separación, falta state management
Calidad de Código	11	15	Limpio pero sin TypeScript
Seguridad	6	15	Token en sessionStorage, demo mode riesgoso
UI/UX	13	15	Excelente diseño y experiencia
Testing	0	10	Inexistente
Performance	5	10	Sin lazy loading ni memoización
Documentación	5	5	DIA_UNO.md es excelente
Manejo de Errores	5	8	Básico, sin Error Boundaries
Escalabilidad	5	7	Preparado pero limitado
TOTAL	62	100	
✅ FORTALEZAS (Lo que está bien)
Frontend
📁 Estructura ejemplar: Carpetas bien organizadas (ui, layout, pages, services)
🎨 UI/UX excelente: Dark theme con dorado, animaciones suaves, responsive
🧩 Componentes reutilizables: Button, Card, Input, Modal bien diseñados
🔐 AuthContext: Patrón correcto con hook personalizado
📊 Gráficos profesionales: Recharts con tooltips personalizados
🛣️ Routing: Rutas protegidas, layouts anidados
Backend
🏗️ Arquitectura Express: Rutas, middlewares, servicios separados
🔒 Middleware de auth: Verifica JWT de Supabase correctamente
📊 Endpoints Dashboard: Cálculos de resumen bien implementados
⚡ Seguridad HTTP: Helmet, CORS, rate limiting configurados
🗄️ Supabase: RLS habilitado para seguridad a nivel de fila
Documentación
📋 DIA_UNO.md: Documento pivote EXCELENTE, facilita continuidad
❌ DEBILIDADES (Lo que hay que mejorar)
🔴 Crítico (Bloquea producción)
Problema	Ubicación	Impacto
Token en sessionStorage	AuthContext.jsx	Vulnerable a XSS
Demo mode en login	Login.jsx	Bypass de autenticación
URL hardcodeada	api.js	No funciona en producción
Sin variables de entorno	Frontend	Imposible desplegar
Sin HTTPS/cookies seguras	Backend	Tokens interceptables
🟡 Importante (Afecta calidad)
Problema	Impacto
Sin tests	Regresiones no detectadas
Sin lazy loading	Bundle grande, carga lenta
Sin Error Boundaries	Crashes rompen toda la app
Metas en localStorage	Se pierden al cambiar dispositivo
Sin TypeScript	Errores en runtime
🟢 Menor (Nice to have)
Problema	Impacto
Sin PWA	No instalable en móvil
Sin modo claro	Solo dark theme
Constantes duplicadas	CATEGORIES en varios archivos
Sin accesibilidad (a11y)	Usuarios con discapacidad
📊 COMPARACIÓN: MVP vs PRODUCCIÓN

          ACTUAL          META PRODUCCIÓN            │                   │Seguridad   ████░░░░░░ 40%     ██████████ 100%Testing     ░░░░░░░░░░  0%     ████████░░  80%UI/UX       █████████░ 87%     ██████████ 100%Performance ████░░░░░░ 50%     ████████░░  85%Docs        ██████░░░░ 60%     ████████░░  80%
🛠️ ROADMAP PARA LLEGAR A 85/100
Fase 1: Seguridad (Sube a 72/100)
 Migrar tokens a httpOnly cookies
 Eliminar demo mode de producción
 Implementar variables de entorno
 Configurar CORS para dominio de producción
Fase 2: Estabilidad (Sube a 78/100)
 Agregar Error Boundaries
 Implementar tests básicos (auth, api)
 Migrar metas a Supabase
Fase 3: Performance (Sube a 82/100)
 Lazy loading de rutas
 Memoización con useMemo/useCallback
 Optimizar imágenes y assets
Fase 4: Producción (Sube a 85/100)
 Configurar CI/CD
 Logging y monitoreo (Sentry)
 Backup automático de BD
📝 RESUMEN EJECUTIVO
Aspecto	Estado
¿Es funcional?	✅ Sí, como MVP
¿Está listo para producción?	❌ No, faltan cambios de seguridad
¿El código es mantenible?	✅ Sí, buena estructura
¿Es escalable?	⚠️ Parcialmente
¿Tiempo estimado para producción?	2-3 días de trabajo
Veredicto: Un MVP sólido con excelente UI/UX pero que necesita hardening de seguridad antes de ir a producción.

---

## 📌 NOTAS DE SESIÓN - 30 Enero 2026

### 🔐 SUSCRIPCIÓN - DECISIÓN DE ARQUITECTURA

**Estado actual**: El sistema tiene un middleware de verificación de suscripción y una página `/subscription-required`.

**Decisión**: La suscripción **NO se manejará desde esta plataforma**.

**Motivo**: El flujo de pagos/suscripción se gestionará desde:
- GoHighLevel (CRM externo)
- Stripe directo
- Otro sistema de ventas

**Acciones tomadas**:
1. ✅ Middleware de suscripción deshabilitado temporalmente en backend
2. ✅ Usuario puede acceder al dashboard sin suscripción activa

**TODO a futuro**:
- [ ] Definir cómo se activará la suscripción (webhook de GHL/Stripe → activa flag en Supabase)
- [ ] Decidir si mostrar features bloqueadas o simplemente no mostrarlas
- [ ] Configurar webhook endpoint para recibir eventos de pago
- [ ] Campo `subscription_status` en tabla `profiles` o `subscriptions`

### ✅ CAMBIOS REALIZADOS HOY

1. **Seguridad (Punto 1)**
   - Eliminado demo mode de Login
   - URL de API desde variable de entorno `VITE_API_URL`
   - Creado `.env.local` con configuración

2. **Goals en Supabase (Punto 2A)**
   - Tabla `goals` creada en Supabase
   - Endpoint `/api/goals` CRUD completo
   - Frontend actualizado para usar API en vez de localStorage

3. **Settings funcional (Punto 2B)**
   - Tabla `profiles` creada en Supabase
   - Endpoint `/api/auth/profile` - actualizar nombre
   - Endpoint `/api/auth/password` - cambiar contraseña
   - Frontend conectado a API real

4. **Register con feedback (Punto 2B)**
   - Detecta si Supabase requiere verificación de email
   - Muestra pantalla amigable "¡Revisa tu correo!"
   - ✅ Probado y funcionando

5. **Flujo sin suscripción**
   - Removida redirección a `/subscription-required` del registro
   - Login va directo al dashboard en modo desarrollo
   - ✅ Probado y funcionando

---

## 🔄 FLUJO DE SUSCRIPCIÓN - ANÁLISIS Y DISEÑO

### 📝 Idea Original del Usuario

> "Stripe manda invoice → cuando se paga hay webhook → se captura → se da acceso → 
> Supabase crea usuario con atributo (pago/no pago/free) → magic link para credenciales"

### 🔍 Análisis y Clarificaciones

**¿Quién recibe el webhook?**
- ✅ **Tu backend Express** (recomendado) - Ya tienes `/api/webhooks/stripe`
- ⚠️ Supabase Edge Functions - Posible pero añade complejidad
- El webhook lo configuras TÚ en Stripe Dashboard → apunta a tu servidor

**Eventos de Stripe relevantes:**
| Evento | Cuándo se dispara |
|--------|-------------------|
| `checkout.session.completed` | Cliente completa pago en Checkout |
| `invoice.paid` | Invoice pagado (suscripción recurrente) |
| `customer.subscription.created` | Nueva suscripción creada |
| `customer.subscription.deleted` | Suscripción cancelada |

### 🎯 Flujo Refinado Propuesto

```
┌─────────────────────────────────────────────────────────────┐
│  1. VENTA                                                    │
│     Cliente paga en Stripe (Checkout/Invoice/Link de pago)  │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. WEBHOOK                                                  │
│     Stripe envía `checkout.session.completed` a tu backend  │
│     POST https://tu-api.com/api/webhooks/stripe             │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. BACKEND PROCESA                                          │
│     a) Verifica firma del webhook (seguridad)               │
│     b) Extrae email del cliente                             │
│     c) Verifica si usuario existe en Supabase               │
│        - Si existe → actualiza subscription_status          │
│        - Si no existe → crear usuario nuevo                 │
│     d) Crea/actualiza registro en tabla `subscriptions`     │
│     e) Genera Magic Link con Supabase Admin                 │
│     f) Envía email: "Tu cuenta está lista, haz clic aquí"  │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  4. USUARIO RECIBE EMAIL                                     │
│     "Bienvenido a Finanzas Sabias - Activa tu cuenta"       │
│     [Botón: Activar mi cuenta] → Magic Link                 │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  5. USUARIO HACE CLIC                                        │
│     Magic Link lo autentica automáticamente                 │
│     Frontend detecta primera vez → Modal "Crear contraseña" │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  6. ACCESO COMPLETO                                          │
│     subscription_status = 'active' → Todo desbloqueado      │
└─────────────────────────────────────────────────────────────┘
```

### 📊 Modelo de Datos Propuesto

**Opción A: Campo en `profiles` (simple)**
```sql
ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'none';
-- Valores: 'none', 'active', 'cancelled', 'expired'
```

**Opción B: Tabla `subscriptions` (completa)** ← Ya existe en tu backend
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT, -- 'active', 'cancelled', 'past_due', 'expired'
  plan TEXT, -- 'monthly', 'yearly', 'lifetime'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Recomendación:** Usar ambas. `subscriptions` para historial completo, 
`profiles.subscription_status` para consulta rápida.

### ⚠️ Consideraciones Importantes

1. **Seguridad del Webhook**
   - Siempre verificar firma de Stripe (`stripe.webhooks.constructEvent`)
   - Ya tienes esto en `/api/webhooks/stripe`

2. **Usuario ya existe vs nuevo**
   - Si email ya existe → solo actualizar suscripción
   - Si es nuevo → crear con `supabase.auth.admin.createUser()`

3. **Magic Link vs Contraseña**
   - Magic link es más seguro para primera vez
   - Después el usuario puede crear contraseña en Settings

4. **Qué pasa si no paga (free/trial)**
   - `subscription_status = 'trial'` o `'free'`
   - Mostrar funciones limitadas o popup de upgrade

5. **Renovación/Cancelación**
   - Webhook `customer.subscription.updated` → actualizar status
   - Webhook `customer.subscription.deleted` → status = 'cancelled'

### 🔧 Cambios Necesarios para Implementar

**Backend:**
- [ ] Mejorar webhook handler en `/api/webhooks/stripe`
- [ ] Añadir lógica de crear usuario si no existe
- [ ] Generar y enviar magic link
- [ ] Añadir `subscription_status` a profiles

**Frontend:**
- [ ] Detectar primera vez (sin contraseña) → modal crear contraseña
- [ ] Verificar `subscription_status` en cada página protegida
- [ ] Popup de upgrade para usuarios sin suscripción activa

**Supabase:**
- [ ] Añadir columna `subscription_status` a `profiles`
- [ ] RLS policy para que solo admins cambien status

### 💡 Alternativa con GoHighLevel

Si usas GHL para el embudo de ventas:
```
GHL Funnel → Stripe Payment → GHL recibe webhook → 
GHL envia webhook a tu API → Crear usuario
```
Esto añade GHL como intermediario pero te da más control del embudo.

### ❓ Preguntas para Definir

1. ¿El cliente paga directamente en Stripe o a través de GHL?
2. ¿Habrá plan gratuito/trial o solo de pago?
3. ¿Suscripción mensual, anual, o pago único (lifetime)?
4. ¿Quieres que el email de bienvenida lo envíe Stripe, Supabase, o tu propio sistema?

---

### ✅ RESPUESTAS DEFINIDAS (30 Enero 2026)

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde paga? | Stripe conectado con GHL |
| ¿Trial? | NO - Solo pago o nada |
| ¿Tipo de plan? | Mensual únicamente |
| ¿Quién envía email? | GHL cuando recibe invoice pagado |

---

## 🎯 FLUJO SIMPLIFICADO FINAL

### Mi Recomendación: Webhook de Stripe (no GHL)

**¿Por qué Stripe directo y no GHL?**
- ✅ Stripe es la fuente de verdad del pago
- ✅ Menos puntos de falla (GHL podría fallar sin que Stripe falle)
- ✅ Eventos más detallados (`invoice.paid`, `subscription.deleted`, etc.)
- ✅ GHL ya envía el email de bienvenida, no duplicas esa lógica
- ⚠️ GHL webhook añade un intermediario innecesario

**División de responsabilidades:**
```
GHL → Venta y email de bienvenida
Stripe → Webhook técnico para crear acceso
Tu API → Crear usuario en Supabase
```

### Flujo Final Simplificado

```
┌─────────────────────────────────────────────────────────────┐
│  1. Cliente compra en funnel de GHL                         │
│     GHL procesa pago via Stripe                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────────┐     ┌────────────────────────────────────┐
│  GHL               │     │  Stripe                            │
│  Envía email de    │     │  Dispara webhook invoice.paid      │
│  bienvenida al     │     │  a tu backend                      │
│  cliente           │     │                                    │
└───────────────────┘     └─────────────┬──────────────────────┘
                                        ▼
                          ┌────────────────────────────────────┐
                          │  Tu Backend                        │
                          │  POST /api/webhooks/stripe         │
                          │                                    │
                          │  1. Verificar firma Stripe         │
                          │  2. Extraer email del cliente      │
                          │  3. Crear usuario en Supabase      │
                          │     (con admin.createUser)         │
                          │  4. Marcar subscription_status     │
                          │     = 'active'                     │
                          │  5. Generar Magic Link             │
                          └─────────────┬──────────────────────┘
                                        ▼
                          ┌────────────────────────────────────┐
                          │  Email de GHL ya fue enviado       │
                          │  PERO el Magic Link lo envía       │
                          │  Supabase automáticamente          │
                          │                                    │
                          │  Opción: Incluir link en email GHL │
                          └─────────────┬──────────────────────┘
                                        ▼
                          ┌────────────────────────────────────┐
                          │  Usuario hace clic en Magic Link   │
                          │  → Entra autenticado               │
                          │  → Modal: "Crea tu contraseña"     │
                          └────────────────────────────────────┘
```

### 🤔 Sobre el Email de GHL

**Problema potencial:**
- GHL envía email de bienvenida INMEDIATAMENTE
- Tu backend puede tardar 1-2 segundos en crear el usuario
- Si el usuario hace clic muy rápido, puede no existir aún

**Soluciones:**
1. **Opción A (Simple):** En el email de GHL poner: 
   > "En unos minutos recibirás otro email para activar tu cuenta"
   
2. **Opción B (Mejor):** El Magic Link lo incluyes en el email de GHL
   - Tu backend genera el link y lo pasa a GHL via webhook
   - Más complejo pero mejor UX

3. **Opción C (Más simple):** Solo usar email de Supabase
   - Desactivar email de bienvenida en GHL
   - Tu backend envía Magic Link con Supabase
   - Un solo email, menos confusión

**Mi recomendación: Opción C** - Un solo email con el Magic Link.

### 📊 Modelo Simplificado

Solo necesitas en `profiles`:
```sql
ALTER TABLE profiles 
ADD COLUMN subscription_status TEXT DEFAULT 'none'
CHECK (subscription_status IN ('none', 'active', 'cancelled'));
```

No necesitas tabla `subscriptions` compleja para empezar.

### 🔧 Lo que hay que implementar

**Backend (webhook):**
```
POST /api/webhooks/stripe
├── Verificar firma
├── Si evento = invoice.paid
│   ├── Extraer customer_email
│   ├── Crear usuario (supabase.auth.admin.createUser)
│   ├── Crear/actualizar profile con subscription_status = 'active'
│   └── Generar Magic Link (supabase.auth.admin.generateLink)
└── Responder 200 OK
```

**Frontend:**
```
Al recibir Magic Link:
├── Si es primera vez (sin contraseña)
│   └── Modal: "Crea tu contraseña"
└── Si subscription_status != 'active'
    └── Mostrar popup: "Tu suscripción no está activa"
```

### ⏭️ Próximos Pasos

1. [x] Añadir `subscription_status` a tabla `profiles` en Supabase
2. [x] Mejorar webhook handler en backend
3. [ ] Configurar webhook en Stripe Dashboard → apuntar a tu API
4. [ ] Frontend: detectar primera vez y pedir contraseña
5. [ ] Frontend: verificar subscription_status en rutas protegidas

---

## 🛠️ IMPLEMENTACIÓN EN CURSO

### SQL para ejecutar en Supabase:

```sql
-- Añadir subscription_status a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'
CHECK (subscription_status IN ('none', 'active', 'cancelled'));

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_status);
```

**⚠️ Ejecuta este SQL en Supabase SQL Editor y confirma cuando esté listo.**

### ✅ Backend Actualizado (stripe.js)

Eventos manejados:
- `checkout.session.completed` → Crea usuario + activa suscripción
- `invoice.paid` → Crea usuario + activa suscripción (principal)
- `customer.subscription.updated` → Actualiza status
- `customer.subscription.deleted` → Marca como cancelled
- `invoice.payment_failed` → Log (Stripe reintenta)

Flujo de `activateUserSubscription(email)`:
1. Busca usuario en Supabase Auth
2. Si no existe → lo crea con `admin.createUser()`
3. Actualiza `profiles.subscription_status = 'active'`
4. Genera Magic Link con `admin.generateLink()`
5. Supabase envía email automáticamente

### 📝 CONFIGURACIÓN DE STRIPE - DESARROLLO LOCAL

#### 🔑 Paso 1: Obtener STRIPE_SECRET_KEY

1. Ir a [dashboard.stripe.com](https://dashboard.stripe.com)
2. Verificar que estás en **modo Test** (esquina superior derecha)
3. Click en **Developers** → **API keys**
4. Copiar **Secret key** (empieza con `sk_test_...`)

#### 🛠️ Paso 2: Instalar Stripe CLI (Testing Local)

```bash
# Instalar Stripe CLI en Linux
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe

# Login (abre navegador)
stripe login

# Escuchar webhooks y reenviar a tu backend local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**⚠️ Stripe CLI te dará un `whsec_...` temporal - usa ese como STRIPE_WEBHOOK_SECRET**

#### 📄 Paso 3: Variables de Entorno (.env del backend)

```env
# ============================================
# STRIPE - DESARROLLO LOCAL
# ============================================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx  # Del stripe listen

# ============================================
# STRIPE - PRODUCCIÓN (cambiar cuando esté listo)
# ============================================
# STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx  # Del webhook real en Dashboard
```

#### 🧪 Paso 4: Probar con Stripe CLI

Terminal 1 - Backend corriendo:
```bash
cd "/home/garzon/Diana Cortes/finance-dashboard-api" && npm run dev
```

Terminal 2 - Stripe CLI escuchando:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Terminal 3 - Disparar evento de prueba:
```bash
# Simular invoice pagado
stripe trigger invoice.paid

# O simular checkout completado
stripe trigger checkout.session.completed
```

#### ✅ Checklist de Testing Local

- [ ] `stripe login` completado
- [ ] `stripe listen` corriendo y mostrando whsec_...
- [ ] Backend corriendo en localhost:3000
- [ ] STRIPE_WEBHOOK_SECRET actualizado en .env
- [ ] `stripe trigger invoice.paid` exitoso
- [ ] Ver logs en backend: "Usuario creado/activado"

---

### 🚀 CONFIGURACIÓN DE PRODUCCIÓN (CUANDO ESTÉ LISTO)

#### Dominio: `TU-DOMINIO-AQUI`

1. Ir a **Developers → Webhooks** en Stripe Dashboard
2. Click **"Add endpoint"**
3. Endpoint URL: `https://TU-DOMINIO-AQUI/api/webhooks/stripe`
4. Seleccionar eventos:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Click en el endpoint creado → **"Reveal"** signing secret
7. Copiar `whsec_...` → actualizar `STRIPE_WEBHOOK_SECRET` en producción
8. Cambiar a **modo Live** y repetir para claves de producción

---

## 🏷️ SISTEMA DE CATEGORÍAS (31 Enero 2026)

### ✅ Implementado

**Backend:**
- ✅ `/api/categories` - CRUD completo de categorías personalizadas
- ✅ Categorías por defecto si el usuario no tiene ninguna
- ✅ Validación de categorías duplicadas
- ✅ Protección: no eliminar categoría si hay transacciones usándola

**Frontend:**
- ✅ Página `/categories` - Gestión de categorías con UI bonita
- ✅ Modal para crear/editar categorías
- ✅ Selector de colores predefinidos
- ✅ Vista previa en tiempo real
- ✅ Tabs para separar ingresos/gastos
- ✅ TransactionForm carga categorías dinámicamente
- ✅ Link "Gestionar" desde el formulario de transacción
- ✅ Modo demo funcional (guarda en localStorage)

### SQL para ejecutar en Supabase:

```sql
-- Crear tabla de categorías personalizadas
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT 'tag',
  color TEXT DEFAULT '#D4AF37',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type, name)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- RLS (Row Level Security)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus propias categorías
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);
```

**⚠️ Ejecuta este SQL en Supabase SQL Editor para habilitar categorías personalizadas.**



flujo 
usuario paga, webhook con metadatos del cliente para crear el usuario dentro de supabase
dos ramas si el usuario no existe dentro de la database, se crea directamente con premium + magic link 
rama dos
wait 5 minutos
webhook para cambiar el estado de suscripcion


