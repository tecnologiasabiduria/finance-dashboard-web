# GHL Webhook - Supabase Edge Function

Edge Function para procesar webhooks de GoHighLevel y actualizar el estado de suscripción (`subscription_status`) en la tabla `profiles`.

## 📁 Ubicación

```
supabase/functions/ghl-webhook/
├── index.ts          # Función principal
└── README.md         # Este archivo
```

## 🎯 ¿Qué hace?

1. Recibe webhook POST de GoHighLevel
2. Extrae el `email` del contacto
3. Busca el usuario en la tabla `profiles`
4. Actualiza `subscription_status` a `active` o `none`

## 🚀 Despliegue

### 1. Instalar Supabase CLI (si no lo tienes)

```bash
npm install -g supabase
```

### 2. Login en Supabase

```bash
supabase login
```

### 3. Vincular con tu proyecto

```bash
supabase link --project-ref <tu-project-ref>
```

### 4. Configurar secreto de seguridad (opcional pero recomendado)

```bash
supabase secrets set GHL_WEBHOOK_SECRET=tu_secreto_aqui
```

### 5. Desplegar la función

```bash
supabase functions deploy ghl-webhook
```

## 🔗 URL del Webhook

Una vez desplegada, la URL será:

```
https://<tu-project-ref>.supabase.co/functions/v1/ghl-webhook
```

Esta es la URL que debes configurar en GoHighLevel.

## 🔧 Configuración en GoHighLevel

1. Crea un **Workflow** que se active con el trigger de pago (ej: "Invoice Paid", "Payment Received")
2. Agrega una acción **Webhook**
3. Configura:
   - **URL**: `https://<tu-project-ref>.supabase.co/functions/v1/ghl-webhook`
   - **Method**: POST
   - **Headers** (si usas secreto):
     ```
     Authorization: Bearer tu_secreto_aqui
     ```
4. El payload se enviará automáticamente con los datos del contacto

## 📨 Estructura del Webhook de GHL

GHL envía los datos del contacto en el cuerpo:

```json
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan@ejemplo.com",
  "phone": "+1234567890",
  "tags": ["paid", "subscriber"],
  "status": "won",
  "pipeline_stage": "Payment Completed",
  "invoice": {
    "status": "paid",
    "amount": 19.99
  },
  "location": {
    "id": "xxx",
    "name": "Mi Negocio"
  }
}
```

**Campo clave**: `email` - Se usa para identificar al usuario en `profiles`

## 📊 Lógica de Activación

| Condición en GHL | Estado resultante |
|------------------|-------------------|
| `status: "won"` | `active` |
| `invoice.status: "paid"` | `active` |
| `tags` incluye "paid", "subscriber", "pro" | `active` |
| `pipeline_stage` contiene "won", "paid", "completed" | `active` |
| `status: "lost"` o `invoice.status: "refunded"` | `none` |
| Webhook recibido (por defecto) | `active` |

## 🔐 Seguridad

- Si `GHL_WEBHOOK_SECRET` está configurado, valida el header `Authorization`
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Solo acepta método POST

## 🧪 Testing Local

```bash
# Iniciar función localmente
supabase functions serve ghl-webhook --env-file .env.local

# Probar con curl (simula pago exitoso)
curl -X POST http://localhost:54321/functions/v1/ghl-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu_secreto" \
  -d '{
    "email": "usuario@ejemplo.com",
    "status": "won",
    "invoice": { "status": "paid" }
  }'
```

## ✅ Respuestas

**Éxito (200)**:
```json
{
  "success": true,
  "message": "Suscripción actualizada correctamente",
  "data": {
    "user_id": "uuid-xxx",
    "email": "usuario@ejemplo.com",
    "previous_status": "none",
    "new_status": "active"
  }
}
```

**Usuario no encontrado (404)**:
```json
{
  "success": false,
  "message": "Usuario con email xxx no encontrado. El usuario debe registrarse primero."
}
```

## ⚠️ Importante

- El usuario **debe estar registrado** en la app antes de recibir el webhook
- El `email` en GHL debe coincidir exactamente con el email de registro
