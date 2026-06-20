/**
 * Traducción de errores de API/red a mensajes claros en lenguaje natural.
 *
 * Evita que el portal muestre códigos internos, objetos crudos (`[object Object]`)
 * o textos técnicos. Cualquier `catch` de la aplicación puede pasar el error por
 * `getErrorMessage()` para obtener un texto entendible por el usuario.
 */

interface ApiErrorEnvelope {
  success?: boolean;
  error?: { code?: string; message?: string; details?: unknown };
  detail?: string;
  [key: string]: unknown;
}

interface NormalizedAxiosError {
  isAxiosError?: boolean;
  message?: string;
  response?: { status?: number; data?: unknown };
}

/** Mensajes por código de estado HTTP. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Hay algún dato incorrecto en la solicitud. Revísalo e inténtalo de nuevo.',
  401: 'Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.',
  403: 'No tienes permiso para realizar esta acción. Si tu perfil de negocio aún no está validado, espera a que un administrador lo apruebe.',
  404: 'No se ha encontrado lo que buscabas. Puede que ya no exista.',
  409: 'La operación entra en conflicto con información que ya existe.',
  413: 'El archivo es demasiado grande. Prueba con uno más pequeño.',
  429: 'Has realizado demasiadas peticiones en poco tiempo. Espera un momento e inténtalo de nuevo.',
  500: 'Se ha producido un error en el servidor. Inténtalo de nuevo en unos minutos.',
  502: 'El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
  503: 'El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
  504: 'El servidor ha tardado demasiado en responder. Inténtalo de nuevo en unos minutos.',
};

/** Códigos de error que devuelve el backend, traducidos a texto amable. */
const CODE_MESSAGES: Record<string, string> = {
  NOT_VERIFIED:
    'Tu perfil de negocio todavía no ha sido validado por un administrador. Te avisaremos por email cuando esté aprobado.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',
  STORE_NOT_FOUND: 'No se ha encontrado la tienda indicada.',
  PROMOTION_CONFLICT:
    'Ya existe una promoción activa para ese producto en esa tienda. Desactiva la anterior antes de crear otra.',
  INVALID_FORMAT: 'El formato de los datos enviados no es válido.',
};

/** Heurística para detectar textos que parecen código y no deben mostrarse. */
function looksLikeCode(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.includes('[object Object]')) return true;
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(t)) return true; // p. ej. STORE_NOT_FOUND
  if (/^[{[].*[}\]]$/.test(t)) return true; // parece JSON
  if (/^https?:\/\//.test(t)) return true; // una URL suelta
  return false;
}

/** Recorre estructuras de errores de campo (DRF) y reúne los mensajes legibles. */
function collectFieldMessages(data: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  const out: string[] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'string') {
        if (!looksLikeCode(item)) out.push(item);
      } else {
        out.push(...collectFieldMessages(item, depth + 1));
      }
    }
  } else if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key === 'success' || key === 'code') continue;
      if (typeof value === 'string') {
        if (!looksLikeCode(value)) out.push(value);
      } else {
        out.push(...collectFieldMessages(value, depth + 1));
      }
    }
  }
  return out;
}

/**
 * Devuelve un mensaje de error legible a partir de cualquier error capturado.
 *
 * @param error    El error capturado (axios, Error o desconocido).
 * @param fallback Mensaje a usar si no se puede deducir nada mejor.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
): string {
  const axiosError = error as NormalizedAxiosError;

  // Sin respuesta del servidor: problema de red o servidor caído.
  if (axiosError?.isAxiosError && !axiosError.response) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo. Si acabas de abrir el portal, el servidor gratuito puede tardar unos segundos en despertar.';
  }

  const status = axiosError?.response?.status;
  const data = axiosError?.response?.data;

  if (data && typeof data === 'object') {
    const env = data as ApiErrorEnvelope;

    // Envoltorio propio de la API: { success: false, error: { code, message } }
    if (env.error && typeof env.error === 'object') {
      const code = env.error.code;
      if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
      const msg = env.error.message;
      if (typeof msg === 'string' && !looksLikeCode(msg)) return msg;
    }

    // Formato por defecto de DRF: { detail: "..." }
    if (typeof env.detail === 'string' && !looksLikeCode(env.detail)) return env.detail;

    // Errores de validación por campo: { campo: ["mensaje", ...], ... }
    const fieldMessages = collectFieldMessages(data);
    if (fieldMessages.length > 0) return fieldMessages.join(' ');
  }

  if (typeof status === 'number' && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  if (error instanceof Error && error.message && !looksLikeCode(error.message)) {
    return error.message;
  }

  return fallback;
}
