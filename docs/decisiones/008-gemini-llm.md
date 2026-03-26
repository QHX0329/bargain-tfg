# ADR-008: Migración del asistente LLM a Google Gemini API

## Estado
Aceptado

## Contexto
El proyecto incorporó inicialmente el asistente conversacional usando la API de Anthropic (Claude).
La integración era funcional a nivel de código, pero durante las pruebas UAT de la fase 5 el
endpoint devolvió errores 401 Unauthorized de forma persistente, incluso con una clave de API
configurada en el contenedor Docker.

El origen del problema fue que la clave de Anthropic era inválida o había expirado, y que el
acceso a la API de Anthropic requiere créditos de pago activos (sin tier gratuito disponible
para proyectos académicos). Esto bloqueaba la validación funcional del asistente en UAT.

El proyecto ya utiliza APIs de Google para otras funcionalidades clave:
- **Google Cloud Vision API** para OCR (ADR-007)
- **Google Maps API** para mapas en el frontend

## Decisión
Se migra el asistente LLM de **Anthropic Claude** a **Google Gemini API** (`gemini-2.0-flash`).

La migración implica:
- Sustituir el SDK `anthropic` por `google-generativeai` en `requirements/base.txt`
- Reescribir `apps/assistant/services.py` para usar `genai.GenerativeModel` con `system_instruction`
- Reemplazar la variable de entorno `ANTHROPIC_API_KEY` por `GEMINI_API_KEY`
- Adaptar los tests unitarios a los nuevos mocks del SDK de Gemini

El system prompt de guardarraíles de dominio (compras) se mantiene sin cambios funcionales.
El contrato de la API REST (`POST /api/v1/assistant/chat/`) no cambia.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes |
| --- | --- | --- |
| Anthropic Claude API | Modelo de alta calidad, integración ya implementada | Sin tier gratuito, clave expirada bloquea UAT, coste para proyecto académico |
| Google Gemini API | Tier gratuito disponible, misma cuenta Google del proyecto, SDK oficial Python | Ligera curva de adaptación del SDK (roles "model" vs "assistant") |
| OpenAI GPT API | Ampliamente documentado | Sin tier gratuito permanente, dependencia adicional, mayor coste |
| Modelo local (Ollama/LMStudio) | Sin coste, sin dependencia de red | Requiere hardware dedicado, complejidad operativa, fuera de alcance del TFG |

## Justificación

- **Desbloqueo inmediato de UAT**: Gemini tiene un tier gratuito operativo que permite completar
  las pruebas sin necesidad de configurar facturación.
- **Consolidación de proveedores Google**: el proyecto ya depende de Google Cloud para Vision API
  y Maps API; añadir Gemini no introduce un proveedor nuevo.
- **Calidad suficiente para el caso de uso**: `gemini-2.0-flash` ofrece buena comprensión en
  español para el dominio de compras, que es relativamente acotado y poco exigente.
- **Cambio de bajo riesgo**: el contrato externo (endpoint REST) no cambia. Solo cambia la
  librería interna del servicio.

## Consecuencias

- La variable de entorno del asistente pasa de `ANTHROPIC_API_KEY` a `GEMINI_API_KEY`.
  Los entornos existentes deben actualizar su `.env`.
- La dependencia `anthropic>=0.30` se elimina de `requirements/base.txt`.
  Se añade `google-generativeai>=0.8`.
- Los tests unitarios del asistente mockean `google.generativeai` en lugar de `anthropic`.
- El historial de mensajes se convierte internamente: el rol `"assistant"` de BargAIn se mapea
  a `"model"` en el protocolo Gemini antes de la llamada a la API.
- La documentación de memoria del TFG (sección de herramientas y decisiones de diseño) debe
  reflejar Gemini como proveedor LLM activo.
