# 10. Pruebas

## 10.1 Objetivo

Validar que BarGAIN cumple requisitos funcionales y no funcionales clave en las fases ya
implementadas (F1-F4 parcial), minimizando regresiones antes de abordar F5/F6.

## 10.2 Estrategia de testing

Se aplica una estrategia por capas:

- Pruebas unitarias backend por módulo (`users`, `products`, `stores`, `prices`,
	`shopping_lists`, `business`, `notifications`).
- Pruebas de integración backend para flujos cross-domain.
- Pruebas frontend con Jest + React Native Testing Library.
- Validaciones de contrato API mediante documentación OpenAPI/Swagger.

## 10.3 Entorno de ejecución

- Backend: ejecución recomendada dentro de Docker (modelo híbrido ADR-002).
- Frontend: ejecución nativa en host (Expo), con tests de componentes y pantallas.

Comandos de referencia:

```bash
make lint-backend
make test-backend
make test-backend-cov

cd frontend && npx eslint src/
cd frontend && npx jest --coverage
```

## 10.4 Casos cubiertos hasta la fecha

Backend:
- Autenticación JWT (registro, login, refresh, perfil).
- Catálogo de productos y búsqueda.
- Tiendas geolocalizadas y favoritos.
- Comparación de precios y alertas.
- Listas de compra, colaboradores y plantillas.
- Portal business (perfil, promociones, precios).
- Notificaciones push/email e inbox.

Frontend:
- Flujo de autenticación.
- Pantallas de listas y detalle.
- Home, notificaciones, perfil.
- Servicios API del cliente.

## 10.5 Resultados actuales

- F3 quedó validada con suite backend estable y cobertura alta del núcleo funcional.
- F4 incluye batería de tests de frontend actualizada a los contratos reales de API.
- La validación operativa de frontend en `.planning` registra ejecución verde de suites
	principales durante marzo de 2026.

## 10.6 Incidencias relevantes y mitigación

- Entornos Windows con GIS: mitigado ejecutando backend tests en Docker por defecto.
- Riesgo de desalineación frontend-backend: mitigado con contratos API centralizados y
	tests de servicios frontend.
- Riesgo en integraciones futuras (F5): pendiente ampliar pruebas de rendimiento del
	optimizador y precisión OCR con Google Vision API sobre tickets y listas reales.

## 10.7 Pruebas pendientes (F5/F6)

- Tests de optimizador multicriterio con casos borde y tiempos de respuesta.
- Tests de OCR con datasets de tickets/listas manuscritas y contraste de resultados tras la
  migración a Google Vision API.
- E2E completos de usuario (inicio a fin).
- Pruebas de usabilidad con usuarios reales.
- Validación final de criterios no funcionales de rendimiento y despliegue.

## 10.8 Conclusión

El estado de pruebas es sólido para la base funcional ya implementada. El foco de calidad para
el cierre del TFG se concentra en F5-F6: optimizador real, migración OCR a Google Vision,
OCR/LLM productivo, E2E y pruebas
de usuario final.
