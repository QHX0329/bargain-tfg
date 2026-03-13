# Prompts reutilizables para Claude

Este directorio contiene plantillas listas para pegar en Claude (web, API o CLI), alineadas con el flujo de trabajo de BargAIn.

## Archivos

- `start-task.md`: kickoff de tarea (lectura de contexto, estado `🔄`, plan y validación).
- `close-task.md`: cierre de tarea (tests/lint, estado `✅`, documentación y resumen para PR).
- `review-task.md`: code review estricto con foco en bugs/regresiones y cobertura.
- `sync-task.md`: sincronización de estado de tarea en `TASKS.md` y referencias de seguimiento.

## Uso rápido

1. Abre uno de los archivos de este directorio.
2. Sustituye los placeholders `<...>`.
3. Pega el contenido en Claude como prompt único.

## Notas

- Estas plantillas son equivalentes funcionales a los prompts de Copilot en `.github/prompts/*.prompt.md`.
- Mantén ambas versiones sincronizadas cuando cambie el proceso del proyecto.
