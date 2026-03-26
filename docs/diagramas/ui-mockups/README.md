# Wireframes y Mockups de Interfaz de Usuario — BargAIn

**Tarea:** F1-14 · Fase 1 — Análisis y Diseño  
**Entregable:** `docs/diagramas/ui-mockups/`  
**Fecha:** Marzo 2026  
**Herramienta:** HTML + CSS + JS (renderizable en GitHub Pages)  
**Marco de referencia:** iPhone 14 · 375 × 812 pt  

---

## Sistema de diseño

Antes de describir cada pantalla, se establece el sistema de diseño que aplica de forma transversal a toda la aplicación. Los tokens definidos aquí se implementarán directamente en `frontend/src/theme/` y son la única fuente de verdad para colores, tipografía y espaciado.

### Paleta de colores

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#2E7D32` | Acciones principales, CTAs, elementos activos |
| `primaryLight` | `#60AD5E` | Estados hover, fondos sutiles, chips |
| `primaryDark` | `#1B5E20` | Gradientes, encabezados |
| `secondary` | `#FF6F00` | Ahorros destacados, alertas de precio, badges |
| `surface` | `#FAFAFA` | Fondo de tarjetas y pantallas |
| `error` | `#C62828` | Errores, validaciones, elementos de baja confianza OCR |
| `textPrimary` | `#212121` | Texto principal |
| `textSecondary` | `#757575` | Texto de apoyo, metadatos |

### Tipografía

- **Display / Títulos:** `Plus Jakarta Sans` (pesos 700–800) — para nombres de pantalla, cifras de ahorro y botones CTA.
- **Cuerpo / UI:** `DM Sans` (pesos 400–600) — para texto de párrafo, etiquetas de formulario y contenido de lista.

### Navegación principal

La aplicación se estructura en cinco pestañas fijas en la barra de navegación inferior:

| Pestaña | Icono | Pantalla destino |
|---|---|---|
| Inicio | 🏠 | Dashboard |
| Mi Lista | 📝 | Lista de la compra activa |
| Explorar | 🗺 | Mapa de tiendas |
| Optimizar | ⚡ | Optimizador PDT |
| Perfil | 👤 | Perfil y preferencias |

---

## Pantallas

### 01 — Inicio de Sesión

![Mockup pantalla Login](assets/01-login.png)

#### Descripción

Pantalla de entrada a la aplicación para usuarios ya registrados. Ofrece dos vías de autenticación: formulario clásico con correo y contraseña, y acceso social mediante cuenta Google. El encabezado visual refuerza la identidad de marca con el gradiente corporativo verde y el logotipo de la app.

#### Flujo de usuario

El usuario llega a esta pantalla como punto de entrada tras el splash screen. Si introduce credenciales correctas, el sistema devuelve un par de tokens JWT (access + refresh) y redirige al Dashboard. Si las credenciales son incorrectas, se muestra un mensaje de error inline bajo el campo correspondiente. El enlace "¿Olvidaste tu contraseña?" inicia el flujo de recuperación por email.

#### Componentes clave

| Componente | Descripción |
|---|---|
| `LoginForm` | Formulario con validación en tiempo real y mensajes de error inline |
| `SocialButton` | Botón de OAuth con Google (django-allauth en backend) |
| `HeroGradient` | Encabezado con gradiente verde, logotipo y tagline de la app |

#### Módulo Django

`apps.users` — endpoint `POST /api/v1/auth/login/` (SimpleJWT) y `POST /api/v1/auth/social/google/` (allauth).

#### Requisitos cubiertos

`RF-001` Autenticación con email/contraseña · `RF-002` Autenticación social (Google) · `HU-001` Inicio de sesión

---

### 02 — Registro de Usuario

![Mockup pantalla Registro](assets/02-registro.png)

#### Descripción

Wizard de tres pasos para la creación de una cuenta nueva. La pantalla mostrada corresponde al **Paso 1 de 3: Datos personales**. La barra de progreso en la parte superior indica visualmente el avance del proceso. Los pasos siguientes (no mostrados en este mockup) recogen la ubicación del usuario mediante un mapa interactivo (Paso 2) y las preferencias iniciales del optimizador, como los pesos PDT y el radio de búsqueda (Paso 3).

#### Flujo de usuario

El usuario elige entre dos tipos de cuenta: **Consumidor** (acceso completo a listas, optimizador y asistente) o **Comercio/PYME** (acceso al portal business para publicar precios y promociones). La selección del tipo de cuenta condiciona los permisos del token JWT y la experiencia posterior. Es obligatorio aceptar los Términos de Servicio antes de continuar.

#### Componentes clave

| Componente | Descripción |
|---|---|
| `ProgressSteps` | Indicador de pasos con barra de color que avanza por paso completado |
| `AccountTypeSelector` | Tarjetas de selección exclusiva para Consumidor / Comercio/PYME |
| `TermsCheckbox` | Checkbox con enlace a términos y política de privacidad |

#### Módulo Django

`apps.users` — endpoint `POST /api/v1/auth/register/`. El tipo de cuenta se almacena en `User.role` (campo choices).

#### Requisitos cubiertos

`RF-001` Registro de usuario · `RF-003` Gestión de perfil · `HU-002` Crear cuenta nueva

---

### 03 — Dashboard / Inicio

![Mockup pantalla Dashboard](assets/03-dashboard.png)

#### Descripción

Pantalla central de la aplicación tras el inicio de sesión. Actúa como hub de información y acceso rápido a todas las funcionalidades principales. Se divide en cuatro bloques verticales: encabezado de saludo personalizado con fecha, tarjeta de resumen de ahorro mensual con estadísticas, sección de alertas de precios activas y cuadrícula de acciones rápidas, seguida del listado de tiendas cercanas con el precio estimado de la lista activa.

#### Bloques de contenido

**Tarjeta de ahorro mensual:** Muestra el ahorro total acumulado en el mes en curso comparado con el mes anterior (variación porcentual). Incluye tres métricas secundarias: número de listas activas, productos en lista y rutas guardadas. El ahorro se calcula como la diferencia entre el precio que el usuario habría pagado comprando todo en la tienda más cara y el coste real de las rutas optimizadas ejecutadas.

**Alertas de precios:** Notificaciones en tiempo real de bajadas de precio para productos que el usuario tiene en sus listas activas. Cada alerta muestra el producto, la tienda y el importe ahorrado. Se generan mediante una tarea Celery que compara el precio actual con el histórico de las últimas 48 horas.

**Acciones rápidas:** Cuatro atajos a las funcionalidades más utilizadas: Mi Lista, Optimizar ruta, Escanear ticket (OCR) y Asistente IA.

**Tiendas cercanas:** Listado de los tres supermercados más próximos a la ubicación del usuario, con la distancia, horario y el coste estimado de su lista activa en cada tienda. Los datos se obtienen mediante una consulta PostGIS `dwithin` filtrada por el radio configurado por el usuario.

#### Módulo Django

`apps.users` + `apps.prices` — endpoints `GET /api/v1/dashboard/summary/` y `GET /api/v1/stores/nearby/`.

#### Requisitos cubiertos

`RF-006` Consulta de productos · `RF-015` Consulta de precios · `HU-008` Ver resumen de ahorro · `HU-028` Gestionar notificaciones

---

### 04 — Mi Lista de Compra

![Mockup pantalla Mi Lista](assets/04-mi-lista.png)

#### Descripción

Pantalla de gestión de la lista de la compra activa. Los productos se agrupan por categoría para facilitar la navegación en el supermercado. Cada ítem muestra el nombre, la marca, la tienda con mejor precio y un selector de cantidad. Los productos ya comprados se marcan con un check verde y se tachan visualmente para separar el estado pendiente del completado.

#### Interacciones principales

- **Buscador superior:** campo de texto con autocompletado contra el catálogo normalizado de `apps.products`. El icono de cámara a la derecha lanza directamente el flujo OCR para añadir productos desde una foto.
- **Swipe-to-delete:** deslizar un ítem hacia la izquierda muestra el botón de eliminar (implementado con `react-native-gesture-handler`).
- **Selector de cantidad:** incremento/decremento inline con botones `+`/`-`. El total estimado en la barra de estadísticas se recalcula en tiempo real.
- **Botón "Optimizar ruta":** elemento sticky en la parte inferior que lanza el algoritmo PDT con los productos de la lista actual. Muestra el ahorro potencial calculado de forma previa.

#### Barra de estadísticas

Siempre visible bajo la barra de búsqueda. Muestra el número de productos pendientes, los ya comprados y el coste total estimado de la lista usando los precios más baratos disponibles en tiendas cercanas.

#### Módulo Django

`apps.shopping_lists` — endpoints `GET/POST /api/v1/lists/{id}/items/`, `PATCH /api/v1/lists/{id}/items/{item_id}/` y `DELETE /api/v1/lists/{id}/items/{item_id}/`.

#### Requisitos cubiertos

`RF-020` Listar productos · `RF-021` Añadir producto · `RF-022` Eliminar producto · `RF-023` Marcar como comprado · `HU-010` Gestionar lista de compra

---

### 05 — Explorar Mapa

![Mockup pantalla Explorar Mapa](assets/05-explorar.png)

#### Descripción

Vista de mapa interactivo centrado en la ubicación del usuario (punto azul) con marcadores de todas las tiendas dentro del radio de búsqueda configurado. Al tocar un marcador, el panel inferior deslizable (bottom sheet) muestra los detalles de la tienda seleccionada: nombre, cadena, distancia, horario y tabla de precios de los productos de la lista activa en esa tienda.

#### Filtros de mapa

Tres chips de filtrado rápido en la parte superior del mapa:
- **Todas:** muestra todos los supermercados en el radio.
- **Abiertas:** filtra solo las tiendas con horario de apertura vigente en el momento de la consulta.
- **Más baratas:** ordena y resalta las tiendas con menor coste total de la lista activa.

#### Panel inferior (bottom sheet)

Componente deslizable con dos estados de altura: comprimido (solo nombre y distancia) y expandido (tabla de precios completa). Muestra el precio de cada producto de la lista activa en la tienda seleccionada y el total estimado. Un botón CTA lanza directamente el optimizador con esa tienda prefijada como parada obligatoria.

#### Módulo Django

`apps.stores` + `apps.prices` — endpoint `GET /api/v1/stores/nearby/?lat=&lng=&radius=` con anotación PostGIS de distancia y join con precios actuales.

#### Requisitos cubiertos

`RF-011` Consulta de tiendas · `RF-015` Consulta de precios · `HU-009` Explorar tiendas en mapa

---

### 06 — Optimizador PDT

![Mockup pantalla Optimizador](assets/06-optimizador.png)

#### Descripción

Pantalla central del algoritmo de optimización multicriterio Precio-Distancia-Tiempo. Se divide en dos bloques: el panel de configuración de parámetros en la parte superior y los resultados (top-3 rutas candidatas) en la parte inferior.

#### Panel de configuración

Tres sliders independientes para ajustar el peso relativo de cada criterio: precio (prioridad de ahorro económico), distancia (minimizar kilómetros recorridos) y tiempo (minimizar duración total de la compra). Los pesos deben sumar 100%; el sistema normaliza automáticamente si el usuario los ajusta de forma desequilibrada. Un selector de 1 a 4 botones fija el número máximo de paradas por ruta (valor por defecto: 3, según RN-002).

#### Función de scoring

```
Score = w_precio × ahorro_total − w_distancia × distancia_extra − w_tiempo × tiempo_extra
```

Donde `ahorro_total` es el ahorro respecto a comprar todo en una única tienda, `distancia_extra` es el incremento de kilómetros respecto a ir solo a la tienda más cercana, y `tiempo_extra` es el tiempo adicional estimado. OR-Tools resuelve el problema de ruteo de vehículos (VRP) subyacente.

#### Tarjetas de ruta

Cada una de las tres rutas candidatas muestra: las paradas ordenadas (iconos de cadena), el coste total, el ahorro respecto a una única tienda, la distancia total y el tiempo estimado. La ruta con mayor score aparece destacada con el badge "MEJOR OPCIÓN" y un botón CTA principal. Las otras dos tienen botones secundarios de selección.

#### Módulo Django

`apps.optimizer` — endpoint `POST /api/v1/optimizer/routes/` con cuerpo `{list_id, weights, max_stops}`. La respuesta incluye las tres rutas con su desglose completo.

#### Requisitos cubiertos

`RF-024` Calcular rutas · `RF-025` Mostrar desglose de ahorro · `RF-026` Seleccionar ruta · `HU-013` Optimizar lista de compra

---

### 07 — Perfil de Usuario

![Mockup pantalla Perfil](assets/07-perfil.png)

#### Descripción

Pantalla de configuración personal y estadísticas de uso. Se estructura en cuatro secciones verticales: encabezado de perfil con datos básicos y badge de verificación, fila de estadísticas agregadas, listado de listas guardadas, configuración de preferencias del optimizador y ajustes de cuenta/notificaciones.

#### Secciones

**Estadísticas de uso:** Tres métricas destacadas en la parte superior: ahorro total del mes en curso, número de compras optimizadas realizadas y listas activas. Estos datos provienen del endpoint de resumen del dashboard y se actualizan en cada carga de la pantalla.

**Mis listas de la compra:** Acceso directo a todas las listas activas del usuario. Máximo 20 listas simultáneas según RN-006. Cada ítem muestra el nombre, el número de productos y el estado.

**Preferencias de optimización:** Los tres parámetros configurables del algoritmo (pesos PDT, radio de búsqueda y máximo de paradas) con los valores actuales visibles inline. Al tocar cualquier ítem se navega a la pantalla de edición correspondiente. Los valores se persisten en `UserPreferences` como campo JSON en el modelo `User`.

**Cuenta y notificaciones:** Acceso a la configuración de alertas de precio, preferencias de privacidad (gestión del `PointField` de ubicación) y botón de cierre de sesión (invalida el refresh token en backend).

#### Módulo Django

`apps.users` + `apps.shopping_lists` — endpoints `GET/PATCH /api/v1/users/me/` y `GET /api/v1/lists/`.

#### Requisitos cubiertos

`RF-003` Ver perfil · `RF-004` Editar perfil · `RF-005` Configurar preferencias · `HU-005` Gestionar cuenta

---

### 08 — OCR: Paso 1 / Captura

![Mockup pantalla OCR Captura](assets/08-ocr-captura.png)

#### Descripción

Primera pantalla del wizard de captura de lista por cámara. Permite al usuario fotografiar una lista de compra escrita a mano o un ticket de supermercado para extraer automáticamente los productos mediante reconocimiento óptico de caracteres con Google Cloud Vision API en backend.

#### Visor de cámara

Pantalla completa en modo oscuro para maximizar el contraste con el documento a fotografiar. Un marco verde con esquinas redondeadas guía al usuario para encuadrar correctamente el documento. Una línea de escaneo animada proporciona feedback visual de que el sistema está listo para procesar. El texto de ayuda en la parte inferior indica la acción esperada.

#### Controles

- **Flash:** activa/desactiva el flash del dispositivo para condiciones de poca luz.
- **Disparador:** botón central grande que captura la imagen y la envía al endpoint `POST /api/v1/ocr/scan/` como `multipart/form-data`. Mientras el servidor procesa, se muestra un indicador de carga.
- **Galería:** alternativa al visor en vivo; permite seleccionar una imagen ya capturada desde la galería del dispositivo.

#### Barra de progreso del wizard

Indicador de tres pasos en la parte superior (Captura → Revisar → Confirmar) que muestra el paso actual activo en verde y los siguientes en gris. Implementado como componente `WizardSteps` reutilizable.

#### Módulo Django

`apps.ocr` — endpoint `POST /api/v1/ocr/scan/` que procesa la imagen en backend, invoca Google Cloud Vision API y devuelve los ítems reconocidos. El modelo por sesiones queda como evolución futura, no como implementación vigente.

#### Requisitos cubiertos

`RF-028` Procesar imagen con OCR · `HU-016` Capturar lista por cámara

---

### 09 — OCR: Paso 2 / Revisión

![Mockup pantalla OCR Revisión](assets/09-ocr-revision.png)

#### Descripción

Segunda pantalla del wizard OCR. Muestra los productos reconocidos por Google Cloud Vision API, agrupados por nivel de confianza, para que el usuario pueda validar, corregir y eliminar resultados antes de confirmar la incorporación a su lista.

#### Grupos de confianza

**Alta confianza (badge verde):** Productos con un porcentaje de coincidencia superior al 70% en el catálogo normalizado mediante el algoritmo de distancia de Levenshtein (`thefuzz`). Se muestran con el nombre reconocido, la marca y tienda de referencia identificada. El usuario puede eliminarlos con el botón ✕.

**Requiere revisión (badge rojo/naranja):** Productos con confianza inferior al 70%. Se muestran con el texto reconocido literalmente (con posibles errores OCR) y la sugerencia de corrección entre paréntesis. El fondo del ítem cambia a naranja pálido para destacarlos visualmente. Tocar el ítem abre un editor inline para corregir el nombre manualmente.

#### Barra de resumen

Fija en la parte superior del listado. Informa del total de productos detectados y el desglose por nivel de confianza, junto con el porcentaje global de precisión OCR de la sesión.

#### Acciones de pie

- **"+ Añadir":** abre el buscador del catálogo para añadir manualmente productos no detectados.
- **"Continuar → (N)":** avanza al Paso 3 (Confirmar) con el número de productos validados. Solo activo si hay al menos un producto seleccionado.

#### Módulo Django

`apps.ocr` — el backend vigente devuelve resultados directamente desde `POST /api/v1/ocr/scan/`. La persistencia de sesión y endpoints de corrección quedan documentados como evolución futura del flujo OCR.

#### Requisitos cubiertos

`RF-028` Revisar resultados OCR · `RF-029` Corregir productos reconocidos · `HU-016` Capturar lista por cámara

---

### 10 — Asistente IA (LLM)

![Mockup pantalla Asistente IA](assets/10-asistente.png)

#### Descripción

Interfaz de chat conversacional impulsada por la API de Claude (Anthropic). El asistente está especializado exclusivamente en consultas relacionadas con la compra, el ahorro, productos, precios, tiendas y recetas (RN-007). Las consultas fuera de este ámbito son rechazadas con un mensaje informativo y amable.

#### Estructura del chat

La interfaz sigue el patrón estándar de mensajería: burbujas de usuario alineadas a la derecha (fondo verde corporativo) y burbujas del asistente alineadas a la izquierda (fondo blanco con borde). El asistente se identifica con el avatar "B" y el label "BARGAIN IA" en cada respuesta para reforzar la identidad de marca.

#### Respuestas estructuradas

Cuando el asistente devuelve datos de comparación de precios, los presenta en una tarjeta embebida dentro de la burbuja de respuesta. Esta tarjeta muestra una tabla de tiendas con sus precios, ordenada de menor a mayor, con una marca visual (✓) en la opción más económica. Esto evita que el usuario tenga que interpretar texto plano con datos numéricos.

#### Chips de sugerencias

Fila horizontal scrollable encima del campo de entrada con consultas predefinidas frecuentes: ver ahorro semanal potencial, lanzar el optimizador directamente, configurar alertas de bajada de precio o pedir sugerencias de recetas con los productos de la lista. Facilitan el onboarding de usuarios nuevos.

#### Persistencia del historial

Cada conversación se almacena en el modelo `Conversation` con sus mensajes en `Message` (rol usuario/asistente + contenido). Esto permite al usuario recuperar conversaciones anteriores y al sistema mantener contexto entre sesiones para preguntas de seguimiento.

#### Módulo Django

`apps.assistant` — endpoint `POST /api/v1/assistant/messages/` que gestiona el historial de la conversación y llama a la API de Anthropic con el contexto del usuario (listas activas, precios recientes, ubicación).

#### Requisitos cubiertos

`RF-030` Consultar asistente · `RF-031` Obtener comparativas de precios vía LLM · `HU-017` Usar asistente de compra

---

## Resumen de cobertura de requisitos

| Pantalla | RF cubiertos | HU cubiertas | Módulo Django |
|---|---|---|---|
| 01 Login | RF-001, RF-002 | HU-001 | `apps.users` |
| 02 Registro | RF-001, RF-003 | HU-002 | `apps.users` |
| 03 Dashboard | RF-006, RF-015 | HU-008, HU-028 | `apps.users` + `apps.prices` |
| 04 Mi Lista | RF-020 a RF-023 | HU-010 | `apps.shopping_lists` |
| 05 Explorar | RF-011, RF-015 | HU-009 | `apps.stores` + `apps.prices` |
| 06 Optimizador | RF-024 a RF-026 | HU-013 | `apps.optimizer` |
| 07 Perfil | RF-003 a RF-005 | HU-005 | `apps.users` + `apps.shopping_lists` |
| 08 OCR Captura | RF-028 | HU-016 | `apps.ocr` |
| 09 OCR Revisión | RF-028, RF-029 | HU-016 | `apps.ocr` |
| 10 Asistente IA | RF-030, RF-031 | HU-017 | `apps.assistant` |

---

## Ficheros de este directorio

```
docs/diagramas/ui-mockups/
├── README.md              ← Este documento
├── index.html             ← Galería interactiva navegable (renderizable en GitHub Pages)
└── assets/
    ├── 01-login.png
    ├── 02-registro.png
    ├── 03-dashboard.png
    ├── 04-mi-lista.png
    ├── 05-explorar.png
    ├── 06-optimizador.png
    ├── 07-perfil.png
    ├── 08-ocr-captura.png
    ├── 09-ocr-revision.png
    └── 10-asistente.png
```

---

*Este documento forma parte de la Fase 1 — Análisis y Diseño del TFG BargAIn (ETSII, Universidad de Sevilla). La implementación de los componentes aquí descritos corresponde a la Fase 4 — Desarrollo Frontend (S8–S16).*
