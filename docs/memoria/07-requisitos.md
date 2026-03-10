# 7. Análisis de Requisitos

## 7.1 Especificación de Actores del Sistema

La correcta definición de los actores que intervienen en AURA es fundamental para garantizar la adecuación de permisos, interfaces y flujos de trabajo a las necesidades reales de cada tipo de usuario. El sistema cuenta con cuatro actores principales, diferenciados por las funcionalidades que pueden desempeñar:

**Consumidor.** Usuario principal de la aplicación. Puede crear y gestionar listas de la compra, comparar precios entre tiendas, solicitar la optimización de su ruta de compra, capturar listas o tickets mediante la cámara del dispositivo, e interactuar con el asistente conversacional. Además, puede configurar sus preferencias de optimización (pesos de precio, distancia y tiempo), gestionar su perfil y recibir notificaciones sobre variaciones de precios o promociones.

**Comercio / PYME.** Representa al pequeño comercio local que desea posicionar sus productos en la plataforma. Puede registrar su perfil de negocio, actualizar manualmente sus precios y crear promociones con fecha de vigencia. Accede a un panel de estadísticas básicas sobre la visibilidad de sus productos. Este actor es clave para el modelo de negocio B2B de la aplicación.

**Administrador de plataforma.** Usuario con privilegios globales que gestiona el correcto funcionamiento del sistema. Puede dar de alta cadenas y tiendas, moderar contenido de crowdsourcing, gestionar usuarios, supervisar el estado de los spiders de scraping y acceder a métricas agregadas de uso de la plataforma.

**Sistema (Scraper).** Actor automatizado que ejecuta periódicamente los spiders de web scraping para obtener precios actualizados de las principales cadenas de supermercados. Opera de forma no interactiva mediante tareas programadas de Celery y alimenta el módulo de precios.

---

## 7.2 Requisitos de Información

### RI-001 Información de usuarios

El sistema debe gestionar y almacenar de forma segura la información relativa a los diferentes perfiles de usuario. Para cada usuario se registrará: nombre de usuario único, correo electrónico (utilizado como identificador de login), contraseña encriptada, nombre y apellidos, teléfono de contacto (opcional), avatar (opcional), rol en el sistema (consumidor, comercio o administrador), ubicación por defecto (campo geoespacial PostGIS PointField con SRID 4326), radio máximo de búsqueda en kilómetros (por defecto 10), número máximo de paradas por ruta (por defecto 3), preferencia de optimización (precio, distancia, tiempo o equilibrado), preferencias de notificaciones (push y email), fecha de registro y fecha de última actualización.

### RI-002 Información de productos

El sistema debe mantener un catálogo normalizado de productos. Para cada producto se almacenará: nombre comercial, nombre normalizado (para búsquedas y matching), código de barras EAN-13 (opcional), categoría a la que pertenece, marca, unidad de medida (kg, litro, unidad, etc.), cantidad por unidad, URL de imagen (opcional), estado activo/inactivo, y las fechas de creación y actualización.

### RI-003 Información de categorías

El sistema debe organizar los productos en una jerarquía de categorías. Cada categoría tendrá: nombre, descripción (opcional), categoría padre (para subcategorías), icono o imagen representativa (opcional) y orden de visualización.

### RI-004 Información de marcas

El sistema debe registrar las marcas comerciales de los productos. Para cada marca se almacenará: nombre, logotipo (opcional) y si se trata de una marca blanca asociada a una cadena concreta.

### RI-005 Información de cadenas comerciales

El sistema debe mantener un registro de las cadenas de supermercados y comercios. Para cada cadena se almacenará: nombre, logotipo, URL del sitio web, indicador de si dispone de API oficial de precios, color corporativo (para la interfaz) y estado activo/inactivo.

### RI-006 Información de tiendas

El sistema debe gestionar la información de cada establecimiento físico con geolocalización. Para cada tienda se registrará: nombre del establecimiento, cadena a la que pertenece (si aplica), dirección postal completa, ubicación geoespacial (PostGIS PointField con SRID 4326 e índice GiST), horario de apertura (formato JSON con días y franjas), teléfono de contacto (opcional), indicador de si es un comercio local (no pertenece a una cadena), nivel de suscripción para PYMEs (gratuito, básico o premium), y estado activo/inactivo.

### RI-007 Información de precios

El sistema debe almacenar los precios actuales de cada producto en cada tienda, junto con su histórico. Para cada precio se registrará: producto asociado, tienda asociada, precio actual en euros, precio por unidad de medida, precio de oferta (si aplica), fecha de fin de la oferta (si aplica), fuente del dato (scraping, crowdsourcing o API oficial), fecha de verificación, fecha de creación (para el histórico) y estado de verificación. El sistema mantendrá automáticamente un histórico temporal de variaciones de precio.

### RI-008 Información de listas de la compra

El sistema debe permitir la gestión de listas de la compra por usuario. Para cada lista se almacenará: usuario propietario, nombre de la lista, estado (activa, completada o archivada), fecha de creación y fecha de última actualización. Cada ítem de la lista contendrá: producto asociado, cantidad deseada, indicador de comprado/pendiente y notas opcionales.

### RI-009 Información de resultados de optimización

El sistema debe registrar los resultados del algoritmo de optimización de rutas. Para cada resultado se almacenará: lista de la compra asociada, ubicación del usuario en el momento de la consulta (PointField), radio máximo de búsqueda utilizado, modo de optimización seleccionado (precio, tiempo o equilibrado), pesos configurados para cada variable, precio total estimado, distancia total en kilómetros, tiempo estimado en minutos, datos de la ruta (JSON con la secuencia de paradas, productos por parada y precios), ahorro estimado respecto a la compra en un solo supermercado, y fecha de generación. Cada parada de la ruta contendrá: tienda, orden en la ruta, productos a comprar, subtotal en esa tienda y distancia desde la parada anterior.

### RI-010 Información de perfiles de negocio

El sistema debe gestionar los perfiles de los comercios adheridos al portal Business. Para cada perfil se almacenará: usuario asociado, nombre comercial, NIF/CIF, descripción del negocio, dirección, tienda asociada en el sistema, nivel de suscripción (gratuito, básico o premium), fecha de alta y estado (activo, pendiente de verificación o suspendido). Adicionalmente, cada promoción creada por un comercio tendrá: producto, porcentaje o importe de descuento, fecha de inicio, fecha de fin, descripción y estado.

### RI-011 Información de sesiones OCR

El sistema debe registrar las sesiones de procesamiento de imágenes por OCR. Para cada sesión se almacenará: usuario que realizó la captura, imagen original subida, texto extraído por el OCR, lista de productos reconocidos con su nivel de confianza de matching, lista de la compra generada (si el usuario confirma), estado de la sesión (procesando, completada o fallida), y las fechas de creación y finalización.

### RI-012 Información de conversaciones con el asistente

El sistema debe almacenar las conversaciones entre los usuarios y el asistente LLM. Para cada conversación se registrará: usuario asociado, título (generado automáticamente), fecha de creación, fecha del último mensaje y estado (activa o archivada). Cada mensaje contendrá: rol (usuario o asistente), contenido textual, tokens consumidos, y fecha de envío.

---

## 7.3 Requisitos Funcionales

### Autenticación y Gestión de Usuarios

**RF-001 Registro de usuario.** El sistema debe permitir el registro de nuevos usuarios mediante correo electrónico y contraseña, validando que el email no esté ya registrado, que la contraseña cumpla los requisitos de seguridad (mínimo 8 caracteres, al menos una mayúscula y un número) y que se acepten los términos de uso.

**RF-002 Inicio de sesión.** El sistema debe autenticar a los usuarios mediante correo y contraseña, devolviendo un par de tokens JWT (acceso y refresco). El token de acceso tendrá una validez de 60 minutos y el de refresco de 7 días, con rotación automática.

**RF-003 Gestión de perfil.** El sistema debe permitir al usuario consultar y modificar sus datos personales: nombre, apellidos, teléfono, avatar, ubicación por defecto y preferencias de notificaciones.

**RF-004 Configuración de preferencias de optimización.** El sistema debe permitir al usuario configurar sus preferencias para el algoritmo de optimización: pesos relativos de precio, distancia y tiempo (sumando 100%), radio máximo de búsqueda (1–25 km) y número máximo de paradas (1–4).

**RF-005 Recuperación de contraseña.** El sistema debe permitir al usuario solicitar un restablecimiento de contraseña mediante un enlace enviado por correo electrónico con una validez de 24 horas.

### Catálogo de Productos

**RF-006 Consulta de productos.** El sistema debe permitir buscar y consultar productos del catálogo con filtros por nombre, categoría, marca y código de barras, con paginación y ordenación.

**RF-007 Detalle de producto.** El sistema debe mostrar la información completa de un producto, incluyendo nombre, marca, categoría, imagen, unidad de medida y el rango de precios actual en las tiendas cercanas al usuario.

**RF-008 Búsqueda por texto con autocompletado.** El sistema debe ofrecer una búsqueda con sugerencias en tiempo real que proponga productos a medida que el usuario escribe, utilizando matching fuzzy contra el nombre normalizado.

**RF-009 Gestión de categorías.** El sistema debe organizar los productos en una jerarquía de categorías navegable, permitiendo la exploración por árbol de categorías.

**RF-010 Alta de producto por crowdsourcing.** El sistema debe permitir a los usuarios proponer la adición de un producto que no exista en el catálogo, sujeto a validación por el administrador.

### Tiendas y Geolocalización

**RF-011 Búsqueda de tiendas por proximidad.** El sistema debe listar las tiendas en un radio configurable respecto a la ubicación del usuario o una dirección introducida manualmente, ordenadas por distancia y con indicación del número de productos disponibles de su lista.

**RF-012 Detalle de tienda.** El sistema debe mostrar la información completa de una tienda: nombre, cadena, dirección, horario, distancia al usuario, y los precios de los productos que el usuario tiene en su lista activa.

**RF-013 Visualización en mapa.** El sistema debe mostrar las tiendas cercanas en un mapa interactivo, diferenciando visualmente las cadenas y los comercios locales, y permitiendo la selección de una tienda para ver su detalle.

**RF-014 Tiendas favoritas.** El sistema debe permitir al usuario marcar tiendas como favoritas para acceder rápidamente a ellas y recibir notificaciones de ofertas.

### Precios

**RF-015 Comparación de precios por producto.** El sistema debe mostrar, para un producto dado, los precios en todas las tiendas del radio del usuario, ordenados de menor a mayor, indicando la fuente del dato (scraping, crowdsourcing o API) y su antigüedad.

**RF-016 Comparación de cesta completa.** El sistema debe calcular el coste total de una lista de la compra en cada tienda individual del radio, permitiendo al usuario ver en qué supermercado sería más barata la cesta completa sin fraccionarla.

**RF-017 Histórico de precios.** El sistema debe permitir consultar la evolución del precio de un producto en una tienda concreta, presentando los datos en forma de gráfico temporal.

**RF-018 Alerta de precio.** El sistema debe permitir al usuario definir un precio objetivo para un producto; cuando alguna tienda alcance ese precio, el sistema enviará una notificación.

**RF-019 Aportación de precios por crowdsourcing.** El sistema debe permitir a los usuarios reportar el precio de un producto en una tienda, registrando la fuente como crowdsourcing con una caducidad de 24 horas.

### Listas de la Compra

**RF-020 Gestión de listas de la compra.** El sistema debe permitir al usuario crear, consultar, editar, archivar y eliminar listas de la compra, con un máximo de 20 listas activas simultáneamente.

**RF-021 Gestión de ítems de lista.** El sistema debe permitir añadir productos a una lista (con buscador y autocompletado), modificar cantidades, marcar como comprados y eliminar ítems.

**RF-022 Compartir lista.** El sistema debe permitir compartir una lista de la compra con otro usuario registrado mediante enlace o correo electrónico, de modo que ambos puedan editar los ítems.

**RF-023 Plantillas de lista.** El sistema debe permitir guardar una lista como plantilla reutilizable y crear nuevas listas a partir de plantillas existentes.

### Optimizador de Ruta

**RF-024 Optimización multicriterio de ruta.** El sistema debe calcular, dada una lista de la compra y la ubicación del usuario, la combinación óptima de tiendas (máximo de paradas configurado) que minimiza la función de coste ponderada: `Score = w_precio × ahorro_normalizado - w_distancia × distancia_extra_normalizada - w_tiempo × tiempo_extra_normalizado`. El resultado debe incluir las top-3 rutas ordenadas por score.

**RF-025 Visualización de ruta en mapa.** El sistema debe representar la ruta optimizada sobre un mapa interactivo, mostrando el recorrido entre paradas, las tiendas seleccionadas, los productos a comprar en cada parada y el ahorro desglosado.

**RF-026 Desglose de ahorro.** El sistema debe mostrar, para cada ruta propuesta: el precio total, la distancia total, el tiempo estimado, el ahorro respecto a la compra en un solo supermercado (en euros y porcentaje), y el coste estimado de desplazamiento (combustible/transporte).

**RF-027 Recálculo bajo demanda.** El sistema debe permitir al usuario recalcular la ruta si descarta una tienda, cambia su ubicación, o modifica los pesos de optimización, obteniendo un nuevo resultado en menos de 5 segundos.

### Visión Artificial (OCR)

**RF-028 Captura y procesamiento de imagen.** El sistema debe permitir al usuario capturar una fotografía de una lista de la compra escrita a mano o de un ticket anterior mediante la cámara del dispositivo o la galería, y procesarla con OCR para extraer texto.

**RF-029 Reconocimiento y matching de productos.** El sistema debe aplicar matching fuzzy del texto extraído contra el catálogo de productos, presentando al usuario una lista de productos reconocidos con su nivel de confianza, permitiendo confirmar, corregir o descartar cada ítem antes de añadirlos a una lista de la compra.

### Asistente Conversacional (LLM)

**RF-030 Consulta en lenguaje natural.** El sistema debe permitir al usuario realizar consultas complejas sobre su compra en lenguaje natural a través de una interfaz de chat (por ejemplo: "¿Dónde compro los ingredientes para una paella para 10 personas al mejor precio cerca de mi casa?"), devolviendo respuestas contextualizadas con datos reales de precios y tiendas.

**RF-031 Sugerencias de ahorro.** El asistente debe ser capaz de proponer estrategias de ahorro basadas en el historial de compras del usuario, tendencias de precios y promociones activas, limitándose exclusivamente a consultas relacionadas con la compra.

### Portal Business (PYMES)

**RF-032 Registro de perfil de negocio.** El sistema debe permitir a un comercio local registrarse como PYME, proporcionando datos fiscales (NIF/CIF), descripción del negocio, dirección y vinculación con una tienda existente o nueva en el sistema, sujeto a verificación por el administrador.

**RF-033 Gestión de precios por el comercio.** El sistema debe permitir al comercio actualizar manualmente los precios de sus productos en cualquier momento, registrando la fuente como "comercio verificado" sin caducidad automática (a diferencia del crowdsourcing).

**RF-034 Gestión de promociones.** El sistema debe permitir al comercio crear, editar y desactivar promociones vinculadas a sus productos, con fecha de inicio y fin, descripción y descuento aplicable.

### Notificaciones

**RF-035 Sistema de notificaciones.** El sistema debe enviar notificaciones push y/o por correo electrónico según las preferencias del usuario, cubriendo los siguientes eventos: alerta de precio alcanzado (véase RF-018), nuevas promociones en tiendas favoritas, cambios en listas compartidas, resultados de procesamiento OCR, y avisos del sistema.

---

## 7.4 Requisitos No Funcionales

**RNF-001 Rendimiento.** El tiempo de respuesta de la API debe ser inferior a 500 ms en el percentil 95 para operaciones CRUD estándar, e inferior a 5 segundos para el cálculo de rutas optimizadas con hasta 100 productos y 30 tiendas candidatas.

**RNF-002 Disponibilidad.** El sistema en entorno de staging debe mantener una disponibilidad mínima del 99% mensual, excluyendo ventanas de mantenimiento planificadas.

**RNF-003 Seguridad.** Toda comunicación debe realizarse sobre HTTPS. La autenticación se implementará mediante JWT con rotación de tokens. Se aplicará rate limiting en los endpoints públicos (100 peticiones/hora para usuarios anónimos, 1000 para autenticados). Las contraseñas se almacenarán con hashing seguro (Argon2 o PBKDF2). Los datos sensibles de ubicación se encriptarán en reposo.

**RNF-004 Usabilidad.** La aplicación móvil debe ser intuitiva y accesible, cumpliendo las directrices WCAG 2.1 nivel AA. El diseño debe ser responsive, adaptándose a móviles (iOS 15+ y Android 10+), tablets y escritorio. Las acciones principales (crear lista, comparar precios, optimizar ruta) deben requerir un máximo de 3 toques desde la pantalla principal.

**RNF-005 Escalabilidad.** La arquitectura debe soportar un crecimiento hasta 10.000 usuarios concurrentes sin degradación significativa del rendimiento, mediante la separación de tareas pesadas (scraping, OCR, optimización) en workers Celery independientes.

**RNF-006 Mantenibilidad.** El código backend debe mantener una cobertura de tests unitarios e integración no inferior al 80%. Se seguirán las convenciones PEP 8 (Python) y ESLint/Prettier (TypeScript), verificadas automáticamente en el pipeline de CI.

**RNF-007 Compatibilidad.** La aplicación móvil debe funcionar en iOS 15 o superior y Android 10 (API 29) o superior. El portal web debe ser compatible con las dos últimas versiones de Chrome, Firefox, Safari y Edge.

**RNF-008 Protección de datos (RGPD).** El sistema debe cumplir el Reglamento General de Protección de Datos de la UE, implementando: consentimiento explícito para el uso de datos de ubicación, derecho al olvido (eliminación completa de datos personales), minimización de datos (solo recopilar los estrictamente necesarios), y registro de actividades de tratamiento.

---

## 7.5 Historias de Usuario

### Autenticación y Perfil

**HU-001.** Como consumidor, quiero registrarme con mi correo electrónico y una contraseña, para poder acceder a todas las funcionalidades de la aplicación.
*Criterios de aceptación:* Validación de email único; contraseña con 8+ caracteres, mayúscula y número; email de confirmación enviado; login automático tras registro.

**HU-002.** Como consumidor, quiero iniciar sesión con mi correo y contraseña, para acceder a mis listas y preferencias desde cualquier dispositivo.
*Criterios de aceptación:* Token JWT devuelto; sesión persistente 7 días con refresh; mensaje de error claro si credenciales incorrectas.

**HU-003.** Como consumidor, quiero configurar mi ubicación habitual y mis preferencias de optimización, para que las búsquedas y rutas se personalicen automáticamente.
*Criterios de aceptación:* Ubicación seleccionable en mapa o por dirección; sliders para pesos precio/distancia/tiempo; radio configurable de 1 a 25 km.

### Listas de la Compra

**HU-004.** Como consumidor, quiero crear una lista de la compra y añadir productos buscándolos por nombre, para organizar mis compras de la semana.
*Criterios de aceptación:* Autocompletado en buscador; añadir con cantidad; máximo 20 listas activas; productos agrupados por categoría.

**HU-005.** Como consumidor, quiero marcar productos como comprados mientras estoy en la tienda, para hacer seguimiento de lo que me falta.
*Criterios de aceptación:* Toggle de un toque; visual diferenciado para comprados; contador de pendientes visible.

**HU-006.** Como consumidor, quiero compartir mi lista con otro usuario, para que podamos editar la misma lista y dividir las compras.
*Criterios de aceptación:* Compartir por email o enlace; ambos pueden editar; cambios reflejados en tiempo real.

**HU-007.** Como consumidor, quiero guardar una lista como plantilla, para poder reutilizarla en futuras compras semanales.
*Criterios de aceptación:* Opción "Guardar como plantilla"; crear nueva lista desde plantilla; plantillas editables.

### Comparación de Precios

**HU-008.** Como consumidor, quiero ver los precios de un producto en todas las tiendas cercanas, para saber dónde es más barato.
*Criterios de aceptación:* Lista ordenada por precio; indicador de fuente y antigüedad del dato; distancia a cada tienda.

**HU-009.** Como consumidor, quiero ver cuánto costaría mi lista completa en cada supermercado, para decidir si me compensa ir a uno solo.
*Criterios de aceptación:* Tabla con total por tienda; indicador de productos no disponibles; diferencia con el más barato.

**HU-010.** Como consumidor, quiero consultar cómo ha variado el precio de un producto en el último mes, para detectar tendencias y comprar en el momento óptimo.
*Criterios de aceptación:* Gráfico temporal interactivo; datos de al menos 30 días; indicador de tendencia (subiendo/bajando/estable).

**HU-011.** Como consumidor, quiero recibir una notificación cuando un producto alcance un precio que yo defina, para no perder la oferta.
*Criterios de aceptación:* Definir precio objetivo por producto; notificación push y/o email; indicación de tienda y precio actual.

### Optimización de Ruta

**HU-012.** Como consumidor, quiero que el sistema calcule la mejor ruta de compra para mi lista, combinando varias tiendas si es necesario, para ahorrar dinero sin perder demasiado tiempo.
*Criterios de aceptación:* Top-3 rutas propuestas; máximo de paradas respetado; cálculo en menos de 5 segundos.

**HU-013.** Como consumidor, quiero ver la ruta optimizada en un mapa con el recorrido y las paradas marcadas, para saber exactamente a dónde ir.
*Criterios de aceptación:* Mapa interactivo con polylines; marcadores por tienda; secuencia de paradas numerada.

**HU-014.** Como consumidor, quiero ver el desglose de qué comprar en cada tienda y cuánto ahorro respecto a ir a un solo sitio, para decidir si me compensa.
*Criterios de aceptación:* Lista de productos por parada; subtotal por tienda; ahorro total en € y %; coste estimado de desplazamiento.

**HU-015.** Como consumidor, quiero poder ajustar mis prioridades (más ahorro vs. menos desplazamiento) y que la ruta se recalcule, para adaptarla a mi día.
*Criterios de aceptación:* Sliders interactivos; recálculo en tiempo real; nueva ruta reflejada en el mapa.

### Visión Artificial (OCR)

**HU-016.** Como consumidor, quiero hacer una foto de mi lista escrita a mano y que la app reconozca los productos, para no tener que teclearlos uno a uno.
*Criterios de aceptación:* Captura desde cámara o galería; procesamiento en menos de 10 segundos; lista editable de productos reconocidos.

**HU-017.** Como consumidor, quiero revisar y corregir los productos que el OCR ha reconocido antes de añadirlos a mi lista, para asegurar que son correctos.
*Criterios de aceptación:* Nivel de confianza visible por producto; sugerencias alternativas; opción de descartar; añadir a lista existente o nueva.

### Asistente Conversacional

**HU-018.** Como consumidor, quiero preguntarle al asistente dónde comprar los ingredientes de una receta al mejor precio, para planificar una comida especial sin gastar de más.
*Criterios de aceptación:* Respuesta con productos, precios y tiendas concretas; opción de generar lista directamente desde la respuesta.

**HU-019.** Como consumidor, quiero que el asistente me sugiera formas de ahorrar basándose en mis compras habituales, para optimizar mi presupuesto mensual.
*Criterios de aceptación:* Sugerencias basadas en historial; alternativas más baratas; promociones relevantes.

**HU-020.** Como consumidor, quiero acceder al historial de mis conversaciones con el asistente, para consultar recomendaciones anteriores.
*Criterios de aceptación:* Lista de conversaciones con fecha; búsqueda por contenido; posibilidad de continuar una conversación.

### Tiendas

**HU-021.** Como consumidor, quiero ver las tiendas cercanas en un mapa, diferenciando cadenas y comercios locales, para descubrir opciones que no conozco.
*Criterios de aceptación:* Mapa con marcadores diferenciados; filtro por cadena; indicación de horario y distancia.

**HU-022.** Como consumidor, quiero marcar tiendas como favoritas, para acceder rápidamente a sus precios y recibir alertas de ofertas.
*Criterios de aceptación:* Toggle de favorito; sección de favoritos en perfil; notificaciones de nuevas promociones.

### Portal Business

**HU-023.** Como comercio local, quiero registrar mi negocio en la plataforma, para que mis productos aparezcan en las búsquedas de los usuarios cercanos.
*Criterios de aceptación:* Formulario con datos fiscales; vinculación con tienda en mapa; estado "pendiente de verificación".

**HU-024.** Como comercio local, quiero actualizar los precios de mis productos en cualquier momento, para que los usuarios vean información actualizada.
*Criterios de aceptación:* Edición individual o masiva (CSV); efecto inmediato; sin caducidad automática.

**HU-025.** Como comercio local, quiero crear promociones con fecha de inicio y fin, para atraer clientes con ofertas temporales.
*Criterios de aceptación:* Crear promoción con descuento, fechas y descripción; visible para usuarios en el radio; desactivación automática al expirar.

**HU-026.** Como comercio local, quiero ver estadísticas de cuántos usuarios han visto mis productos, para evaluar la visibilidad de mi negocio.
*Criterios de aceptación:* Impresiones por producto; comparaciones donde apareció; clics a detalle de tienda.

### Crowdsourcing

**HU-027.** Como consumidor, quiero reportar el precio de un producto que he visto en una tienda, para ayudar a mantener los datos actualizados.
*Criterios de aceptación:* Formulario con producto, tienda y precio; validación de precio positivo; caducidad de 24 horas; badge de contribuidor.

### Notificaciones

**HU-028.** Como consumidor, quiero configurar qué tipo de notificaciones recibo y por qué canal (push o email), para no recibir avisos que no me interesan.
*Criterios de aceptación:* Toggles por tipo de notificación; elección de canal; aplicación inmediata.

### Administración

**HU-029.** Como administrador, quiero gestionar el catálogo de cadenas y tiendas, para mantener la base de datos actualizada.
*Criterios de aceptación:* CRUD de cadenas y tiendas; verificación de coordenadas en mapa; activar/desactivar.

**HU-030.** Como administrador, quiero supervisar el estado de los spiders de scraping, para detectar fallos y actuar rápidamente.
*Criterios de aceptación:* Dashboard con última ejecución por spider; indicador de éxito/fallo; número de precios actualizados; alertas automáticas ante fallos.

---

## 7.6 Reglas de Negocio

**RN-001 Radio máximo de búsqueda.** El radio de búsqueda de tiendas está limitado a un máximo de 25 km. El valor por defecto para nuevos usuarios es de 10 km. El usuario puede configurarlo entre 1 y 25 km.

**RN-002 Máximo de paradas por ruta.** El algoritmo de optimización generará rutas con un máximo de 4 paradas (sin contar el punto de partida del usuario). El valor por defecto es 3 paradas y el usuario puede configurarlo entre 1 y 4.

**RN-003 Caducidad de precios.** Los precios obtenidos por web scraping tienen una validez de 48 horas. Los precios reportados por crowdsourcing tienen una validez de 24 horas. Los precios introducidos por un comercio verificado no tienen caducidad automática. Los precios de API oficial se actualizan según la frecuencia de la API.

**RN-004 Prioridad de fuentes de precios.** Cuando existan múltiples precios para un mismo producto en una misma tienda, el sistema priorizará en este orden: (1) API oficial de la cadena, (2) Web scraping, (3) Comercio verificado, (4) Crowdsourcing. En caso de conflicto entre fuentes del mismo nivel, prevalecerá el dato más reciente.

**RN-005 Validación de precios.** El sistema rechazará automáticamente cualquier precio menor o igual a cero. Los precios que superen en más de un 200% el precio medio del producto en el sistema serán marcados como sospechosos y requerirán validación.

**RN-006 Límite de listas activas.** Un usuario no puede tener más de 20 listas de la compra en estado activo simultáneamente. Las listas completadas o archivadas no cuentan para este límite.

**RN-007 Restricción del asistente LLM.** El asistente conversacional solo responderá consultas relacionadas con la compra, el ahorro, productos, precios, tiendas y recetas. Las consultas fuera de este ámbito serán rechazadas con un mensaje informativo.

**RN-008 Verificación de comercios.** Un perfil de comercio/PYME debe ser verificado por un administrador antes de que sus precios y promociones sean visibles para los usuarios. La verificación incluye la validación del NIF/CIF proporcionado.

**RN-009 Respeto al robots.txt.** Los spiders de web scraping deben respetar las directivas del archivo robots.txt de cada sitio web. Las cadenas que prohíban explícitamente el scraping serán excluidas y se buscará una alternativa (API oficial o crowdsourcing).

**RN-010 Frecuencia de scraping.** La ejecución de los spiders de scraping se realizará con una frecuencia máxima de una vez cada 24 horas por cadena, con un delay mínimo de 2 segundos entre peticiones consecutivas, para minimizar el impacto en los servidores de destino.
