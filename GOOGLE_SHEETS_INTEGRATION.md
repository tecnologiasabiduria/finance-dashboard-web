# Integración Bidireccional con Google Sheets

## Objetivo

Agregar una sección de configuración en el sistema donde el usuario pueda:

1. **Conectar su cuenta de Google** (OAuth 2.0)
2. **Seleccionar o crear un archivo Google Sheet**
3. **Sincronización bidireccional**: cambios en el sistema → Sheet, y cambios en el Sheet → sistema

---

## Arquitectura

```
┌─────────────────┐     OAuth 2.0      ┌──────────────────┐
│   Frontend      │ ──────────────────► │  Google OAuth     │
│   Settings page │ ◄────────────────── │  Consent Screen   │
└────────┬────────┘   auth code         └──────────────────┘
         │
         │ POST /api/google/callback (auth code)
         ▼
┌─────────────────┐                     ┌──────────────────┐
│   Backend API   │ ◄─────────────────► │  Google Sheets   │
│   (Express)     │    googleapis SDK   │  API v4          │
└────────┬────────┘                     └────────┬─────────┘
         │                                       │
         │ CRUD events                           │ Push Notifications
         ▼                                       │ (Webhook channel)
┌─────────────────┐                              │
│   Supabase DB   │ ◄───────────────────────────-┘
│   (PostgreSQL)  │   Polling fallback cada 5 min
└─────────────────┘
```

---

## 1. Google Cloud Console — Configuración Previa

| Paso | Detalle |
|------|---------|
| Crear proyecto en Google Cloud | Un proyecto para la app |
| Habilitar APIs | **Google Sheets API v4** + **Google Drive API** |
| Pantalla de consentimiento OAuth | Tipo "Externo", con scopes para Sheets y Drive |
| Credenciales OAuth 2.0 | Client ID + Client Secret (tipo "Web Application") |
| URIs de redirección | `https://tu-dominio.com/auth/google/callback` |

### Scopes Necesarios

```
https://www.googleapis.com/auth/spreadsheets    — leer/escribir hojas
https://www.googleapis.com/auth/drive.file      — acceso solo a archivos creados/abiertos por la app
```

---

## 2. Backend — Nuevos Endpoints

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/google/auth-url` | GET | Genera la URL de consentimiento OAuth |
| `/api/google/callback` | POST | Recibe el auth code, obtiene tokens, guarda `refresh_token` en DB |
| `/api/google/disconnect` | POST | Revoca tokens y elimina conexión |
| `/api/google/status` | GET | Verifica si el usuario tiene Google conectado |
| `/api/google/sheets` | GET | Lista los Sheets del usuario (para seleccionar) |
| `/api/google/sheets/link` | POST | Vincula un Sheet específico al usuario |
| `/api/google/sheets/create` | POST | Crea un Sheet nuevo con la estructura de las 8 hojas |
| `/api/google/sync` | POST | Fuerza sincronización manual |
| `/api/google/sync/status` | GET | Estado de la última sincronización |
| `/api/webhooks/google` | POST | Recibe push notifications de cambios en el Sheet |

### Paquetes NPM Necesarios (Backend)

```
googleapis         — SDK oficial de Google (incluye Sheets + Drive + OAuth)
node-cron          — Para el polling periódico
crypto (built-in)  — Para encriptar/desencriptar tokens
```

> El frontend **no necesita** dependencias nuevas (usa flujo OAuth estándar con redirect).

---

## 3. Base de Datos — Nuevas Tablas

### `google_connections` — Almacena la conexión Google del usuario

```sql
CREATE TABLE google_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    google_email TEXT NOT NULL,
    access_token TEXT,              -- Encriptado
    refresh_token TEXT NOT NULL,    -- Encriptado
    token_expiry TIMESTAMPTZ,
    spreadsheet_id TEXT,            -- ID del Sheet vinculado
    spreadsheet_name TEXT,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'error'
    sync_error TEXT,
    UNIQUE(user_id)
);
```

### `sync_logs` — Log de sincronizaciones

```sql
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,        -- 'to_sheet', 'from_sheet'
    entity_type TEXT NOT NULL,      -- 'transaction', 'goal', 'budget', etc.
    entity_id UUID,
    action TEXT NOT NULL,           -- 'create', 'update', 'delete'
    status TEXT NOT NULL,           -- 'success', 'error'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `sync_queue` — Cola de cambios pendientes

```sql
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,        -- 'to_sheet', 'from_sheet'
    entity_type TEXT NOT NULL,
    entity_id UUID,
    action TEXT NOT NULL,
    payload JSONB,
    status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'done', 'error'
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
```

---

## 4. Mapeo de Datos → Hojas del Sheet

Basado en los CSV de referencia en `integrationGoogleSheet-context/`, el Sheet tendrá **8 hojas (tabs)**:

| Hoja del Sheet | Datos del Sistema | Dirección |
|---|---|---|
| **INGRESOS** | Transacciones tipo `income` | Bidireccional |
| **GASTOS** | Transacciones tipo `expense` | Bidireccional |
| **ANUAL** | Resumen anual (dashboard/summary agrupado) | Sistema → Sheet |
| **INFORME MES A MES** | Reporte mensual consolidado | Sistema → Sheet |
| **METAS** | Goals + productos/tickets | Bidireccional |
| **PRESUPUESTO POR BOLSILLO** | Budget pockets config + ejecución real | Bidireccional |
| **PROYECCION AÑO** | Proyección por precio/canal | Bidireccional |
| **Cartera** | Cuentas por cobrar (income pendiente) | Bidireccional |

### Estructura de cada hoja

#### INGRESOS
| FECHA INGRESO | FACTURA Nª | TIPO DE INGRESO | DOCUMENTO | NOMBRE | DIRECCION | CORREO | TELEFONO | INGRESO COP | STATUS |
|---|---|---|---|---|---|---|---|---|---|

#### GASTOS
| FECHA | DOCUMENTO | PROVEEDOR | CATEGORIA | METODO DE PAGO | GASTO TOTAL COP | NOTAS |
|---|---|---|---|---|---|---|

#### ANUAL
- Sección INGRESOS: TIPO DE INGRESO × MESES (Enero–Diciembre)
- Sección GASTOS: CATEGORÍA × MESES (Enero–Diciembre)

#### INFORME MES A MES
- Sección resumen: TIPO DE INGRESO, INGRESO COP, PORCENTAJE
- Sección resumen gastos: CATEGORIAS, %, VALOR
- Detalle de transacciones del mes

#### METAS
| META FACTURACION AÑO | % UTILIDAD | UTILIDAD AÑO | UTILIDAD MES |
|---|---|---|---|
- Desglose por producto: LOW/MIDDLE/HIGH TICKET
- Escenarios: Pesimista, Intermedio, Extraordinario

#### PRESUPUESTO POR BOLSILLO
- Categorías con % del presupuesto (Utilidad, Nómina, Materia Prima, etc.)
- Por mes: Valor Presupuesto, Valor Real, % Real, Desviación ($), Desviación (%)

#### PROYECCION AÑO
- Precios por producto × meses
- Estrategia/canal de venta con % contribución
- Cash collected y comisiones

#### Cartera
| PLATAFORMA | FUENTE | PRODUCTO | NOMBRE | FECHA VENTA | SALDO HOY | VALOR VENTA | CASH | ABONOS por mes... |
|---|---|---|---|---|---|---|---|---|

---

## 5. Flujo de Sincronización

### Sistema → Google Sheets

```
Usuario crea/edita/elimina en el dashboard
    ↓
Backend guarda en Supabase
    ↓
Se agrega entrada a sync_queue (direction: 'to_sheet')
    ↓
Worker procesa la cola:
    1. Obtiene refresh_token del usuario
    2. Genera access_token (googleapis)
    3. Escribe/actualiza la fila en el Sheet
    4. Marca como 'done' en sync_queue
    5. Registra en sync_logs
```

### Google Sheets → Sistema

**Estrategia combinada:**

1. **Push Notifications** (Google Drive API `watch`)
   - Se recibe webhook cuando el Sheet cambia
   - Solo notifica QUE cambió, no QUÉ cambió específicamente
   - Se usa como trigger para iniciar el diff

2. **Polling periódico** (fallback cada 5 min)
   - Cron job consulta el Sheet
   - Compara con datos en DB (diff por filas)
   - Detecta filas nuevas, modificadas o eliminadas
   - Aplica cambios a la base de datos

```
Google Sheet modificado por el usuario
    ↓
Push notification llega a /api/webhooks/google
    (o polling periódico detecta cambio)
    ↓
Backend lee el Sheet completo (o rango modificado)
    ↓
Compara fila por fila con datos en DB
    ↓
Detecta diferencias → crea entries en sync_queue (direction: 'from_sheet')
    ↓
Procesa cola:
    - Fila nueva → INSERT en Supabase
    - Fila modificada → UPDATE en Supabase
    - Fila eliminada → DELETE en Supabase
    ↓
Registra en sync_logs
```

### Manejo de Conflictos

| Escenario | Resolución |
|-----------|-----------|
| Ambos lados editan el mismo registro | **Last write wins** (el cambio más reciente prevalece) |
| El usuario puede elegir | Opcionalmente: mostrar conflicto en UI y dejar que el usuario decida |

---

## 6. Frontend — Sección de Configuración

Agregar en la página **Settings** existente una nueva sección:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️  Integración Google Sheets                              │
│                                                              │
│  ── Si NO está conectado ──                                  │
│                                                              │
│  [🔗 Conectar cuenta de Google]                              │
│                                                              │
│  ── Si ESTÁ conectado ──                                     │
│                                                              │
│  Estado: ✅ Conectado como diana@gmail.com                   │
│  Sheet:  📊 "Finanzas Empresariales 2026"                   │
│  Última sync: hace 3 minutos                                │
│                                                              │
│  [🔄 Sincronizar ahora]    [❌ Desconectar Google]          │
│                                                              │
│  ── Selección de Sheet ──                                    │
│                                                              │
│  ○ Crear nuevo Sheet con estructura predefinida              │
│  ○ Vincular Sheet existente: [Seleccionar ▼]                │
│                                                              │
│  ── Opciones de sincronización ──                            │
│                                                              │
│  ☑ Sincronizar transacciones (Ingresos/Gastos)              │
│  ☑ Sincronizar metas                                        │
│  ☑ Sincronizar presupuesto                                  │
│  ☐ Sincronización automática cada 5 minutos                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Consideraciones Técnicas

| Tema | Detalle |
|------|---------|
| **Rate Limits** | Google Sheets API: 300 requests/min por proyecto. Usar `batchUpdate` para eficiencia. |
| **Tokens** | El `refresh_token` solo se obtiene la primera vez (con `access_type: offline` y `prompt: consent`). Guardarlo **encriptado**. |
| **Seguridad** | Encriptar tokens en DB con AES-256. Nunca exponer Client Secret al frontend. Todo OAuth vía backend. |
| **Rendimiento** | Usar `spreadsheets.values.batchUpdate` para escribir múltiples rangos en 1 llamada API. |
| **Verificación Google** | Si la app tiene >100 usuarios, necesita verificación de Google (puede tardar semanas). |
| **Límite de celdas** | Un Sheet soporta máximo 10 millones de celdas. Más que suficiente. |
| **Push notifications** | Expiran cada 24h, hay que renovar automáticamente con un cron. |
| **Variables de entorno** | Nuevas: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `ENCRYPTION_KEY` |

---

## 8. Variables de Entorno Nuevas

### Backend (`.env`)

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=https://tu-dominio.com/auth/google/callback

# Encriptación de tokens
ENCRYPTION_KEY=clave-de-32-caracteres-para-aes256
```

### Frontend (`.env`)

```env
# Solo se necesita el client ID para iniciar el flujo OAuth
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

---

## 9. Fases de Implementación

### Fase 1 — Configuración y OAuth
- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Google Sheets API v4 y Google Drive API
- [ ] Configurar pantalla de consentimiento OAuth
- [ ] Crear credenciales OAuth 2.0
- [ ] Crear migración SQL para las 3 tablas nuevas
- [ ] Implementar endpoints OAuth en el backend (`/api/google/auth-url`, `/callback`, `/disconnect`, `/status`)
- [ ] Implementar UI de conexión en Settings

### Fase 2 — Creación y Vinculación de Sheets
- [ ] Endpoint para crear Sheet con estructura de las 8 hojas (basado en los CSVs)
- [ ] Endpoint para listar y vincular Sheets existentes
- [ ] UI para crear/seleccionar Sheet

### Fase 3 — Sync Sistema → Sheet
- [ ] Interceptar operaciones CRUD de transacciones para agregar a `sync_queue`
- [ ] Interceptar operaciones CRUD de goals y budget
- [ ] Worker que procesa `sync_queue` y escribe al Sheet
- [ ] Mapeo de datos del sistema al formato de cada hoja

### Fase 4 — Sync Sheet → Sistema
- [ ] Implementar polling periódico (cron cada 5 min)
- [ ] Implementar detección de cambios (diff por filas)
- [ ] Aplicar cambios detectados a Supabase
- [ ] Configurar push notifications de Google Drive (opcional/mejora)

### Fase 5 — UI de Estado y Monitoreo
- [ ] Mostrar estado de última sincronización en Settings
- [ ] Botón de sincronización manual
- [ ] Checkboxes de configuración (qué sincronizar)
- [ ] Indicador visual en el header cuando hay sync en progreso
- [ ] Manejo de errores y reintentos

---

## 10. Alternativa Simplificada

Si la sincronización bidireccional en tiempo real resulta muy compleja inicialmente, se puede empezar con:

| Modo | Descripción |
|------|-------------|
| **Exportar a Sheet** | Botón que genera/actualiza el Sheet con los datos actuales del sistema |
| **Importar desde Sheet** | Botón que lee el Sheet y actualiza la DB (ya existe base con `POST /api/transactions/import`) |

Esto elimina la complejidad del sync automático y la detección de conflictos, y permite iterar hacia la solución completa.
