# 📋 DÍA UNO - Documento Pivote de Desarrollo

> **IMPORTANTE PARA LA SIGUIENTE IA**: Este archivo es un documento pivote que contiene TODO el contexto del proyecto desarrollado en la sesión del 29 de enero de 2026. Léelo completamente antes de hacer cualquier cambio.

---

## 📌 PROPÓSITO DE ESTE ARCHIVO

Este archivo sirve como **punto de referencia central** para cualquier IA o desarrollador que continúe el trabajo. Contiene:
- Arquitectura completa del proyecto
- Estado actual de implementación
- Qué funciona y qué no
- Qué es mock/demo y qué es real
- Próximos pasos recomendados
- Credenciales y configuración

---

## 🏢 INFORMACIÓN DEL PROYECTO

### Nombre del Proyecto
**Sabiduría Empresarial - Finanzas Sabias**

### Descripción
Plataforma SaaS de control de gastos e ingresos personales/empresariales. Dashboard financiero profesional con:
- Autenticación de usuarios
- Gestión de transacciones (ingresos/gastos)
- Dashboard con gráficos de rendimiento
- Sistema de metas financieras
- Preparado para suscripciones con Stripe (NO IMPLEMENTADO AÚN)

### Paleta de Colores
- **Negro**: Fondo principal (`#0A0A0A`, `#1A1A1A`)
- **Blanco**: Textos principales
- **Dorado**: Color de acento (`#D4AF37`)

---

## 🏗️ ARQUITECTURA DEL PROYECTO

### Ubicación de Archivos

```
/home/garzon/Diana Cortes/
├── finance-dashboard-web/     # Frontend (React + Vite)
├── finance-dashboard-api/     # Backend (Express + Supabase)
└── start-all.sh               # Script para iniciar ambos servicios
```

### Stack Tecnológico

#### Frontend (`finance-dashboard-web`)
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.2.0 | Framework UI |
| Vite | 5.0.10 | Build tool |
| React Router DOM | 6.21.0 | Enrutamiento |
| Tailwind CSS | 3.4.0 | Estilos |
| Recharts | 2.10.3 | Gráficos |
| Lucide React | 0.303.0 | Íconos |
| date-fns | 3.2.0 | Manejo de fechas |
| clsx | 2.1.0 | Clases CSS condicionales |

#### Backend (`finance-dashboard-api`)
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Express | 4.18.2 | Framework HTTP |
| @supabase/supabase-js | 2.39.0 | Cliente Supabase |
| Helmet | 7.1.0 | Seguridad HTTP headers |
| Morgan | 1.10.0 | Logging HTTP |
| CORS | 2.8.5 | Cross-Origin |
| jsonwebtoken | 9.0.2 | JWT (aunque Supabase maneja auth) |
| Stripe | 14.10.0 | Pagos (NO CONFIGURADO) |
| express-rate-limit | 7.1.5 | Rate limiting |

#### Base de Datos
- **Supabase** (PostgreSQL administrado)
- Proyecto: `qpvlyeqbsvuunzitrclp`
- Auth: Supabase Auth (email confirmación DESHABILITADA para desarrollo)

---

## 📁 ESTRUCTURA DE ARCHIVOS DETALLADA

### Frontend (`finance-dashboard-web/src/`)

```
src/
├── main.jsx                    # Punto de entrada de React
├── App.jsx                     # Rutas principales
├── components/
│   ├── ProtectedRoute.jsx      # HOC para rutas protegidas
│   ├── layout/
│   │   ├── index.js            # Exportaciones
│   │   ├── DashboardLayout.jsx # Layout principal con sidebar
│   │   ├── Header.jsx          # Barra superior
│   │   ├── Sidebar.jsx         # Menú lateral
│   │   └── Logo.jsx            # Logo de la empresa
│   └── ui/
│       ├── index.js            # Exportaciones
│       ├── Button.jsx          # Componente botón reutilizable
│       ├── Card.jsx            # Componente tarjeta
│       ├── Input.jsx           # Input de formulario
│       ├── Select.jsx          # Select dropdown
│       ├── Modal.jsx           # Modal y ConfirmModal
│       └── Spinner.jsx         # Indicador de carga
├── context/
│   └── AuthContext.jsx         # Contexto de autenticación
├── pages/
│   ├── Login.jsx               # Página de login
│   ├── Register.jsx            # Página de registro
│   ├── Dashboard.jsx           # Dashboard principal con gráficos
│   ├── Transactions.jsx        # Lista de transacciones
│   ├── TransactionForm.jsx     # Crear/editar transacción
│   ├── Goals.jsx               # Gestión de metas financieras
│   ├── Settings.jsx            # Configuración de usuario
│   └── SubscriptionRequired.jsx # Página de suscripción requerida
├── services/
│   └── api.js                  # Cliente HTTP para el backend
├── styles/
│   └── index.css               # Estilos globales (Tailwind)
└── utils/
    └── formatters.js           # Formateo de moneda y fechas
```

### Backend (`finance-dashboard-api/src/`)

```
src/
├── index.js                    # Servidor Express principal
├── config/
│   ├── env.js                  # Variables de entorno
│   └── supabase.js             # Cliente Supabase
├── middlewares/
│   ├── auth.js                 # Middleware de autenticación JWT
│   ├── subscription.js         # Verificación de suscripción
│   └── validate.js             # Validación de datos
├── routes/
│   ├── auth.js                 # /api/auth/* (login, register, me)
│   ├── transactions.js         # /api/transactions/* (CRUD)
│   ├── dashboard.js            # /api/dashboard/* (summary, stats)
│   └── webhooks.js             # /api/webhooks/* (Stripe, GHL)
├── services/
│   ├── stripe.js               # Servicio Stripe (NO CONFIGURADO)
│   ├── gohighlevel.js          # Servicio GoHighLevel (NO CONFIGURADO)
│   └── subscription.js         # Lógica de suscripciones
└── utils/
    └── response.js             # Helpers para respuestas JSON
```

---

## 🔌 ENDPOINTS DE LA API

### Autenticación (`/api/auth`)
| Método | Ruta | Descripción | Auth Requerida |
|--------|------|-------------|----------------|
| POST | `/api/auth/register` | Registro de usuario | No |
| POST | `/api/auth/login` | Inicio de sesión | No |
| GET | `/api/auth/me` | Obtener perfil del usuario | Sí |

### Transacciones (`/api/transactions`)
| Método | Ruta | Descripción | Auth Requerida |
|--------|------|-------------|----------------|
| GET | `/api/transactions` | Listar transacciones | Sí |
| GET | `/api/transactions/:id` | Obtener una transacción | Sí |
| POST | `/api/transactions` | Crear transacción | Sí |
| PUT | `/api/transactions/:id` | Actualizar transacción | Sí |
| DELETE | `/api/transactions/:id` | Eliminar transacción | Sí |

### Dashboard (`/api/dashboard`)
| Método | Ruta | Descripción | Auth Requerida |
|--------|------|-------------|----------------|
| GET | `/api/dashboard/summary` | Resumen del mes (balance, totales) | Sí |
| GET | `/api/dashboard/stats` | Estadísticas de 6 meses | Sí |

### Webhooks (`/api/webhooks`)
| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| POST | `/api/webhooks/stripe` | Eventos de Stripe | NO CONFIGURADO |
| POST | `/api/webhooks/ghl` | Eventos de GoHighLevel | NO CONFIGURADO |

### Health Check
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servidor |

---

## ⚙️ CONFIGURACIÓN Y CREDENCIALES

### Variables de Entorno del Backend (`.env`)

```bash
# Server
PORT=3000
NODE_ENV=development

# Supabase (CONFIGURADO Y FUNCIONANDO)
SUPABASE_URL=https://qpvlyeqbsvuunzitrclp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdmx5ZXFic3Z1dW56aXRyY2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTc5NDgsImV4cCI6MjA4NTI5Mzk0OH0.lRqDM39mhvHUhDG3h-94R9nihvUbJMMfS0DRYYB-gjI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdmx5ZXFic3Z1dW56aXRyY2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcxNzk0OCwiZXhwIjoyMDg1MjkzOTQ4fQ._OTt3TzqNu7jd-lkIXRmHHqTkwD6hi1Mbh6NniykaH8

# JWT
JWT_SECRET=sabiduria-empresarial-jwt-secret-2026

# Stripe (NO CONFIGURADO - VACÍO)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# GoHighLevel (NO CONFIGURADO - VACÍO)
GHL_WEBHOOK_SECRET=

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173
```

### Variables de Entorno del Frontend (`.env.local`)

```bash
VITE_API_URL=http://localhost:3000
```

> **NOTA**: En `src/services/api.js` la URL está hardcodeada como `http://localhost:3000/api` porque hubo problemas con las variables de entorno de Vite.

### Usuario de Prueba Registrado

| Campo | Valor |
|-------|-------|
| Email | sebasgarzon610@gmail.com |
| Password | 12345678 |
| Estado | Activo, puede hacer login |

### Modo Demo

El sistema tiene un modo demo para visualización sin backend:
- Si el email contiene "demo" o es `demo@demo.com`, se activa el modo demo
- Usa datos hardcodeados en `DEMO_DATA` (ver Dashboard.jsx)
- El token empieza con `demo-jwt-token-`

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS (Supabase)

### Tabla `transactions`

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS habilitado
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus transacciones
CREATE POLICY "Users can only access their own transactions"
ON transactions FOR ALL
USING (auth.uid() = user_id);
```

### Notas sobre Auth
- Supabase Auth maneja usuarios automáticamente en `auth.users`
- **Email confirmation está DESHABILITADO** en el proyecto de Supabase para facilitar desarrollo
- El login devuelve un token JWT de Supabase que se envía en header `Authorization: Bearer <token>`

---

## 🚀 CÓMO INICIAR EL PROYECTO

### Opción 1: Script Automatizado (Recomendado)

```bash
cd "/home/garzon/Diana Cortes"
chmod +x start-all.sh
./start-all.sh
```

Este script:
1. Mata procesos anteriores
2. Inicia el backend en puerto 3000
3. Inicia el frontend en puerto 5173
4. Verifica que ambos estén corriendo

### Opción 2: Manual

**Terminal 1 - Backend:**
```bash
cd "/home/garzon/Diana Cortes/finance-dashboard-api"
npm run dev
# O para background:
npm run start:bg
```

**Terminal 2 - Frontend:**
```bash
cd "/home/garzon/Diana Cortes/finance-dashboard-web"
npm run dev
```

### URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Health Check | http://localhost:3000/health |

### Comandos Útiles

```bash
# Ver logs del backend
tail -f "/home/garzon/Diana Cortes/finance-dashboard-api/server.log"

# Ver logs del frontend
tail -f "/home/garzon/Diana Cortes/finance-dashboard-web/frontend.log"

# Detener todo
pkill -f "node src/index.js"; pkill -f vite

# Verificar puertos
ss -tlnp | grep -E "3000|5173"
```

---

## ✅ FUNCIONALIDADES COMPLETADAS

### Frontend

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Login | ✅ Funcionando | Conectado a Supabase Auth |
| Registro | ✅ Funcionando | Conectado a Supabase Auth |
| Dashboard | ✅ Funcionando | Muestra datos reales de la API |
| Gráfico Ingresos vs Gastos | ✅ Funcionando | Datos de últimos 6 meses |
| Gráfico Actividad Semanal | ⚠️ Parcial | Calcula desde transacciones, pero puede estar vacío |
| Gráfico Gastos por Categoría | ✅ Funcionando | Pie chart con datos reales |
| Lista de Transacciones | ✅ Funcionando | Con filtros y paginación |
| Crear Transacción | ✅ Funcionando | Ingresos y gastos |
| Editar Transacción | ✅ Funcionando | |
| Eliminar Transacción | ✅ Funcionando | Con confirmación |
| Metas Financieras | ✅ Funcionando | CRUD completo |
| Configuración | ⚠️ Parcial | UI existe, pero no guarda datos |
| Sidebar responsive | ✅ Funcionando | |
| Modo oscuro | ✅ Por defecto | Solo modo oscuro |

### Backend

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Autenticación | ✅ Funcionando | Via Supabase Auth |
| CRUD Transacciones | ✅ Funcionando | Con RLS en Supabase |
| Dashboard Summary | ✅ Funcionando | Balance, totales, categorías |
| Dashboard Stats | ✅ Funcionando | Datos mensuales de 6 meses |
| Validación de datos | ✅ Funcionando | Middleware de validación |
| Rate limiting | ✅ Configurado | |
| CORS | ✅ Configurado | Para localhost:5173 |
| Stripe webhooks | ❌ No configurado | Falta API key |
| GoHighLevel webhooks | ❌ No configurado | Falta webhook secret |
| Suscripciones | ⚠️ Parcial | Middleware existe pero permite todo en dev |

---

## ❌ QUÉ FALTA POR IMPLEMENTAR

### Prioridad Alta 🔴

1. **Stripe Integration**
   - Configurar API keys de Stripe
   - Implementar checkout de suscripción
   - Procesar webhooks de pago
   - Guardar estado de suscripción en Supabase

2. **Página de Settings funcional**
   - Guardar cambios de perfil en Supabase
   - Cambio de contraseña
   - Preferencias de notificaciones

3. **Validar suscripción real**
   - Actualmente `requireSubscriptionOrDev` permite todo en desarrollo
   - En producción debe verificar suscripción activa

### Prioridad Media 🟡

4. **Metas vinculadas a transacciones**
   - Actualmente las metas se guardan en localStorage
   - Deberían guardarse en Supabase
   - El progreso debería calcularse automáticamente desde transacciones

5. **Exportar datos**
   - Exportar transacciones a CSV/Excel
   - Reportes PDF

6. **Filtros avanzados en Dashboard**
   - Selector de período (semana/mes/año) funcional
   - Comparativa con período anterior

7. **Notificaciones**
   - Alertas cuando se acerca el límite de presupuesto
   - Recordatorios de metas

### Prioridad Baja 🟢

8. **PWA (Progressive Web App)**
   - Service worker
   - Instalable en móvil

9. **Modo claro/oscuro toggle**
   - Actualmente solo modo oscuro

10. **Multi-idioma**
    - Actualmente solo español

---

## ⚠️ ARCHIVOS CON DATOS MOCK/DEMO

### `src/pages/Dashboard.jsx`

**Líneas ~40-115**: Contiene `DEMO_DATA` con datos de demostración:
```javascript
const DEMO_DATA = {
  balance: 24850.0,
  totalIncome: 35420.0,
  // ... datos falsos para demo
};
```

**Uso**: Se usa cuando:
- El token empieza con `demo-` (modo demo)
- Hay error al cargar datos de la API
- Como fallback para `weeklyData` si no hay transacciones

### `src/context/AuthContext.jsx`

**Líneas ~7-17**: Contiene `DEMO_USER`:
```javascript
const DEMO_USER = {
  id: '1',
  name: 'Carlos García',
  email: 'carlos@empresa.com',
  // ...
};
```

**Uso**: Se activa cuando el email contiene "demo"

### `src/pages/Goals.jsx`

**Líneas ~18-22**: Contiene `DEFAULT_GOALS`:
```javascript
const DEFAULT_GOALS = [
  { id: '1', name: 'Meta de ahorro', current: 0, target: 20000, ... },
  // ...
];
```

**Uso**: Se usan como metas iniciales si no hay metas guardadas en localStorage

### Almacenamiento en localStorage

Las metas se guardan en localStorage con la key: `goals_${user.id}`

**⚠️ PROBLEMA**: Si el usuario cambia de dispositivo, pierde sus metas. Deberían migrarse a Supabase.

---

## 🔧 PROBLEMAS CONOCIDOS Y SOLUCIONES

### 1. API URL no cargaba desde .env
**Problema**: `import.meta.env.VITE_API_URL` no funcionaba
**Solución**: Se hardcodeó la URL en `src/services/api.js`:
```javascript
const API_URL = 'http://localhost:3000/api';
```

### 2. Modal no se abría en Goals
**Problema**: El componente Modal usa `isOpen` pero se pasaba `open`
**Solución**: Cambiar `open={modalOpen}` por `isOpen={modalOpen}`

### 3. Email confirmation bloqueaba login
**Problema**: Supabase requería confirmar email
**Solución**: Deshabilitar en Supabase Dashboard → Authentication → Email → Disable email confirmations

### 4. Puerto 3000 ocupado
**Problema**: El backend no iniciaba porque el puerto estaba ocupado
**Solución**: 
```bash
pkill -f "node src/index.js"
# o
lsof -i :3000 | awk 'NR>1 {print $2}' | xargs kill -9
```

---

## 📊 FLUJO DE DATOS

### Autenticación

```
1. Usuario ingresa credenciales en Login.jsx
2. AuthContext.login() llama a api.login()
3. api.js hace POST a /api/auth/login
4. Backend valida con Supabase Auth
5. Supabase devuelve JWT + datos de usuario
6. Frontend guarda token en sessionStorage
7. api.js incluye token en headers de siguientes requests
```

### Cargar Dashboard

```
1. Dashboard.jsx se monta
2. useEffect llama loadDashboard()
3. Paralelo: api.getDashboardSummary() + api.getDashboardStats()
4. Backend consulta tabla transactions en Supabase
5. Backend calcula totales, categorías, tendencias
6. Frontend recibe JSON y renderiza gráficos
```

### Crear Transacción

```
1. Usuario llena TransactionForm.jsx
2. onSubmit llama api.createTransaction(data)
3. Backend valida datos con middleware
4. Backend inserta en Supabase (RLS verifica user_id)
5. Frontend redirige a /transactions
```

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

### Para la siguiente sesión:

1. **Migrar metas a Supabase**
   - Crear tabla `goals` en Supabase
   - Crear endpoints CRUD en el backend
   - Actualizar Goals.jsx para usar API en vez de localStorage

2. **Configurar Stripe**
   - Crear cuenta Stripe o usar test keys
   - Configurar productos/precios
   - Implementar checkout session
   - Configurar webhook

3. **Mejorar Settings.jsx**
   - Conectar con Supabase para guardar perfil
   - Implementar cambio de contraseña

4. **Testing**
   - Probar con múltiples usuarios
   - Probar edge cases (sin transacciones, muchas transacciones)

---

## 📝 NOTAS ADICIONALES

- El proyecto usa **ES Modules** (`"type": "module"` en package.json)
- Tailwind está configurado con clases personalizadas para colores `dark-*` y `gold-*`
- El frontend guarda el token en `sessionStorage` (se pierde al cerrar navegador)
- Los gráficos usan Recharts con tooltips personalizados
- El backend tiene logging con Morgan en modo desarrollo

---

## 🙏 CRÉDITOS

Desarrollado en sesión de pair programming el 29 de enero de 2026.

**Cliente**: Sabiduría Empresarial
**Proyecto**: Finance Dashboard SaaS

---

*Última actualización: 29 de enero de 2026, ~22:00 hora local*
