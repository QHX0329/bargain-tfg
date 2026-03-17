# ADR-004: Estrategia de pruebas del backend (Fase 1)

## Fecha: 2026-03-17

## Estado: Aceptado

## Contexto

Al finalizar la Fase 1 del backend, se dispone de 179 pruebas automatizadas distribuidas entre tests unitarios e integración. Este documento recoge las decisiones de arquitectura del sistema de pruebas para que sirvan de referencia en las fases siguientes.

---

## Decisiones

### 1. pytest + pytest-django como framework de pruebas

**Decisión:** Se usa `pytest` con el plugin `pytest-django` como único runner de pruebas, sin usar `unittest` ni el runner nativo de Django (`manage.py test`).

**Justificación:**
- Fixtures de pytest permiten composición y reutilización sin herencia de clases.
- `pytest-django` integra el ciclo de vida de la base de datos de Django (`@pytest.mark.django_db`) con la semántica declarativa de pytest.
- La salida por terminal es más legible y configurable que el runner de Django.
- La integración con `pytest-cov` para cobertura es directa.

**Configuración base:** `backend/pytest.ini` (o `pyproject.toml` sección `[tool.pytest.ini_options]`). El directorio raíz de tests es `backend/tests/`.

---

### 2. Dos capas de prueba: unitaria e integración

**Decisión:** Las pruebas se dividen en dos capas con responsabilidades distintas:

**Capa unitaria (`tests/unit/`):**
- Prueba lógica de modelos, serializers, helpers y servicios de forma aislada.
- No accede a la base de datos real cuando es posible; usa mocks o fixtures en memoria.
- Ejecución rápida (< 5 segundos para toda la capa).

**Capa de integración (`tests/integration/`):**
- Prueba el ciclo HTTP completo: petición → middleware → view → serializer → base de datos → respuesta.
- Usa `APIClient` de DRF y transacciones revertibles de Django.
- Verifica el contrato de la API (códigos HTTP, formato `{success, data}`).

**Justificación:** Separar las capas permite ejecutar solo los tests unitarios durante el desarrollo rápido (`make test-unit`) y reservar la suite completa para las revisiones de integración y el CI/CD.

---

### 3. factory_boy con resolución de modelos lazy

**Decisión:** Todas las fábricas de objetos de prueba usan `factory.lazy_attribute` o `factory.SubFactory` con importación diferida (cadena de texto en lugar de clase directa) para evitar problemas de importación circular al cargar la configuración de Django.

**Justificación:** Django no garantiza el orden de inicialización de las apps al importar módulos en el nivel raíz. Si una factoría importa un modelo directamente en la definición del módulo, puede fallar con `AppRegistryNotReady`. El patrón `factory.django.DjangoModelFactory` con `model = 'app.Model'` (cadena) resuelve el modelo en el momento de instanciación, cuando el registro de apps ya está inicializado.

**Consecuencias:** Las fábricas pueden importarse en cualquier punto del código de pruebas sin riesgo de errores de inicialización. Este patrón debe mantenerse en todas las fábricas nuevas.

---

### 4. Todos los tests se ejecutan dentro del contenedor Docker

**Decisión:** El comando canónico para ejecutar los tests es `make test-backend`, que ejecuta `pytest` dentro del contenedor Docker del backend.

**Justificación:** GDAL y GEOS (dependencias de PostGIS/GeoDjango) solo están disponibles en el contenedor. Ejecutar los tests en el host produce `ImproperlyConfigured: Could not find the GDAL library` incluso con el venv de Python configurado. Esta restricción es permanente mientras el entorno de desarrollo siga el modelo híbrido (ADR-002).

**Referencia:** Ver `feedback_docker_backend.md` y `user_python_env.md` en la carpeta `memory/`.

**Consecuencias:** El CI/CD en GitHub Actions debe usar la imagen Docker del backend para ejecutar los tests. No se deben añadir instrucciones de ejecución de tests en host en la documentación del proyecto.

---

### 5. Política de muestreo de ejecución (Nyquist sampling)

**Decisión:** Se establecen dos niveles de ejecución de la suite:

- **Por commit de tarea:** Ejecutar la suite unitaria (`tests/unit/`). Rápido y suficiente para detectar regresiones locales.
- **Por ola de planificación (cierre de tarea o PR):** Ejecutar la suite completa (`tests/unit/` + `tests/integration/`). Aproximadamente 60 segundos en Docker.

**Justificación:** Ejecutar los 179 tests completos en cada commit introduce una fricción de ~60 segundos que ralentiza el flujo de desarrollo. Los tests unitarios (< 5 s) cubren la lógica que cambia con más frecuencia. Los tests de integración se ejecutan al finalizar cada tarea para garantizar que no hay regresiones en el contrato HTTP.

---

### 6. Umbral de cobertura del 92% como gate de fase

**Decisión:** La Fase 1 establece un umbral mínimo de cobertura del 92% medido con `pytest-cov`. El CI/CD falla si la cobertura cae por debajo de este umbral.

**Justificación:** El umbral del 92% fue fijado en la tarea 01-06 (gate de cobertura de la Fase 1) como compromiso entre exhaustividad y pragmatismo. El 8% restante corresponde a ramas de error difíciles de reproducir en entorno de pruebas (por ejemplo, errores de red en Celery) y código de configuración que no tiene lógica propia.

**Consecuencias:** Las fases siguientes deben mantener o superar este umbral. Si se añade código con lógica de dominio nueva, se deben añadir tests correspondientes antes de que el PR sea aceptado.

---

### 7. Test de dominio cruzado (`test_cross_domain.py`)

**Decisión:** Se incluye un test de integración de extremo a extremo en `tests/integration/test_cross_domain.py::TestHappyPath` que recorre la cadena completa: Auth → Products → Stores → Prices → Lists.

**Justificación:** Los tests de integración por dominio (un archivo por app) verifican cada módulo de forma aislada, pero no detectan roturas en los puntos de unión entre módulos. El test de dominio cruzado simula el flujo real de un usuario: registrarse, buscar un producto, encontrar tiendas cercanas, comparar precios y crear una lista. Es el test con mayor valor de regresión del proyecto.

**Consecuencias:** Este test debe actualizarse cuando cambie el flujo principal de usuario. Si falla de forma aislada (sin que fallen los tests por dominio), indica un problema de integración entre módulos.

---

### 8. Validaciones manuales excluidas de la suite automatizada

**Decisión:** Las siguientes validaciones se realizan de forma manual y están documentadas en `docs/VALIDATION.md`:

- **Precisión de distancia PostGIS:** Verificación de que las coordenadas geoespaciales y los cálculos de distancia son correctos con datos reales de tiendas de Sevilla.
- **Entrega de email SMTP:** Verificación de que los emails de restablecimiento de contraseña y alertas de precio llegan correctamente a través del servidor SMTP configurado.

**Justificación:** Estas pruebas requieren datos geoespaciales reales y un servidor SMTP externo que no están disponibles en el entorno Docker de CI. Automatizarlas requeriría mocks que reducirían el valor de la prueba a casi cero (se estaría verificando el mock, no el sistema real).

---

## Métricas de la Fase 1

| Métrica | Valor |
|---------|-------|
| Total de tests | 179 |
| Tests unitarios | ~90 |
| Tests de integración | ~89 |
| Tiempo de ejecución (Docker) | ~60 segundos |
| Cobertura (gate) | 92% |
| Test cross-domain | 1 (flujo Auth→Products→Stores→Prices→Lists) |

---

## Consecuencias generales

- Cualquier nueva app de Django añadida en fases siguientes debe tener tests en `tests/unit/<app>/` y `tests/integration/<app>/` antes de ser mergeada a `develop`.
- Las fábricas nuevas deben seguir el patrón lazy de importación descrito en la decisión 3.
- El test cross-domain debe ampliarse cuando se implementen los módulos de optimización de rutas (Fase 4) y el asistente LLM (Fase 5), añadiendo un flujo completo de optimización y una consulta al asistente.
