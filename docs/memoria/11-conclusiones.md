# 11. Conclusiones

## 11.1 Grado de cumplimiento

Hasta la fecha de corte (2026-03-19), BarGAIN ha completado tres bloques críticos:

- F1: análisis, requisitos y diseño de arquitectura.
- F2: infraestructura base de desarrollo y CI.
- F3: backend core completo con módulos de dominio y API documentada.

Adicionalmente, F4 se encuentra en progreso avanzado con tareas hasta F4-27 completadas,
aportando una experiencia frontend funcional para autenticación, listas, catálogo, mapa,
notificaciones, perfil y portal business.

## 11.2 Aportaciones principales del trabajo

- Diseño e implementación de una arquitectura full-stack coherente con el contexto del TFG.
- Integración de geolocalización y comparación de precios en flujos de usuario reales.
- Base sólida para el objetivo diferencial del proyecto: optimización multicriterio de compra.
- Enfoque disciplinado de documentación y trazabilidad (TASKS, ADRs, planificación, memoria).

## 11.3 Limitaciones actuales

- El optimizador avanzado (F5) aún no está cerrado end-to-end con datos de scraping productivo.
- OCR y asistente LLM están implementados en frontend como flujo UI. En OCR se ha aprobado la
	migración de Tesseract a Google Vision API, pendiente de alineación backend definitiva.
- Faltan hitos de cierre F6: E2E globales, usabilidad formal, staging final y cierre académico.

## 11.4 Lecciones aprendidas

- El modelo híbrido backend Docker + frontend host ha sido determinante para productividad en
	Windows, evitando problemas de HMR en Expo.
- Mantener contratos API explícitos y documentación viva reduce fricción entre backend/frontend.
- Una gestión rigurosa de tareas y errores de agente acelera iteraciones y evita regresiones.

## 11.5 Trabajo futuro inmediato

1. Completar F5 con scraping estable, optimizer multicriterio y OCR/LLM en producción, incluyendo
   la migración OCR a Google Vision API.
2. Ejecutar F6 con pruebas finales, despliegue y validación con usuarios.
3. Consolidar resultados cuantitativos finales (ahorro, rendimiento, precisión OCR) para defensa.

## 11.6 Cierre

El proyecto ya dispone de una base técnica robusta y funcional para demostrar valor real en la
compra inteligente. El tramo final se centra en cerrar las capacidades avanzadas y validar con
evidencia experimental completa los objetivos del TFG.
