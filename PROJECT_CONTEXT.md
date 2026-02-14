# Contexto del Proyecto: Finance Dashboard

> **Última actualización:** 5 de febrero de 2026

---

## 1. VISIÓN GENERAL

**Producto:** Dashboard SaaS de control de gastos e ingresos personales.

**Modelo de Negocio:** 
- Usuario paga suscripción mensual → Accede al dashboard completo
- Sin suscripción activa → Acceso bloqueado (página `/subscription-required`)

**Repositorios:**
- `finance-dashboard-web` → Frontend React (ESTE REPO)
- `finance-dashboard-api` → Backend Express (repo separado)

---

## 2. ARQUITECTURA ACTUAL (Febrero 2026)

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
                              ┌──────────────┐
                              │   FRONTEND   │
                              │  React/Vite  │
                              │  (Este repo) │
                              └──────┬───────┘
                                     │ API calls
                                     ▼
                              ┌──────────────┐
                              │   BACKEND    │
                              │   Express    │
                              │  (Node.js)   │
                              └──────┬───────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  PostgreSQL │  │    Auth     │  │     RLS     │  │ Edge Functions  │   │
│  │   (Datos)   │  │   (JWT)     │  │ (Seguridad) │  │   (Webhooks)    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┬────────┘   │
└────────────────────────────────────────────────────────────────┼───────────┘
                                                                 │
                                          ┌──────────────────────┘
                                          │ Webhook
                                          ▼
                              ┌──────────────────────┐
                              │    GoHighLevel       │
                              │  (CRM + Pagos)       │
                              │                      │
                              │  ┌────────────────┐  │
                              │  │    Stripe      │  │
                              │  │  (Procesador)  │  │
                              │  └────────────────┘  │
                              └──────────────────────┘
```

---

## 3. FLUJO DE PAGO Y SUSCRIPCIÓN

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO: CLIENTE PAGA SUSCRIPCIÓN                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐         ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ Cliente │         │   GHL   │         │ Stripe  │         │Supabase │
    │  paga   │────────▶│ Funnel  │────────▶│ Procesa │────────▶│  Edge   │
    │         │         │         │         │  pago   │         │Function │
    └─────────┘         └─────────┘         └─────────┘         └────┬────┘
                                                                     │
                                                                     ▼
                                                            ¿Usuario existe?
                                                                     │
                                            ┌────────────────────────┼────────────────────────┐
                                            │                        │                        │
                                            ▼                        ▼                        │
                                    ┌───────────────┐        ┌───────────────┐               │
                                    │   RAMA 1:     │        │   RAMA 2:     │               │
                                    │ Usuario EXISTE│        │ Usuario NUEVO │               │
                                    │               │        │               │               │
                                    │ → Actualizar  │        │ → Crear user  │               │
                                    │   status =    │        │ → Crear       │               │
                                    │   'active'    │        │   profile     │               │
                                    │               │        │ → status =    │               │
                                    │               │        │   'active'    │               │
                                    │               │        │ → Magic Link  │               │
                                    └───────────────┘        └───────────────┘               │
                                                                                              │
                                                                     ▼                        │
                                                            ┌───────────────┐                │
                                                            │   Usuario     │                │
                                                            │   accede al   │◀───────────────┘
                                                            │   Dashboard   │
                                                            └───────────────┘
```

---

## 4. STACK TECNOLÓGICO

| Componente | Tecnología | Estado |
|------------|------------|--------|
| **Frontend** | React 18 + Vite + Tailwind | ✅ Funcional |
| **Backend** | Express.js + Node.js | ✅ Funcional |
| **Base de Datos** | Supabase PostgreSQL | ✅ Configurada |
| **Autenticación** | Supabase Auth (JWT) | ✅ Funcional |
| **CRM/Ventas** | GoHighLevel | ✅ Conectado |
| **Procesador Pagos** | Stripe (via GHL) | ⚠️ Claves TEST |
| **Webhooks** | Supabase Edge Functions | ✅ Funcional |
| **Hosting** | VPS Ubuntu (pendiente) | ⏳ Por configurar |

---

## 5. BASE DE DATOS (Supabase)

### Tablas Actuales

```sql
-- PROFILES (usuarios)
profiles (
  id UUID PRIMARY KEY,          -- = auth.users.id
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_status TEXT,     -- 'none', 'active', 'cancelled'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- TRANSACTIONS (ingresos/gastos)
transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  type VARCHAR,                 -- 'income', 'expense'
  amount NUMERIC,
  category VARCHAR,
  description TEXT,
  date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- CATEGORIES (categorías personalizadas)
categories (
  id UUID PRIMARY KEY,
  user_id UUID,
  name TEXT,
  type TEXT,                    -- 'income', 'expense'
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
```

---

## 6. INTEGRACIONES

### 6.1 GoHighLevel → Supabase (Webhook)

**URL del Webhook:**
```
https://qpvlyeqbsvuunzitrclp.supabase.co/functions/v1/webhook-GHL
```

**Flujo:**
1. Cliente paga en funnel de GHL
2. GHL dispara workflow "Pago recibido"
3. Workflow envía webhook a Supabase Edge Function
4. Edge Function crea/actualiza usuario con `subscription_status = 'active'`

**Edge Function:** `supabase/functions/ghl-webhook/index.ts`

### 6.2 Stripe

**Estado:** Conectado a GHL con claves TEST

**Rol de Stripe:**
- GHL usa Stripe como procesador de pagos
- Stripe maneja la tarjeta/cobro real
- GHL recibe confirmación y dispara el webhook

**Claves (TEST):**
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 7. FUNCIONALIDADES IMPLEMENTADAS

### Frontend ✅
- [x] Login / Registro
- [x] Dashboard con gráficos (Recharts)
- [x] CRUD de transacciones
- [x] Categorías personalizadas
- [x] Metas de ahorro
- [x] Configuración de perfil
- [x] Cambio de contraseña
- [x] Página `/subscription-required`
- [x] Diseño dark theme + dorado
- [x] Responsive design

### Backend ✅
- [x] Auth endpoints (login, register, me)
- [x] CRUD transactions
- [x] CRUD categories
- [x] CRUD goals
- [x] Dashboard summary
- [x] Middleware de autenticación
- [x] Middleware de suscripción (deshabilitado temporalmente)

### Integraciones ✅
- [x] Supabase conectado
- [x] GHL webhook funcional
- [x] Edge Function para activar suscripción
- [x] Creación automática de usuarios desde webhook

---

## 8. PENDIENTES / TODO

### Crítico para Producción
- [ ] Configurar claves LIVE de Stripe
- [ ] **Webhook para cancelación de suscripción** ← FALTA
- [ ] Configurar dominio y SSL
- [ ] Variables de entorno en producción
- [ ] Habilitar middleware de suscripción en backend

### Mejoras
- [ ] Frontend: detectar primer login → modal crear contraseña
- [ ] Frontend: verificar `subscription_status` en rutas protegidas
- [ ] Configurar secreto de seguridad en webhook GHL
- [ ] Logging y monitoreo (Sentry)

---

## 9. VARIABLES DE ENTORNO

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Supabase Edge Functions (Secrets)
```
SUPABASE_URL (automático)
SUPABASE_SERVICE_ROLE_KEY (automático)
GHL_WEBHOOK_SECRET (opcional - para seguridad)
SITE_URL (para redirect de magic link)
```

---

## 10. ESTRUCTURA DEL REPOSITORIO (Frontend)

```
finance-dashboard-web/
├── src/
│   ├── components/
│   │   ├── layout/        # Header, Sidebar, Logo
│   │   └── ui/            # Button, Card, Input, Modal, etc.
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── Categories.jsx
│   │   ├── Goals.jsx
│   │   ├── Settings.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── SubscriptionRequired.jsx
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   └── globals.css
│   └── utils/
│       └── formatters.js
├── supabase/
│   └── functions/
│       └── ghl-webhook/   # Edge Function para webhooks de GHL
│           ├── index.ts
│           └── README.md
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
└── PROJECT_CONTEXT.md     # ESTE ARCHIVO
```
8. Backend verifica subscription.status === 'active'
              │
              ├── Inactivo → Bloquea acceso (403)
              │
              ▼
9. Usuario accede al Dashboard
```

---

## 7. Hoja de Ruta

### Fase 1: Fundación (Completado)
- [x] Definir arquitectura
- [x] Inicializar proyecto Node.js
- [x] Configurar estructura de carpetas
- [x] Endpoint `GET /health`
- [x] Configurar variables de entorno

### Fase 2: Integración Supabase (Completado)
- [x] Conectar cliente Supabase
- [x] Crear tablas en Supabase
- [x] Configurar RLS básico

### Fase 3: Autenticación (Completado)
- [x] Endpoint `POST /auth/login`
- [x] Endpoint `GET /auth/me`
- [x] Middleware de autenticación (JWT)
- [x] Middleware de verificación de suscripción

### Fase 4: Webhooks de Pago (Completado)
- [x] Endpoint `POST /webhooks/stripe`
- [x] Endpoint `POST /webhooks/gohighlevel` (Reemplazado por Stripe directo)
- [x] Validación de firmas
- [x] Lógica de activación/desactivación

### Fase 5: Dashboard API (Completado)
- [x] CRUD de transacciones
- [x] Endpoint de resumen financiero
- [x] Filtros por fecha/categoría

### Fase 5.5: Seguridad y Optimización (Pre-Despliegue) - ACTUAL
- [ ] Migrar almacenamiento de tokens (HttpOnly Cookies)
- [ ] Implementar Error Boundaries en Frontend
- [ ] Configurar variables de entorno para producción
- [ ] Auditoría de seguridad (no exponer .env, etc.)

### Fase 6: Despliegue
- [ ] Configurar Nginx en VPS
- [ ] Configurar PM2 para Node.js
- [ ] SSL con Let's Encrypt
- [ ] CI/CD básico (GitHub → VPS)

---

## 8. Estructura de Carpetas

```
finance-dashboard-api/
├── src/
│   ├── config/
│   │   ├── supabase.js      # Cliente Supabase
│   │   └── env.js           # Variables de entorno
│   ├── middlewares/
│   │   ├── auth.js          # Verificar JWT
│   │   └── subscription.js  # Verificar suscripción activa
│   ├── routes/
│   │   ├── auth.js
│   │   ├── webhooks.js
│   │   ├── transactions.js
│   │   └── dashboard.js
│   ├── services/
│   │   ├── stripe.js
│   │   ├── gohighlevel.js
│   │   └── subscription.js
│   ├── utils/
│   │   └── response.js      # Helpers de respuesta
│   └── index.js             # Entry point
├── .env.example
├── .gitignore
├── package.json
└── PROJECT_CONTEXT.md
```

---

## 9. Variables de Entorno

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx

# Stripe
STRIPE_SECRET_KEY=sk_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# GoHighLevel
GHL_WEBHOOK_SECRET=xxxx
```

---

## 10. Decisiones Técnicas

| Decisión | Justificación |
|----------|---------------|
| Backend propio | Control total de lógica de pagos y acceso |
| Supabase para DB/Auth | Reduce código de auth, PostgreSQL robusto |
| Express.js | Simplicidad, madurez, documentación |
| Middlewares separados | Auth y suscripción son concerns distintos |
| Webhooks validados | Seguridad: nunca confiar en entrada externa |

---

## 11. Cómo Probar la API

### A. Sin Frontend (Desarrollo)

#### Opción 1: cURL (Terminal)
```bash
# Health check
curl http://localhost:3000/health

# Login (cuando esté implementado)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "123456"}'

# Endpoint protegido (con token)
curl http://localhost:3000/dashboard/summary \
  -H "Authorization: Bearer <tu_jwt_token>"

# Crear transacción
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_jwt_token>" \
  -d '{"type": "expense", "amount": 50.00, "category": "food", "date": "2025-01-15"}'
```

#### Opción 2: Postman / Insomnia
1. Importar colección o crear requests manualmente
2. Configurar variable de entorno `base_url = http://localhost:3000`
3. Guardar token en variable después del login
4. Usar `{{token}}` en headers de requests protegidos

#### Opción 3: Extensión VS Code
- **Thunder Client** - Cliente REST integrado en VS Code
- **REST Client** - Archivos `.http` con requests

Ejemplo de archivo `requests.http`:
```http
### Health Check
GET http://localhost:3000/health

### Login
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "123456"
}

### Get Dashboard (reemplazar token)
GET http://localhost:3000/dashboard/summary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### B. Con Frontend (Integración)

#### Configuración CORS
El backend debe permitir requests del frontend:

```javascript
// En src/index.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3001',  // Otro puerto de desarrollo
    'https://tu-dominio.com'  // Producción
  ],
  credentials: true
}));
```

#### Flujo de Pruebas
```
1. Backend corriendo en localhost:3000
2. Frontend corriendo en localhost:5173
3. Frontend hace fetch a http://localhost:3000/api/...
4. Backend responde con JSON
5. Frontend renderiza datos
```

#### Variables de Entorno del Frontend
El frontend necesitará:
```env
VITE_API_URL=http://localhost:3000
```

---

### C. Simular Webhooks (Stripe/GoHighLevel)

#### Con cURL
```bash
# Simular webhook de Stripe (sin firma válida, solo desarrollo)
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "customer_email": "user@example.com",
        "status": "active"
      }
    }
  }'
```

#### Con Stripe CLI (Recomendado)
```bash
# Instalar Stripe CLI
# Iniciar túnel para webhooks locales
stripe listen --forward-to localhost:3000/webhooks/stripe

# En otra terminal, disparar eventos de prueba
stripe trigger customer.subscription.created
```

---

### D. Testing Automatizado (Futuro)

```
finance-dashboard-api/
├── tests/
│   ├── health.test.js
│   ├── auth.test.js
│   └── transactions.test.js
```

Herramientas recomendadas:
- **Jest** - Test runner
- **Supertest** - HTTP assertions

---

## 12. Comunicación con Frontend

### Contrato de API

El frontend consumirá esta API así:

```javascript
// En el frontend (React)
const API_URL = import.meta.env.VITE_API_URL;

// Login
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await response.json();

// Request protegido
const transactions = await fetch(`${API_URL}/transactions`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Formato de Respuestas (Estándar)

```javascript
// Éxito
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token inválido o expirado"
  }
}
```

---

## 13. Configuración de Stripe (Completado - Feb 3, 2026)

### ✅ Estado Actual

| Componente | Estado | Valor |
|------------|--------|-------|
| Cuenta vinculada | ✅ | **Agencia Master LLc** |
| `STRIPE_SECRET_KEY` | ✅ | `sk_test_51QpC58JxGOaMK16Z0QGkd...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_f0ac7c5fc2dffca2a0a3b91e14...` |
| Stripe CLI | ✅ | v1.35.0 instalado |
| Webhooks locales | ✅ | Funcionando |

### Claves Configuradas en Backend (.env)

```env
# Stripe (Cuenta: Agencia Master LLc)
STRIPE_SECRET_KEY=sk_test_51QpC58JxGOaMK16Z0QGkdBkQbuXWrGnIsWytGs7LbI3TPYqI7ELBAT8i3VYoYzpoaGDaX3CXjIVsUM6T6h8zqDhx00T0ArJWib
STRIPE_WEBHOOK_SECRET=whsec_f0ac7c5fc2dffca2a0a3b91e142e50d00a2ae69035fcb7661bc1ac606e8c510f
```

### Comandos para Desarrollo Local

```bash
# Terminal 1: Backend
cd "/home/garzon/Diana Cortes/finance-dashboard-api" && npm run dev

# Terminal 2: Stripe Listener (escucha webhooks)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Probar eventos
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.created
```

### Eventos de Webhook Manejados

| Evento | Acción |
|--------|--------|
| `checkout.session.completed` | Crea/activa suscripción |
| `invoice.paid` | Activa suscripción |
| `customer.subscription.created` | Crea suscripción |
| `customer.subscription.updated` | Actualiza estado |
| `customer.subscription.deleted` | Cancela suscripción |
| `invoice.payment_failed` | Marca como `past_due` |

### Para Producción

1. Crear webhook en [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. URL: `https://tu-dominio.com/api/webhooks/stripe`
3. Eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.*`
4. Copiar webhook secret de producción al `.env` del servidor

---

*Documento actualizado para reflejar arquitectura profesional con separación clara de responsabilidades.*
