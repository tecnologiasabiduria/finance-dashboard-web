// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================
// TIPOS - Estructura del Webhook de GoHighLevel
// ============================================

interface GHLWebhookPayload {
  // Campos de contacto (nivel raíz)
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  contact_source?: string;
  
  // Location data
  location?: {
    name?: string;
    id?: string;
  };
  
  // Opportunity (si aplica)
  opportunity_name?: string;
  status?: string;
  lead_value?: number;
  pipeline_stage?: string;
  pipeline_name?: string;
  
  // Invoice (si aplica - pagos)
  invoice?: {
    status?: string;
    amount?: number;
    [key: string]: unknown;
  };
  
  // Order (si aplica - pagos)
  order?: {
    status?: string;
    amount?: number;
    [key: string]: unknown;
  };
  
  // Workflow info
  workflow?: {
    id?: string;
    name?: string;
  };
  
  // Campos adicionales dinámicos
  [key: string]: unknown;
}

interface WebhookResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// Estados de suscripción permitidos en la DB
type SubscriptionStatus = "active" | "none" | "cancelled";

// ============================================
// CONFIGURACIÓN
// ============================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GHL_WEBHOOK_SECRET = Deno.env.get("GHL_WEBHOOK_SECRET"); // Opcional: para validar el webhook

// ============================================
// HELPERS
// ============================================

/**
 * Crea respuesta JSON estandarizada
 */
function jsonResponse(data: WebhookResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Valida la firma del webhook de GHL (si aplica)
 * GHL no tiene un estándar de firma, pero puedes usar un secreto en header personalizado
 */
function validateWebhookSignature(req: Request): boolean {
  // Si no hay secreto configurado, permitir (para desarrollo)
  if (!GHL_WEBHOOK_SECRET) {
    console.warn("⚠️ GHL_WEBHOOK_SECRET no configurado - webhook no verificado");
    return true;
  }

  // Buscar el secreto en headers comunes
  const authHeader = req.headers.get("authorization") || "";
  const customSecret = req.headers.get("x-webhook-secret") || "";
  
  // Verificar si coincide con nuestro secreto
  const isValid = 
    authHeader === `Bearer ${GHL_WEBHOOK_SECRET}` ||
    authHeader === GHL_WEBHOOK_SECRET ||
    customSecret === GHL_WEBHOOK_SECRET;

  if (!isValid) {
    console.error("❌ Firma de webhook inválida");
  }
  
  return isValid;
}

/**
 * Extrae el email del payload de GHL
 * El email viene en el campo 'email' a nivel raíz del contacto
 */
function extractEmailFromPayload(payload: GHLWebhookPayload): string | null {
  return payload.email || null;
}

/**
 * Determina el estado de suscripción
 * Por ahora: si recibimos el webhook de pago → activar
 * Puedes ajustar la lógica según el workflow de GHL
 */
function determineSubscriptionStatus(payload: GHLWebhookPayload): SubscriptionStatus {
  // Verificar por status de oportunidad
  const opportunityStatus = payload.status?.toLowerCase() || "";
  
  // Verificar por invoice/order
  const invoiceStatus = payload.invoice?.status?.toLowerCase() || "";
  const orderStatus = payload.order?.status?.toLowerCase() || "";
  
  // Verificar tags del contacto (GHL puede enviar como string o array)
  let tags: string[] = [];
  if (Array.isArray(payload.tags)) {
    tags = payload.tags;
  } else if (typeof payload.tags === "string") {
    // Si es string, separar por comas
    tags = payload.tags.split(",").map((t: string) => t.trim());
  }
  
  const hasActiveTags = tags.length > 0 && tags.some(tag => 
    ["paid", "subscriber", "active", "pro", "premium"].includes(tag.toLowerCase())
  );
  
  // Verificar si el pipeline stage indica pago completado
  const pipelineStage = payload.pipeline_stage?.toLowerCase() || "";
  const isPaidStage = ["won", "paid", "completed", "active"].some(s => 
    pipelineStage.includes(s)
  );

  // Condiciones para ACTIVAR
  if (
    opportunityStatus === "won" ||
    invoiceStatus === "paid" ||
    orderStatus === "completed" ||
    hasActiveTags ||
    isPaidStage
  ) {
    return "active";
  }

  // Condiciones para CANCELAR/DESACTIVAR
  if (
    opportunityStatus === "lost" ||
    opportunityStatus === "abandoned" ||
    invoiceStatus === "cancelled" ||
    invoiceStatus === "refunded"
  ) {
    return "none";
  }

  // Por defecto, si recibimos el webhook de un workflow de pago, activamos
  // Asumiendo que el workflow solo se dispara cuando hay pago exitoso
  return "active";
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

console.info("🚀 GHL Webhook Edge Function iniciada");

Deno.serve(async (req: Request) => {
  // Solo aceptar POST
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, message: "Método no permitido" },
      405
    );
  }

  try {
    // Validar firma del webhook
    if (!validateWebhookSignature(req)) {
      return jsonResponse(
        { success: false, message: "No autorizado" },
        401
      );
    }

    // Parsear el payload
    const payload: GHLWebhookPayload = await req.json();
    console.log("📨 Webhook recibido:", JSON.stringify(payload, null, 2));

    // Extraer email del usuario
    const userEmail = extractEmailFromPayload(payload);
    if (!userEmail) {
      console.error("❌ No se encontró email en el payload");
      return jsonResponse(
        { success: false, message: "Email no encontrado en el webhook" },
        400
      );
    }

    // Extraer nombre del payload (para crear usuario nuevo)
    const userName = payload.full_name || 
      `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || 
      'Usuario';

    // Extraer teléfono del payload
    const userPhone = payload.phone || null;

    console.log(`📧 Procesando para: ${userEmail} (${userName})${userPhone ? ` - Tel: ${userPhone}` : ''}`);

    // Crear cliente de Supabase con service role (para bypass de RLS y usar Admin API)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Determinar el nuevo estado de suscripción
    const newStatus = determineSubscriptionStatus(payload);
    console.log(`📊 Estado de suscripción a aplicar: ${newStatus}`);

    // ============================================
    // VERIFICAR SI EL USUARIO EXISTE EN PROFILES
    // ============================================
    
    // Buscar usuario en profiles por email (más eficiente que listUsers)
    const { data: existingProfile, error: profileSearchError } = await supabase
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("email", userEmail.toLowerCase())
      .maybeSingle();

    if (profileSearchError) {
      console.error("❌ Error buscando profile:", profileSearchError.message);
      return jsonResponse(
        { success: false, message: "Error verificando usuario" },
        500
      );
    }

    // ============================================
    // RAMA 1: USUARIO EXISTE → Solo actualizar status
    // ============================================
    
    if (existingProfile) {
      console.log(`✅ RAMA 1: Usuario existe (${existingProfile.id})`);

      // Actualizar subscription_status en profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);

      if (updateError) {
        console.error("❌ Error actualizando suscripción:", updateError.message);
        return jsonResponse(
          { success: false, message: "Error actualizando suscripción" },
          500
        );
      }

      console.log(`✅ Suscripción actualizada: ${existingProfile.subscription_status} → ${newStatus}`);

      return jsonResponse({
        success: true,
        message: "Suscripción actualizada correctamente",
        data: {
          action: "updated",
          user_id: existingProfile.id,
          email: userEmail,
          previous_status: existingProfile.subscription_status,
          new_status: newStatus,
        },
      });
    }

    // ============================================
    // RAMA 2: USUARIO NO EXISTE → Crear + Invitación por Email
    // ============================================
    
    console.log(`🆕 RAMA 2: Usuario NO existe, creando e invitando...`);

    // Usar inviteUserByEmail - Esto CREA el usuario Y ENVÍA el email automáticamente
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      userEmail,
      {
        data: {
          full_name: userName,
          phone: userPhone,
          source: "ghl_webhook",
        },
        redirectTo: `${Deno.env.get("SITE_URL") || "https://tu-app.com"}/auth/callback`,
      }
    );

    if (inviteError) {
      console.error("❌ Error invitando usuario:", inviteError.message);
      return jsonResponse(
        { success: false, message: `Error invitando usuario: ${inviteError.message}` },
        500
      );
    }

    console.log(`✅ Usuario invitado: ${inviteData.user.id}`);
    console.log(`📧 Email de invitación enviado a: ${userEmail}`);

    // Crear profile con subscription_status = active
    const { error: profileError } = await supabase.from("profiles").insert({
      id: inviteData.user.id,
      email: userEmail,
      full_name: userName,
      phone: userPhone,
      subscription_status: newStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("❌ Error creando profile:", profileError.message);
      // No es crítico, el profile se puede crear después
    } else {
      console.log(`✅ Profile creado con status: ${newStatus}`);
    }

    return jsonResponse({
      success: true,
      message: "Usuario creado y email de invitación enviado",
      data: {
        action: "created_and_invited",
        user_id: inviteData.user.id,
        email: userEmail,
        name: userName,
        phone: userPhone,
        new_status: newStatus,
        invitation_sent: true,
      },
    });

  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    return jsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error interno",
      },
      500
    );
  }
});
