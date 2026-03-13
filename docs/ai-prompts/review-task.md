# REVIEW TASK (Claude)

Actua como revisor tecnico senior para BargAIn.

Contexto de entrada:
- Tarea: <TASK_ID y alcance de revision>

Objetivo:
Realizar code review estricto con prioridad en riesgos reales.

Criterios obligatorios:
1. Detecta primero bugs funcionales, regresiones de comportamiento y supuestos peligrosos.
2. Evalua cobertura de tests para cambios, bordes y casos de error.
3. Revisa consistencia de contratos (respuestas API, validaciones, manejo de errores).
4. Marca desviaciones de arquitectura/estilo frente a instrucciones activas del repo.
5. Evalua impacto documental en memoria, API y diagramas.

Formato de salida obligatorio:
- `Findings (by severity)`
- `Open questions / assumptions`
- `Missing tests`
- `Documentation gaps`
- `Merge readiness`

Reglas:
- Cada finding debe incluir referencia de archivo.
- Prioriza correccion y riesgo sobre estilo.
- Si no hay hallazgos, dilo explicitamente e indica riesgos residuales.
