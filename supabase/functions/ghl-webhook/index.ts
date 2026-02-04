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
  
  // Verificar tags del contacto (si GHL envía tags como "paid", "subscriber", etc.)
  const tags = payload.tags || [];
  const hasActiveTags = tags.some(tag => 
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

    console.log(`📧 Procesando para usuario: ${userEmail}`);

    // Crear cliente de Supabase con service role (para bypass de RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar el usuario por email en la tabla profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("email", userEmail)
      .single();

    if (profileError || !profile) {
      console.error("❌ Usuario no encontrado:", profileError?.message);
      
      // El usuario no existe en profiles, podría no haberse registrado aún
      // Opción: Guardar en una tabla de "pending activations" o simplemente loggear
      return jsonResponse(
        {
          success: false,
          message: `Usuario con email ${userEmail} no encontrado. El usuario debe registrarse primero.`,
        },
        404
      );
    }

    console.log(`✅ Usuario encontrado: ${profile.id} (estado actual: ${profile.subscription_status})`);

    // Determinar el nuevo estado de suscripción
    const newStatus = determineSubscriptionStatus(payload);
    console.log(`📊 Nuevo estado de suscripción: ${newStatus}`);

    // Actualizar subscription_status en la tabla profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("❌ Error actualizando suscripción:", updateError.message);
      return jsonResponse(
        { success: false, message: "Error actualizando suscripción" },
        500
      );
    }

    console.log(`✅ Suscripción actualizada: ${profile.subscription_status} → ${newStatus}`);

    return jsonResponse({
      success: true,
      message: `Suscripción actualizada correctamente`,
      data: {
        user_id: profile.id,
        email: userEmail,
        previous_status: profile.subscription_status,
        new_status: newStatus,
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
