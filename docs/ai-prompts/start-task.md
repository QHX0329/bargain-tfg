# START TASK (Claude)

Actua como asistente de desarrollo para BargAIn.

Contexto de entrada:
- Tarea: <TASK_ID y objetivo>

Objetivo:
Preparar el arranque de la tarea con el protocolo del proyecto.

Pasos obligatorios:
1. Lee `TASKS.md` y `docs/ai-mistakes-log.md` completos.
2. Localiza la tarea en `TASKS.md` y cambia estado a `🔄` si es tarea de hito/feature.
3. Resume restricciones relevantes de `CLAUDE.md` y de `.github/instructions/*.instructions.md`.
4. Inspecciona los modulos afectados e identifica ficheros probables a modificar y tests a tocar.
5. Devuelve un reporte de kickoff breve y accionable.

Formato de salida obligatorio:
- `Task`
- `Constraints`
- `Plan`
- `Validation`
- `Open questions`
