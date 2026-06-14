# Contexto del Proyecto — Finance Dashboard Web (Sabiduría Empresarial)

> Documento de handoff para quien retome el desarrollo (y para su asistente Claude).
> Refleja el **estado real y actual** del proyecto en producción. Última actualización: 2026-06-14.
>
> Complementa al `CLAUDE.md` del repo (instrucciones para Claude Code). Si algo se contradice, **este archivo y el código mandan**.

---

## 1. Qué es

**Producto:** Dashboard web (SaaS) de control financiero personal/empresarial para clientes de Sabiduría Empresarial (marca de Diana Cortés).

**Tipo:** SPA en **React + Vite** que consume una **API REST** propia. Es una plataforma de pago: solo usuarios con suscripción activa entran. El **backend decide acceso y pagos; el frontend solo muestra**.

**Dominio producción:** https://app.sabiduriaempresarial.com

---

## 2. Arquitectura

Dos repositorios hermanos (mismo servidor en prod, carpetas hermanas en local):

| Repo | Qué es | Puerto local |
|---|---|---|
| `finance-dashboard-web` (este) | Frontend React (Vite) | 5173 (dev) |
| `finance-dashboard-api` (`../finance-dashboard-api`) | Backend Express + Node 18+ | 3000 |

```
Navegador
   │
   ▼
React (Vite)  ──REST──▶  Express API (Node)  ──▶  Supabase (PostgreSQL + Auth)
                                  ▲
                       Webhooks Stripe / GoHighLevel
```

- **Todo el frontend habla con el backend por `src/services/api.js`** — una clase singleton `ApiService` que adjunta el JWT (`Authorization: Bearer ...`) a cada request.
- El cliente Supabase JS (`src/lib/supabase.js`) se usa **directo solo** en dos flujos: intercambio de código del magic-link (`AuthCallback`) y creación de contraseña (`CreatePassword`). El resto pasa por la API Express.

---

## 3. Stack y dependencias

- **React 18** + **react-router-dom 6** + **Vite 5**
- **Tailwind CSS 3** (config en `tailwind.config.js`, `postcss.config.js`)
- **@supabase/supabase-js** (auth callback / magic link / password)
- **recharts** (gráficos), **lucide-react** (íconos), **date-fns**, **clsx**, **animejs**, **react-joyride** (onboarding tour)
- **exceljs** / **xlsx** (import/export de transacciones y plantillas)
- ⚠️ `express` aparece en `package.json` pero es **legacy** (de un viejo `server.js` para PM2 que **ya no existe ni se usa**; en prod sirve nginx). No depender de eso.

---

## 4. Correr en local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción → dist/
npm run preview  # previsualizar el build
```

No hay suite de tests configurada.

### Variables de entorno

Copiar `.env.example` → `.env` y setear:

```env
# DESARROLLO (.env)
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://qpvlyeqbsvuunzitrclp.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key público de Supabase>
```

- El `VITE_SUPABASE_ANON_KEY` es la **anon key pública** (va embebida en el bundle del cliente; no es secreta).
- En `.gitignore` se ignoran `.env`, `.env.local`, `.env.production`. ⚠️ **OJO:** `.env.production.local` **NO está ignorado** — si lo usas para buildear prod, bórralo después (ver §8).

---

## 5. Estructura de carpetas (real)

```
src/
├── App.jsx                  # Definición de rutas (público vs protegido)
├── main.jsx
├── services/
│   ├── api.js               # Singleton ApiService (TODA la comunicación con el backend)
│   └── cache.js             # Cache a nivel de módulo (categorías, dashboard del mes)
├── context/
│   ├── AuthContext.jsx      # JWT en sessionStorage, useAuth() → {user, login, logout, isAuthenticated}
│   └── SettingsContext.jsx  # tema (dark/light) + moneda (COP/USD/MXN/EUR) en localStorage, useSettings()
├── lib/
│   └── supabase.js          # cliente Supabase (solo magic-link y create-password)
├── components/
│   ├── ProtectedRoute.jsx   # exporta ProtectedRoute y PublicRoute
│   ├── layout/              # DashboardLayout, Header, Sidebar, Logo (barrel index.js)
│   ├── ui/                  # Button, Card, Input, Select, CreatableSelect, DatePicker, Modal, Spinner (barrel index.js)
│   ├── AIAgentPanel.jsx, OnboardingTour.jsx, PrintReport.jsx
├── pages/                   # Login, Register, Dashboard, Transactions, TransactionForm, Reports,
│                            # Goals, Categories, Accounts, Cartera, Settings, Workshop, WorkshopPro, etc.
└── utils/
    ├── formatters.js, categoryIcons.jsx, printReport.js, herramientaFinancieraExport.js
```

**Cache de módulo (`src/services/cache.js`):** categorías y datos del mes del dashboard sobreviven la navegación de React pero se limpian al refrescar la página. Tras mutaciones, llamar `invalidateCategoriesCache()` / `invalidateDashboardCache()` / `invalidateAllCaches()`.

---

## 6. Rutas (App.jsx)

**Públicas** (sin login):

| Ruta | Página | Nota |
|---|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth | `register` está deshabilitado de hecho (entran por GHL) |
| `/auth/callback` | AuthCallback | intercambio de magic-link |
| `/create-password` | CreatePassword | setear contraseña |
| `/subscription-required` | SubscriptionRequired | 403 → aquí |
| `/privacy` | Privacy | |
| **`/workshop`** | **Workshop** | **herramienta independiente (ver §7)** |
| **`/workshop-bogota`** | **WorkshopPro** | **variante presencial (ver §7)** |

**Protegidas** (requieren JWT, dentro de `<DashboardLayout>`): `/transactions`, `/transactions/new`, `/transactions/import`, `/transactions/:id`, `/reports`, `/goals`, `/categories`, `/settings`, `/accounts`, `/cartera`.

**Redirects:** `/` → `/login`; `/dashboard` y `/annual-report` → `/reports`; `*` → `/reports`. **La pantalla principal real es `/reports`** (no `/dashboard`).

---

## 7. Herramientas "Workshop" (independientes)

`/workshop` (`src/pages/Workshop.jsx`) y `/workshop-bogota` (`src/pages/WorkshopPro.jsx`) son **calculadoras financieras públicas e independientes** del resto de la app: NO usan la API ni Supabase, todo el cálculo es local en el navegador, con su propia marca y estilos embebidos. Se usan en talleres presenciales de Diana.

`/workshop` ("Finanzas Sabias"): el usuario ingresa Facturación Año y % Utilidad, y en "Datos por Escenario" define, para 3 escenarios (Precio Bajo/Medio/Alto), el **Precio** y el **% Aporte Meta** (con total acumulado + alerta si pasa de 100%). Abajo, el "Escenario Proyectado" muestra de solo lectura la Facturación, el precio resaltado en el subheader, y las unidades necesarias por año/mes/semana/día. Botón de imprimir/descargar PDF.

> ⚠️ **Esta herramienta la usan mayormente desde MÓVIL.** Cualquier cambio de UI debe priorizar el celular.

---

## 8. Deploy a producción ⭐

**Producción corre en un droplet de DigitalOcean** (Ubuntu, `nyc1`). **NO** usa Cloudways ni PM2 (el `CLAUDE.md` aún menciona eso pero está desactualizado).

**nginx sirve el frontend como archivos estáticos** desde `/var/www/finance-dashboard-web` (config: `/etc/nginx/sites-enabled/finance-dashboard`), con fallback SPA a `index.html`, y proxya `/api/` → `127.0.0.1:3000` (el backend Express). En esa carpeta **NO hay repo, ni `.env`, ni `dist/`, ni git** — es directamente el build ya servido.

➡️ **Por lo tanto el deploy es: buildear LOCAL (con env de producción) y subir el contenido de `dist/` por `scp`.**

### Pasos (frontend)

```bash
# 1) En tu máquina, dentro de finance-dashboard-web:
#    Build con env de PRODUCCIÓN (¡no localhost!). Usa un .env.production.local temporal:
cat > .env.production.local <<'EOF'
VITE_API_URL=https://app.sabiduriaempresarial.com/api
VITE_SUPABASE_URL=https://qpvlyeqbsvuunzitrclp.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key público>
EOF

npm run build     # genera dist/ apuntando a la API de prod

# 2) Empaquetar y subir
tar -czf /tmp/dist.tgz -C dist .
scp /tmp/dist.tgz root@142.93.7.13:/tmp/dist.tgz

# 3) En el servidor: backup + extraer + permisos
ssh root@142.93.7.13 '
  DIR=/var/www/finance-dashboard-web
  cp -a "$DIR" "$DIR.bak-$(date +%F-%H%M%S)"   # backup para rollback
  tar -xzf /tmp/dist.tgz -C "$DIR"
  chown -R www-data:www-data "$DIR"
  rm -f /tmp/dist.tgz
'

# 4) Limpiar local
rm -f .env.production.local       # NO está gitignoreado, no lo dejes
rm -rf dist
```

### Verificar que quedó arriba

```bash
curl -s https://app.sabiduriaempresarial.com/ | grep -oE 'assets/index-[a-zA-Z0-9.-]+\.js'  # debe ser el hash nuevo
curl -s -o /dev/null -w '%{http_code}\n' https://app.sabiduriaempresarial.com/workshop        # 200
```

### Notas importantes
- **Buildear SIEMPRE con el `VITE_API_URL` de prod.** El `.env` del repo apunta a `localhost`; si buildeas con eso, el sitio en prod intenta pegarle a localhost y se rompe.
- nginx sirve estáticos: tras el deploy, los usuarios con `index.html` cacheado seguirán cargando el bundle viejo hasta refrescar. El extraer **no borra** los assets viejos (hash distinto), así que sirven de fallback y nadie ve la página rota a mitad del deploy.
- **Rollback:** los backups quedan en `/var/www/finance-dashboard-web.bak-<fecha>`. Para revertir: `cp -a /var/www/finance-dashboard-web.bak-<fecha>/* /var/www/finance-dashboard-web/` (o renombrar carpetas).

### Backend (`finance-dashboard-api`, Express en :3000)
El backend corre como proceso Node en el servidor escuchando en `127.0.0.1:3000` (nginx le proxya `/api/` y `/health`). Verifica con qué se levanta en el server (`systemctl`/`pm2`/`screen`) antes de reiniciarlo. Si cambian dependencias: `npm install` y reiniciar el proceso.

---

## 9. Acceso al servidor (SSH)

```bash
ssh root@142.93.7.13
```

- El servidor acepta **login de root por llave SSH** (`PermitRootLogin yes`, `PubkeyAuthentication yes`).
- **Tu llave ya está configurada** (la de `tecnologia2.sabiduria@gmail.com`), así que entras directo sin contraseña. Las llaves autorizadas viven en `/root/.ssh/authorized_keys`.
- Entras como `root` → acceso total (deploy, nginx, etc.).

Rutas útiles en el servidor:
- Frontend servido: `/var/www/finance-dashboard-web`
- Config nginx del sitio: `/etc/nginx/sites-enabled/finance-dashboard`
- Otros sitios en el mismo droplet: `dashboard.sabiduriaempresarial.com` (proxy a :3002), n8n, ventracrm, wordpress.
- Recargar nginx si tocas su config: `nginx -t && systemctl reload nginx`

---

## 10. Suscripción y onboarding

1. El cliente paga en GoHighLevel/Stripe → webhook → una Edge Function de Supabase pone `profiles.subscription_status = 'active'` y manda un email con magic-link.
2. El usuario abre el link → `/auth/callback` intercambia el código por sesión → `/create-password`.
3. Setea contraseña → auto-login vía API → entra (`/reports`).
4. En cada login el backend revisa la suscripción; si no está activa devuelve 403 `SUBSCRIPTION_INACTIVE` y el frontend redirige a `/subscription-required`.

**Registro público está deshabilitado**: los usuarios entran solo por el flujo GHL → magic link. Pagos directos por Stripe no se usan (van por GoHighLevel, que usa Stripe por debajo).

---

## 11. Backend API (resumen)

Todas las rutas bajo `/api/`. Prefijos: `/api/auth`, `/api/transactions` (CRUD + import masivo hasta 500), `/api/dashboard`, `/api/categories` (+ `/init`), `/api/subcategories`, `/api/goals`, `/api/budget`, `/api/cartera`, `/api/notifications`, `/api/webhooks` (Stripe, GHL).

**Envelope estándar:**
```json
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

**Auth:** Supabase emite JWTs; el backend los valida y exige `profiles.subscription_status === 'active'`. Login devuelve 403 `SUBSCRIPTION_INACTIVE` si no está activa.

---

## 12. Marca y estilos

- Tonos cálidos (oro): `gold-300 #eaad74`, `gold-400 #da7d41`, `gold-700 #7e301f`.
- Superficies oscuras: `dark-900 #261c21`, `dark-950`.
- Tipografía: **DM Sans** (Google Fonts, en `index.html`); Georgia como fallback serif/logo.
- **Tema oscuro por defecto.** Las clases `dark`/`light` se alternan en `document.documentElement`.
- Regla de gradiente: sobre fondos cálidos (`from-gold-700 via-gold-500 to-gold-400`) usar `text-white`/`bg-white/20`; las variantes `text-gold-*`/`bg-gold-*/20` son solo para fondos oscuros.

---

## 13. Estado de features

| Feature | Estado |
|---|---|
| Transacciones (CRUD + import masivo) | ✅ Completo |
| Reports / Dashboard + Bolsillos | ✅ Completo (la home es `/reports`) |
| Metas financieras (en `Goals.jsx` junto con bolsillos) | ✅ Completo |
| Categorías | ✅ Completo |
| Reporte anual | ✅ Completo |
| Workshop / WorkshopPro | ✅ En uso (móvil) |
| Cartera | 🔧 Incompleto (página existe, funcionalidad parcial) |
| Notificaciones | ⚠️ Backend ok, frontend parcial — no tocar por ahora |
| Registro público | 🚫 Deshabilitado (entran por GHL) |
| Stripe directo | 🚫 No (pagos por GoHighLevel) |

---

## 14. Gotchas / cosas a recordar

- **Build de prod siempre con el `VITE_API_URL` correcto** (ver §8). Es el error más fácil de cometer.
- `.env.production.local` **no está gitignoreado** — bórralo tras buildear, o agrégalo al `.gitignore`.
- El `CLAUDE.md` del repo menciona Cloudways + PM2 + `server.js`: **desactualizado**, hoy es DigitalOcean + nginx estático.
- Las herramientas Workshop son **mobile-first** y autónomas (sin API).
- Tras mutaciones de datos, invalidar el cache de módulo correspondiente.
- Hay un `.env` local en el servidor para el **backend**, no para el frontend (el frontend ya viene buildeado).

<!-- test push: línea de prueba, se puede borrar -->
