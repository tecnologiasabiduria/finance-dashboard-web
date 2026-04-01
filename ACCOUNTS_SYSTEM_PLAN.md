# Plan de Implementación: Sistema de Cuentas y Tarjetas de Crédito

> **Fecha:** 31 de marzo de 2026  
> **Estado:** Planificación  
> **Prioridad:** Alta

---

## 1. Resumen Ejecutivo

Implementar un sistema de **cuentas financieras** que permita al usuario gestionar múltiples fuentes de dinero (efectivo, bancos, tarjetas de crédito) con visibilidad clara de su patrimonio neto y deudas.

### Objetivos principales

- Soportar múltiples tarjetas de crédito con sus límites y fechas
- Diferenciar entre liquidez disponible y deudas pendientes
- Mantener trazabilidad de movimientos entre cuentas
- Generar alertas de fechas de corte y pago

---

## 2. Modelo de Datos

### 2.1 Nueva tabla: `accounts`

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Información básica
  name VARCHAR(100) NOT NULL,           -- "Efectivo", "Bancolombia", "Visa Oro"
  type VARCHAR(20) NOT NULL,            -- 'cash', 'bank', 'credit_card'
  balance DECIMAL(15,2) DEFAULT 0,      -- Saldo actual (negativo = deuda)
  currency VARCHAR(3) DEFAULT 'COP',
  
  -- Personalización
  color VARCHAR(7),                     -- Color hex para UI (#FF5733)
  icon VARCHAR(50),                     -- Nombre del ícono (opcional)
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,     -- Cuenta por defecto para transacciones
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_type CHECK (type IN ('cash', 'bank', 'credit_card'))
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(user_id, type);
```

### 2.2 Nueva tabla: `credit_card_details`

```sql
CREATE TABLE credit_card_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Límites
  credit_limit DECIMAL(15,2) NOT NULL,  -- Límite de crédito
  
  -- Fechas del ciclo
  cut_off_day INTEGER NOT NULL,         -- Día de corte (1-31)
  payment_due_day INTEGER NOT NULL,     -- Día límite de pago (1-31)
  
  -- Intereses (opcional)
  interest_rate DECIMAL(5,2),           -- Tasa de interés mensual (ej: 2.5%)
  
  -- Último estado de cuenta
  last_statement_balance DECIMAL(15,2), -- Saldo del último corte
  last_statement_date DATE,             -- Fecha del último corte
  minimum_payment DECIMAL(15,2),        -- Pago mínimo requerido
  
  CONSTRAINT valid_cut_off CHECK (cut_off_day BETWEEN 1 AND 31),
  CONSTRAINT valid_due_day CHECK (payment_due_day BETWEEN 1 AND 31)
);
```

### 2.3 Modificación a `transactions`

```sql
-- Agregar columnas a transactions existente
ALTER TABLE transactions 
  ADD COLUMN account_id UUID REFERENCES accounts(id),
  ADD COLUMN to_account_id UUID REFERENCES accounts(id);  -- Solo para transferencias

-- Índices
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id);
```

---

## 3. Lógica de Negocio

### 3.1 Tipos de cuenta

| Tipo | Balance | Descripción |
|------|---------|-------------|
| `cash` | ≥ 0 | Efectivo físico |
| `bank` | Cualquiera | Cuenta bancaria (puede tener sobregiro) |
| `credit_card` | ≤ 0 | Tarjeta de crédito (0 = sin deuda, negativo = deuda) |

### 3.2 Cálculos importantes

```javascript
// Para tarjetas de crédito
const creditUsed = Math.abs(account.balance);        // Crédito utilizado
const creditAvailable = creditLimit - creditUsed;    // Disponible
const utilizationPercent = (creditUsed / creditLimit) * 100;

// Patrimonio neto del usuario
const totalAssets = accounts
  .filter(a => a.type !== 'credit_card' && a.balance > 0)
  .reduce((sum, a) => sum + a.balance, 0);

const totalDebts = accounts
  .filter(a => a.balance < 0)
  .reduce((sum, a) => sum + Math.abs(a.balance), 0);

const netWorth = totalAssets - totalDebts;
```

### 3.3 Reglas de transacciones

#### Ingreso (income)
```
account.balance += transaction.amount
```
- Siempre suma al balance de la cuenta destino

#### Gasto (expense)
```
account.balance -= transaction.amount
```
- Resta del balance de la cuenta origen
- En tarjeta de crédito: el balance se vuelve más negativo

#### Transferencia (transfer)
```
from_account.balance -= transaction.amount
to_account.balance += transaction.amount
```
- Mueve dinero entre cuentas
- **Pagar tarjeta** = transferencia de banco/efectivo → tarjeta
- **No afecta reportes de gastos** (es movimiento interno)

### 3.4 Fechas de tarjeta de crédito

```
Ejemplo: Corte día 15, Pago día 5

Marzo 16 - Abril 15: Período de consumo
Abril 15: Fecha de corte → Se genera estado de cuenta
Abril 16 - Mayo 5: Período de gracia para pagar
Mayo 5: Fecha límite de pago
```

---

## 4. API Backend

### 4.1 Nuevos endpoints

```
GET    /api/accounts                 # Listar cuentas del usuario
POST   /api/accounts                 # Crear cuenta
GET    /api/accounts/:id             # Obtener cuenta específica
PUT    /api/accounts/:id             # Actualizar cuenta
DELETE /api/accounts/:id             # Eliminar cuenta (soft delete)

GET    /api/accounts/summary         # Resumen: patrimonio neto, totales
POST   /api/accounts/init            # Crear cuentas por defecto (Efectivo, Banco)

# Para tarjetas de crédito
GET    /api/accounts/:id/statement   # Estado de cuenta actual
GET    /api/accounts/:id/movements   # Movimientos de la tarjeta
```

### 4.2 Modificaciones a endpoints existentes

```
POST /api/transactions
  - Agregar: account_id (requerido)
  - Agregar: to_account_id (requerido si type = 'transfer')
  - Actualizar balances automáticamente

GET /api/transactions
  - Agregar filtro: ?account_id=xxx

GET /api/dashboard
  - Incluir resumen de cuentas
  - Incluir alertas de tarjetas próximas a vencer
```

### 4.3 Estructura de respuestas

```json
// GET /api/accounts
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "name": "Efectivo",
        "type": "cash",
        "balance": 850000,
        "currency": "COP",
        "is_default": true,
        "color": "#22C55E"
      },
      {
        "id": "uuid",
        "name": "Visa Oro",
        "type": "credit_card",
        "balance": -450000,
        "currency": "COP",
        "color": "#3B82F6",
        "credit_card": {
          "credit_limit": 2000000,
          "available": 1550000,
          "utilization_percent": 22.5,
          "cut_off_day": 15,
          "payment_due_day": 5,
          "next_cut_off": "2026-04-15",
          "next_payment_due": "2026-05-05",
          "minimum_payment": 45000
        }
      }
    ],
    "summary": {
      "total_assets": 4050000,
      "total_debts": 570000,
      "net_worth": 3480000,
      "total_credit_limit": 3000000,
      "total_credit_used": 570000
    }
  }
}
```

---

## 5. Frontend

### 5.1 Nueva página: Cuentas (`/accounts`)

```
┌─────────────────────────────────────────────────────────────┐
│  Mis Cuentas                              [+ Nueva Cuenta]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EFECTIVO Y BANCOS                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💵 Efectivo                         $    850.000    │   │
│  │    Cuenta por defecto                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🏦 Bancolombia                      $  3.200.000    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TARJETAS DE CRÉDITO                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💳 Visa Oro                         -$   450.000    │   │
│  │    ━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░ 22.5%    │   │
│  │    Límite: $2.000.000  •  Disponible: $1.550.000    │   │
│  │    📅 Corte: 15 abr  •  Pago: 5 may                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💳 Mastercard                       -$   120.000    │   │
│  │    ━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12.0%    │   │
│  │    Límite: $1.000.000  •  Disponible: $880.000      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  RESUMEN                                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Activos   │ │   Deudas    │ │ Patrimonio  │           │
│  │ $4.050.000  │ │ -$570.000   │ │ $3.480.000  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Modal: Crear/Editar Cuenta

```
┌─────────────────────────────────────────────┐
│  Nueva Cuenta                          [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Tipo de cuenta                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 💵      │ │ 🏦      │ │ 💳      │       │
│  │Efectivo │ │ Banco   │ │ Tarjeta │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│  Nombre de la cuenta                        │
│  ┌─────────────────────────────────────┐   │
│  │ Visa Oro Bancolombia                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Saldo inicial (o deuda actual)             │
│  ┌─────────────────────────────────────┐   │
│  │ $ 450.000                           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ─── Solo para tarjetas de crédito ───     │
│                                             │
│  Límite de crédito                          │
│  ┌─────────────────────────────────────┐   │
│  │ $ 2.000.000                         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Día de corte        Día de pago            │
│  ┌───────────┐      ┌───────────┐          │
│  │    15     │      │     5     │          │
│  └───────────┘      └───────────┘          │
│                                             │
│  Color                                      │
│  ● 🔴 🟠 🟡 🟢 🔵 🟣 ⚫                     │
│                                             │
│           [Cancelar]  [Guardar]             │
└─────────────────────────────────────────────┘
```

### 5.3 Modificación: Formulario de Transacción

Agregar selector de cuenta:

```
┌─────────────────────────────────────────────┐
│  Cuenta                                     │
│  ┌─────────────────────────────────────┐   │
│  │ 💵 Efectivo              $850.000 ▼ │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 💵 Efectivo              $850.000   │   │
│  │ 🏦 Bancolombia         $3.200.000   │   │
│  │ 💳 Visa Oro             -$450.000   │   │
│  │ 💳 Mastercard           -$120.000   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

Para transferencias, mostrar cuenta destino:

```
┌─────────────────────────────────────────────┐
│  Desde                                      │
│  ┌─────────────────────────────────────┐   │
│  │ 🏦 Bancolombia         $3.200.000 ▼ │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Hacia                                      │
│  ┌─────────────────────────────────────┐   │
│  │ 💳 Visa Oro             -$450.000 ▼ │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  💡 Pagar tarjeta de crédito                │
└─────────────────────────────────────────────┘
```

### 5.4 Widget en Dashboard

```
┌─────────────────────────────────────────────┐
│  💰 Mis Cuentas                    [Ver →]  │
├─────────────────────────────────────────────┤
│  💵 Efectivo               $    850.000     │
│  🏦 Bancolombia            $  3.200.000     │
│  💳 Visa Oro               -$   450.000     │
│  💳 Mastercard             -$   120.000     │
├─────────────────────────────────────────────┤
│  Patrimonio neto           $  3.480.000     │
└─────────────────────────────────────────────┘
```

### 5.5 Alertas de tarjetas

```
┌─────────────────────────────────────────────┐
│  ⚠️  Tu Visa Oro corta en 3 días            │
│      Saldo actual: $450.000                 │
│                           [Pagar ahora →]   │
└─────────────────────────────────────────────┘
```

---

## 6. Navegación

### 6.1 Actualizar Sidebar

```javascript
const navigation = [
  { name: 'Transacciones', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Cuentas', href: '/accounts', icon: Wallet },        // NUEVO
  { name: 'Informes', href: '/reports', icon: BarChart3 },
  { name: 'Cartera', href: '/cartera', icon: BookOpen },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Configuración', href: '/settings', icon: Settings },
];
```

---

## 7. Migración de Datos

### 7.1 Estrategia para usuarios existentes

1. **Crear cuenta por defecto** al primer acceso:
   ```javascript
   {
     name: "General",
     type: "cash",
     balance: 0,  // Se calculará
     is_default: true
   }
   ```

2. **Asignar transacciones existentes** a la cuenta "General":
   ```sql
   UPDATE transactions 
   SET account_id = (
     SELECT id FROM accounts 
     WHERE user_id = transactions.user_id 
     AND is_default = true
   )
   WHERE account_id IS NULL;
   ```

3. **Recalcular balance** de la cuenta basado en transacciones:
   ```sql
   UPDATE accounts SET balance = (
     SELECT COALESCE(SUM(
       CASE 
         WHEN t.type = 'income' THEN t.amount
         WHEN t.type = 'expense' THEN -t.amount
         ELSE 0
       END
     ), 0)
     FROM transactions t
     WHERE t.account_id = accounts.id
   );
   ```

### 7.2 Opcional: Wizard de configuración

Al detectar usuario sin cuentas configuradas, mostrar wizard:

```
┌─────────────────────────────────────────────┐
│  🎉 ¡Nueva función: Cuentas!                │
├─────────────────────────────────────────────┤
│                                             │
│  Ahora puedes gestionar múltiples cuentas   │
│  y tarjetas de crédito.                     │
│                                             │
│  Hemos creado una cuenta "General" con      │
│  tus transacciones existentes.              │
│                                             │
│  ¿Quieres configurar tus cuentas ahora?     │
│                                             │
│      [Ahora no]  [Configurar cuentas →]     │
└─────────────────────────────────────────────┘
```

---

## 8. Fases de Implementación

### Fase 1: Backend (Base)
- [ ] Crear tabla `accounts`
- [ ] Crear tabla `credit_card_details`
- [ ] CRUD de cuentas (`/api/accounts`)
- [ ] Endpoint de resumen (`/api/accounts/summary`)
- [ ] Modificar `transactions` para soportar `account_id`
- [ ] Lógica de actualización de balances

### Fase 2: Frontend (Cuentas)
- [ ] Página `/accounts` con listado
- [ ] Modal crear/editar cuenta
- [ ] Widget en Dashboard
- [ ] Actualizar Sidebar con nuevo link

### Fase 3: Integración (Transacciones)
- [ ] Selector de cuenta en formulario de transacción
- [ ] Soporte para transferencias entre cuentas
- [ ] Filtro por cuenta en listado de transacciones

### Fase 4: Tarjetas de Crédito
- [ ] Vista detallada de tarjeta
- [ ] Barra de utilización de crédito
- [ ] Cálculo de fechas de corte/pago
- [ ] Estado de cuenta

### Fase 5: Alertas y UX
- [ ] Notificaciones de fechas próximas
- [ ] Alertas de utilización alta (>80%)
- [ ] Acceso rápido "Pagar tarjeta"

### Fase 6: Migración
- [ ] Script de migración para usuarios existentes
- [ ] Wizard de bienvenida
- [ ] Pruebas con datos reales

---

## 9. Consideraciones Técnicas

### 9.1 Consistencia de balances

**Opción A: Calcular siempre desde transacciones**
- Pros: Siempre correcto, sin inconsistencias
- Cons: Lento en cuentas con muchas transacciones

**Opción B: Mantener balance en cuenta (recomendado)**
- Pros: Lecturas rápidas
- Cons: Requiere actualizar en cada transacción
- Mitigación: Usar transacciones de BD, recalcular periódicamente

### 9.2 Concurrencia

```javascript
// Usar transacción de base de datos
await db.transaction(async (trx) => {
  // 1. Crear transacción
  const transaction = await trx('transactions').insert({...});
  
  // 2. Actualizar balance origen
  await trx('accounts')
    .where('id', accountId)
    .decrement('balance', amount);
  
  // 3. Si es transferencia, actualizar destino
  if (toAccountId) {
    await trx('accounts')
      .where('id', toAccountId)
      .increment('balance', amount);
  }
});
```

### 9.3 Validaciones

- No permitir eliminar cuenta con transacciones (soft delete)
- No permitir balance negativo en efectivo (opcional, configurable)
- Validar que transferencia no sea a la misma cuenta
- Validar límite de crédito > 0 para tarjetas

---

## 10. Preguntas Pendientes

1. **¿Cuenta por defecto obligatoria?**
   - ¿El usuario debe seleccionar cuenta siempre o hay una por defecto?

2. **¿Permitir sobregiro en cuentas bancarias?**
   - Algunos bancos lo permiten

3. **¿Intereses automáticos?**
   - ¿Calcular intereses si no paga el total? (complejidad alta)

4. **¿Importar extractos bancarios?**
   - Futuro: integración con bancos o importar CSV

5. **¿Multi-moneda por cuenta?**
   - ¿Cada cuenta puede tener su propia moneda?

---

## 11. Recursos

- [Diseño UI en Figma](#) (pendiente)
- [API Docs Swagger](#) (pendiente)
- Branch de desarrollo: `feature/accounts-system`

---

*Documento creado el 31 de marzo de 2026. Última actualización: 31 de marzo de 2026.*
