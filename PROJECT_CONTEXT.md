# Contexto del Proyecto: Finance Dashboard

> **Última actualización:** 19 de febrero de 2026

---

## 1. VISIÓN GENERAL

**Producto:** Dashboard SaaS de control de gastos e ingresos personales.
**Nombre:** Sabiduría Empresarial — Finanzas Sabias
**URL Producción:** `https://app.sabiduriaempresarial.com`

**Modelo de Negocio:**
- Usuario paga suscripción mensual via GHL/Stripe → Webhook activa cuenta
- Sin suscripción activa → Acceso bloqueado (403 en login)

**Repositorios (ambos en `/home/garzon/Diana Cortes/`):**
- `finance-dashboard-web` → Frontend React (ESTE REPO)
- `finance-dashboard-api` → Backend Express (repo separado)

---

## 2. ARQUITECTURA ACTUAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA DEL SISTEMA                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   CLIENTE    │
                              │   (Browser)  │
                              └──────┬───────┘
                                     │
                                     ▼
                    ┌──────────────────────────────┐
                    │   FRONTEND (React/Vite)      │
                    │   Cloudways: Puerto 5173     │
                    │   PM2: finance-dashboard     │
                    │   server.js → sirve dist/    │
                    └──────────────┬───────────────┘
                                   │ API calls (/api/...)
                                   ▼
                    ┌──────────────────────────────┐
                    │   BACKEND (Express)          │
                    │   Cloudways: Puerto 3000     │
                    │   PM2: finance-api           │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                       │
│  URL: https://qpvlyeqbsvuunzitrclp.supabase.co                            │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  PostgreSQL │  │    Auth     │  │     RLS     │  │ Edge Functions  │   │
│  │   (Datos)   │  │   (JWT)     │  │ (Seguridad) │  │   (Webhooks)    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┬────────┘   │
└────────────────────────────────────────────────────────────────┼───────────┘
                                                                 │
                                          ┌──────────────────────┘
                                          │ Webhook POST
                                          ▼
                              ┌──────────────────────┐
                              │    GoHighLevel       │
                              │  (CRM + Funnel)      │
                              │                      │
                              │  ┌────────────────┐  │
                              │  │    Stripe      │  │
                              │  │  (Procesador)  │  │
                              │  └────────────────┘  │
                              └──────────────────────┘
```

---

## 3. HOSTING (Cloudways)

**Servidor:** Cloudways (phpstack-1586651-6199103.cloudwaysapps.com)
**Ruta base:** `/home/1586651.cloudwaysapps.com/tbfckhgqye/public_html/`

**Procesos PM2:**

| ID | Nombre | Puerto | Descripción |
|----|--------|--------|-------------|
| 3 | finance-api | 3000 | Backend Express |
| 2 | finance-dashboard | 5173 | Frontend (server.js sirve dist/) |
| 0 | n8n-pro | - | n8n automations |

**Frontend en producción:**
- `server.js` → Express que sirve `dist/` (archivos estáticos del build)
- Fallback SPA: todas las rutas devuelven `index.html` para que React Router funcione
- Build: `npm run build` genera `dist/`

**Comandos útiles en VPS:**
```bash
# Ver procesos
pm2 list

# Reiniciar backend
pm2 restart finance-api

# Reiniciar frontend
pm2 restart finance-dashboard

# Ver logs
pm2 logs finance-api --lines 50
pm2 logs finance-dashboard --lines 50

# Actualizar código
cd public_html/finance-dashboard-web
git pull origin main
npm install
npm run build
pm2 restart finance-dashboard

cd public_html/finance-dashboard-api
git pull origin main
npm install  # solo si hay nuevas dependencias
pm2 restart finance-api
```

---

## 4. FLUJO DE PAGO Y ONBOARDING (✅ IMPLEMENTADO)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               FLUJO COMPLETO: PAGO → ACCESO AL DASHBOARD                    │
└─────────────────────────────────────────────────────────────────────────────┘

  1. Cliente paga en funnel de GHL (Stripe procesa)
                │
                ▼
  2. GHL dispara workflow → webhook POST a Edge Function
     URL: https://qpvlyeqbsvuunzitrclp.supabase.co/functions/v1/ghl-webhook
                │
                ▼
  3. Edge Function (supabase/functions/ghl-webhook/index.ts):
     ¿Usuario existe en profiles?
                │
        ┌───────┴───────┐
        ▼               ▼
   RAMA 1: EXISTE   RAMA 2: NUEVO
   → Actualizar     → inviteUserByEmail()
     status =       → Crear profile con
     'active'         status = 'active'
                    → Email con magic link
                      (redirectTo: /auth/callback)
                │               │
                └───────┬───────┘
                        ▼
  4. Usuario recibe email → clic en magic link
                        │
                        ▼
  5. /auth/callback (AuthCallback.jsx):
     → exchangeCodeForSession(code)
     → Redirige a /create-password
                        │
                        ▼
  6. /create-password (CreatePassword.jsx):
     → Usuario establece contraseña
     → supabase.auth.updateUser({ password })
     → Auto-login via backend API
     → Redirige a /dashboard
                        │
                        ▼
  7. Login en backend (/api/auth/login):
     → subscriptionService.getActive(userId)
       → PRIMERO: busca profiles.subscription_status === 'active'
       → FALLBACK: busca tabla subscriptions con status 'active'
     → Si activo → JWT + acceso completo
     → Si inactivo → 403 SUBSCRIPTION_INACTIVE
```

---

## 5. STACK TECNOLÓGICO

| Componente | Tecnología | Estado |
|------------|------------|--------|
| **Frontend** | React 18 + Vite + Tailwind | ✅ Producción |
| **Backend** | Express.js + Node.js | ✅ Producción |
| **Base de Datos** | Supabase PostgreSQL | ✅ Producción |
| **Autenticación** | Supabase Auth (JWT) | ✅ Producción |
| **Cliente Supabase (FE)** | @supabase/supabase-js | ✅ Para magic link/password |
| **CRM/Ventas** | GoHighLevel | ✅ Conectado |
| **Procesador Pagos** | Stripe (via GHL) | ✅ Claves TEST |
| **Webhooks** | Supabase Edge Functions | ✅ Producción |
| **Hosting** | Cloudways (PM2) | ✅ Producción |
| **UI** | Dark theme + dorado (#D4AF37) | ✅ |

---

## 6. BASE DE DATOS (Supabase)

### Tablas Actuales

```sql
-- PROFILES (usuarios + estado de suscripción)
profiles (
  id UUID PRIMARY KEY,              -- = auth.users.id
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_status TEXT,         -- 'none' | 'active' | 'cancelled'
  created_at TIMESTAMP,             -- ← FUENTE DE VERDAD para acceso
  updated_at TIMESTAMP
)

-- TRANSACTIONS (ingresos/gastos)
transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  type VARCHAR,                     -- 'income', 'expense'
  amount NUMERIC,
  category VARCHAR,                 -- Income: 'VENTA'|'CARTERA'|'OTRO', Expense: categoría libre
  description TEXT,                 -- Expense: notas
  date DATE,
  -- Campos de INGRESOS (solo para type='income')
  invoice_number TEXT,              -- Nº de factura
  client_document TEXT,             -- Documento del cliente (NIT/CC)
  client_name TEXT,                 -- Nombre del cliente
  client_address TEXT,              -- Dirección del cliente
  client_email TEXT,                -- Correo del cliente
  client_phone TEXT,                -- Teléfono del cliente
  invoice_status TEXT,              -- 'FACTURADO' | 'NO FACTURADO'
  -- Campos de GASTOS (solo para type='expense')
  provider_document TEXT,           -- Documento del proveedor (NIT/CC)
  provider_name TEXT,               -- Nombre del proveedor
  payment_method TEXT,              -- Método de pago (Bancolombia, Nequi, etc.)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- CATEGORIES (categorías personalizadas)
categories (
  id UUID PRIMARY KEY,
  user_id UUID,
  name TEXT,
  type TEXT,                        -- 'income', 'expense'
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- GOALS (metas de ahorro)
goals (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR,
  target NUMERIC,
  current NUMERIC,
  color VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- SUBSCRIPTIONS (legacy/Stripe directo - fallback)
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  provider TEXT,
  external_id TEXT,
  status TEXT,                      -- 'active', 'cancelled', 'past_due'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Lógica de Verificación de Suscripción (subscriptionService.getActive)

```
1. Busca profiles.subscription_status === 'active' → ✅ acceso
2. Si no, busca en tabla subscriptions WHERE status = 'active' → ✅ acceso
3. Si ninguno → ❌ 403 SUBSCRIPTION_INACTIVE
```

**¿Por qué dos fuentes?**
- `profiles.subscription_status` → Lo actualiza el **Edge Function de GHL** (flujo principal)
- `subscriptions` tabla → Lo actualiza el **backend Express via Stripe webhooks** (legacy/futuro)

---

## 7. INTEGRACIONES

### 7.1 GoHighLevel → Supabase Edge Function (FLUJO PRINCIPAL)

**URL del Webhook:**
```
https://qpvlyeqbsvuunzitrclp.supabase.co/functions/v1/ghl-webhook
```

**Edge Function:** `supabase/functions/ghl-webhook/index.ts`

**Flujo:**
1. GHL dispara workflow → POST al Edge Function
2. Extrae email, nombre, teléfono del payload
3. Si usuario existe → actualiza `profiles.subscription_status = 'active'`
4. Si no existe → `inviteUserByEmail()` + crea profile con status active

**redirectTo del magic link:**
```
https://app.sabiduriaempresarial.com/auth/callback
```

### 7.2 Supabase Dashboard Config (IMPORTANTE)

**Authentication → URL Configuration:**
- **Site URL:** `https://app.sabiduriaempresarial.com`
- **Redirect URLs:** `https://app.sabiduriaempresarial.com/auth/callback`

**Edge Function Secrets:**
- `SITE_URL` = `https://app.sabiduriaempresarial.com`
- `GHL_WEBHOOK_SECRET` = (opcional, para seguridad)

### 7.3 Stripe (via GHL)

**Estado:** Stripe es el procesador de pagos conectado a GHL. No se usa directamente desde la app por ahora.

**Backend tiene handlers para Stripe webhooks** en `/api/webhooks/stripe` (para uso futuro directo si se necesita).

### 7.4 Google Sheets — Sincronización Bidireccional (⏳ PLANIFICADO — 18 Feb 2026)

**Contexto:** La app actual de la cliente ES un Google Sheet. Cada usuario tiene su propio Sheet. Se necesita sincronización bidireccional: cambios en la app se reflejan en el Sheet y viceversa.

**Plan de implementación en 3 fases:**

#### Fase 1: Adaptar la app a la estructura del Sheet (EN PROGRESO)
- Modificar las tablas de Supabase para que manejen las mismas columnas/datos que el Sheet
- Ajustar la UI (páginas, formularios, dashboard) para reflejar los nuevos campos
- Ajustar el backend (endpoints, servicios) para los nuevos datos
- **Resultado:** La app funciona con los mismos datos que el Sheet, pero sin conexión aún

#### Fase 2: Configurar Google Cloud + OAuth
- Crear proyecto en [console.cloud.google.com](https://console.cloud.google.com) (gratis)
- Habilitar **Google Sheets API** + **Google Drive API**
- Crear credenciales **OAuth 2.0** (Client ID + Client Secret)
- Configurar pantalla de consentimiento
- Redirect URI: `https://app.sabiduriaempresarial.com/api/google/callback`

#### Fase 3: Implementar conexión Google Sheets
**Nueva tabla en Supabase:**
```sql
google_connections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP
)
```

**Nuevos endpoints en Backend:**

| Endpoint | Función |
|----------|---------|
| `GET /api/google/auth` | Genera URL de autorización de Google |
| `GET /api/google/callback` | Recibe tokens de Google (redirect) |
| `GET /api/google/status` | ¿Está conectado? ¿Cuándo sincronizó? |
| `POST /api/google/sync` | Sincronizar ahora (manual) |
| `DELETE /api/google/disconnect` | Desconectar Google |

**Flujo de conexión del usuario:**
```
Usuario → "Conectar Google Sheet" (botón en Settings)
       → Google muestra pantalla de permisos
       → Usuario acepta → Google devuelve tokens
       → Backend guarda tokens en google_connections
       → App puede leer/escribir el Sheet del usuario
```

**Librería:** `googleapis` (npm) — en el backend

**Costo:** $0 — Google Sheets API es gratis (500 req/100seg por proyecto)

**NOTA:** El login sigue siendo email/password. Google OAuth es SOLO para autorizar acceso al Sheet, no para autenticarse en la app.

---

## 8. FUNCIONALIDADES IMPLEMENTADAS

### Frontend ✅
- [x] Login / Registro
- [x] Dashboard → **Informe Mensual** (INFORME MES A MES)
  - Navegador de mes/año
  - Resultado (Ingresos − Gastos)
  - Ingresos por Tipo (VENTA/CARTERA/OTRO) con % y pie chart
  - Gastos por Categoría con % y pie chart
  - Tablas detalle: Ingresos (fecha, factura, tipo, nombre, monto, status) y Gastos (fecha, proveedor, categoría, método, monto)
- [x] **Informe Anual** (`/annual-report`) — página nueva
  - Selector de año
  - Grilla Ingresos: tipo × mes (Ene-Dic) con totales
  - Grilla Gastos: categoría × mes (Ene-Dic) con totales
  - Grilla Resultado mensual
  - Gráfico de barras Ingresos vs Gastos
- [x] **Formulario de Ingresos** con campos:
  - Factura Nº, Tipo (VENTA/CARTERA/OTRO), Datos del cliente (documento, nombre, dirección, correo, teléfono), Estado facturación
- [x] **Formulario de Gastos** con campos:
  - Proveedor (documento, nombre), Categoría, Método de Pago (Bancolombia, Davivienda, Nequi, etc.), Notas
- [x] **Lista de Transacciones** con pestañas Ingresos/Gastos y columnas específicas por tipo
- [x] CRUD de transacciones
- [x] Categorías personalizadas
- [x] Metas de ahorro
- [x] Configuración de perfil
- [x] Cambio de contraseña
- [x] Página `/subscription-required`
- [x] Página `/auth/callback` (procesa magic link de Supabase)
- [x] Página `/create-password` (usuario nuevo establece contraseña)
- [x] Cliente Supabase en frontend (`src/lib/supabase.js`)
- [x] Diseño dark theme + dorado
- [x] Responsive design
- [x] Moneda COP (pesos colombianos)

### Backend ✅
- [x] Auth endpoints (login, register, me, profile, password)
- [x] CRUD transactions (con campos extendidos para ingresos/gastos)
- [x] CRUD categories
- [x] CRUD goals
- [x] Dashboard summary (incluye `incomesByCategory`)
- [x] Middleware de autenticación (JWT)
- [x] Middleware de suscripción (verifica profiles → fallback subscriptions)
- [x] Webhooks Stripe (handlers listos)
- [x] Webhooks GHL (endpoint disponible)

### Integraciones ✅
- [x] Supabase conectado (backend + frontend)
- [x] GHL webhook → Edge Function funcional y probado
- [x] Edge Function crea usuarios + envía magic link
- [x] Flujo completo: pago → webhook → magic link → create password → dashboard

---

## 9. PENDIENTES / TODO

### Para Beta
- [ ] Webhook para **cancelación** de suscripción (cuando usuario deja de pagar)
- [ ] Secreto de seguridad en webhook GHL (`GHL_WEBHOOK_SECRET`)
- [ ] Página de error amigable si magic link expirado

### Para Producción
- [ ] Configurar claves **LIVE** de Stripe (cuando salga de beta)
- [ ] Migrar tokens a httpOnly cookies (seguridad)
- [ ] Error Boundaries en frontend
- [ ] Logging y monitoreo (Sentry)
- [ ] Tests básicos

### Nice to Have
- [ ] Lazy loading de rutas
- [ ] PWA (instalable en móvil)
- [ ] Modo claro (actualmente solo dark)
- [ ] Accesibilidad (a11y)

---

## 10. VARIABLES DE ENTORNO

### Frontend (.env) — Producción
```env
VITE_API_URL=/api
VITE_SUPABASE_URL=https://qpvlyeqbsvuunzitrclp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend (.env) — Desarrollo Local
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://qpvlyeqbsvuunzitrclp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://qpvlyeqbsvuunzitrclp.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=sabiduria-empresarial-jwt-secret-2026
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GHL_WEBHOOK_SECRET=
```

---

## 11. ESTRUCTURA DE REPOSITORIOS

### Frontend (finance-dashboard-web)
```
finance-dashboard-web/
├── src/
│   ├── components/
│   │   ├── layout/           # Header, Sidebar, Logo, DashboardLayout
│   │   └── ui/               # Button, Card, Input, Modal, Select, Spinner
│   ├── context/
│   │   └── AuthContext.jsx    # Estado global de auth (user, token, login, logout)
│   ├── lib/
│   │   └── supabase.js       # Cliente Supabase (para magic link / password)
│   ├── pages/
│   │   ├── AuthCallback.jsx   # /auth/callback — procesa magic link
│   │   ├── CreatePassword.jsx # /create-password — usuario nuevo crea contraseña
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── TransactionForm.jsx
│   │   ├── Categories.jsx
│   │   ├── Goals.jsx
│   │   ├── Settings.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── SubscriptionRequired.jsx
│   ├── services/
│   │   └── api.js             # Cliente HTTP (fetch) contra backend Express
│   ├── styles/
│   │   └── globals.css
│   └── utils/
│       └── formatters.js
├── supabase/
│   └── functions/
│       └── ghl-webhook/       # Edge Function para webhooks de GHL
│           └── index.ts
├── server.js                   # Express estático para producción (sirve dist/)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── PROJECT_CONTEXT.md          # ESTE ARCHIVO
```

### Backend (finance-dashboard-api)
```
finance-dashboard-api/
├── src/
│   ├── config/
│   │   ├── supabase.js        # Clientes Supabase (anon + admin)
│   │   └── env.js             # Variables de entorno
│   ├── middlewares/
│   │   ├── auth.js            # Verificar JWT
│   │   ├── subscription.js    # Verificar suscripción (profiles → subscriptions)
│   │   └── validate.js        # Validar body
│   ├── routes/
│   │   ├── auth.js            # Login, register, me, profile, password
│   │   ├── webhooks.js        # Stripe + GHL webhook endpoints
│   │   ├── transactions.js
│   │   ├── dashboard.js
│   │   ├── goals.js
│   │   └── categories.js
│   ├── services/
│   │   ├── stripe.js          # Handler de eventos Stripe
│   │   ├── gohighlevel.js     # Handler de eventos GHL
│   │   └── subscription.js    # getActive() → profiles PRIMERO, subscriptions FALLBACK
│   ├── utils/
│   │   └── response.js
│   └── index.js               # Entry point Express
├── .env
├── server.log
├── start.sh
└── package.json
```

---

## 12. RUTAS DEL FRONTEND

| Ruta | Componente | Tipo | Descripción |
|------|-----------|------|-------------|
| `/login` | Login | PublicRoute | Inicio de sesión |
| `/register` | Register | PublicRoute | Crear cuenta |
| `/auth/callback` | AuthCallback | Sin guardia | Procesa magic link de Supabase |
| `/create-password` | CreatePassword | Sin guardia | Nuevo usuario crea contraseña |
| `/subscription-required` | SubscriptionRequired | Sin guardia | Suscripción inactiva |
| `/dashboard` | Dashboard | ProtectedRoute | Informe Mensual (mes a mes) |
| `/transactions` | Transactions | ProtectedRoute | Lista con pestañas Ingresos/Gastos |
| `/transactions/new` | TransactionForm | ProtectedRoute | Crear ingreso o gasto |
| `/transactions/:id` | TransactionForm | ProtectedRoute | Editar transacción |
| `/annual-report` | AnnualReport | ProtectedRoute | Informe Anual (tipo × mes) |
| `/goals` | Goals | ProtectedRoute | Metas de ahorro |
| `/categories` | Categories | ProtectedRoute | Categorías |
| `/settings` | Settings | ProtectedRoute | Configuración |

**Tipos de ruta:**
- `PublicRoute` → Si ya autenticado, redirige a `/dashboard`
- `ProtectedRoute` → Si no autenticado, redirige a `/login`
- `Sin guardia` → Accesible siempre (auth/callback necesita esto)

---

## 13. ENDPOINTS DEL BACKEND

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | No | Estado del servidor |
| POST | `/api/auth/login` | No | Login (verifica suscripción en prod) |
| POST | `/api/auth/register` | No | Registro |
| GET | `/api/auth/me` | Sí | Datos usuario + suscripción |
| PUT | `/api/auth/profile` | Sí | Actualizar nombre |
| PUT | `/api/auth/password` | Sí | Cambiar contraseña |
| GET | `/api/dashboard/summary` | Sí | Resumen financiero |
| GET | `/api/transactions` | Sí | Listar transacciones |
| POST | `/api/transactions` | Sí | Crear transacción |
| PUT | `/api/transactions/:id` | Sí | Editar transacción |
| DELETE | `/api/transactions/:id` | Sí | Eliminar transacción |
| GET | `/api/goals` | Sí | Listar metas |
| POST | `/api/goals` | Sí | Crear meta |
| PUT | `/api/goals/:id` | Sí | Editar meta |
| DELETE | `/api/goals/:id` | Sí | Eliminar meta |
| GET | `/api/categories` | Sí | Listar categorías |
| POST | `/api/categories` | Sí | Crear categoría |
| PUT | `/api/categories/:id` | Sí | Editar categoría |
| DELETE | `/api/categories/:id` | Sí | Eliminar categoría |
| POST | `/api/webhooks/stripe` | Firma | Webhooks de Stripe |
| POST | `/api/webhooks/gohighlevel` | Firma | Webhooks de GHL |

---

## 14. DECISIONES TÉCNICAS

| Decisión | Justificación |
|----------|---------------|
| profiles.subscription_status como fuente primaria | El webhook de GHL actualiza profiles, no la tabla subscriptions |
| subscriptions como fallback | Para compatibilidad futura con Stripe directo |
| Supabase client en frontend | Necesario para exchangeCodeForSession() y updateUser({ password }) |
| server.js con Express para producción | Cloudways necesita un servidor Node que sirva los archivos estáticos |
| Rutas /auth/callback y /create-password sin guardia | El usuario llega sin sesión del backend (solo tiene sesión Supabase del magic link) |
| inviteUserByEmail en Edge Function | Crea usuario Y envía email de invitación en un solo paso |

---

## 15. PROBAR FLUJO DE ONBOARDING

```bash
# Simular webhook de GHL (usar email real al que tengas acceso)
curl -X POST https://qpvlyeqbsvuunzitrclp.supabase.co/functions/v1/ghl-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@gmail.com",
    "full_name": "Test User",
    "phone": "+1234567890",
    "status": "won",
    "invoice": { "status": "paid" }
  }'

# Resultado esperado:
# 1. Email de invitación llega a tu-email@gmail.com
# 2. Clic en el link → /auth/callback → /create-password
# 3. Crear contraseña → auto-login → /dashboard
```

---

*Documento actualizado el 17 de febrero de 2026 — refleja la arquitectura real desplegada en producción.*
