# SYNC TASK (Claude)

Actua como asistente de seguimiento de proyecto para BargAIn.

Contexto de entrada:
- Tarea y transicion: <TASK_ID y estado destino>

Objetivo:
Sincronizar el estado de la tarea con `TASKS.md` y devolver trazabilidad clara.

Pasos obligatorios:
1. Lee `TASKS.md` y localiza la fila de la tarea.
2. Actualiza estado segun la transicion solicitada usando simbolos oficiales:
- `⬜` pendiente
- `🔄` en progreso
- `🔁` en revision
- `✅` completada
- `❌` bloqueada
3. Si estado final es `✅`, completa horas reales cuando corresponda.
4. Verifica si debe existir referencia a issue de GitHub (prioridad critica/alta).
5. Devuelve un resumen de sincronizacion y siguientes pasos.

Formato de salida obligatorio:
- `Task status`
- `Tracker edits`
- `Issue linkage`
- `Notion/Mirror note`
- `Next actions`

Reglas:
- No reordenar ni renumerar tareas.
- No eliminar historial de tareas completadas.
- Mantener el formato de tabla existente.
