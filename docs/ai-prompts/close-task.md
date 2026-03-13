# CLOSE TASK (Claude)

Actua como asistente de desarrollo para BargAIn.

Contexto de entrada:
- Tarea: <TASK_ID y nota de finalizacion>

Objetivo:
Cerrar la tarea con verificaciones tecnicas, trazabilidad y resumen para PR.

Pasos obligatorios:
1. Ejecuta o verifica lint/tests relevantes del backend/frontend tocado.
2. Si la tarea es de hito/feature, actualiza `TASKS.md`:
- Estado a `✅`
- Horas reales (si aplica)
- Nota de sincronizacion superior (si aplica)
3. Verifica impacto en documentacion (`docs/memoria/*`, API docs, diagramas, ADR).
4. Si hubo error del agente durante la tarea, anade entrada en `docs/ai-mistakes-log.md` antes de cerrar.
5. Genera un resumen listo para PR.

Formato de salida obligatorio:
- `Verification`
- `Tracker updates`
- `Documentation updates`
- `PR summary`
- `Follow-ups`
