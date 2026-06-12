# Script de Demo Grabada — BarGAIN TFG

**Duración objetivo:** 3-4 minutos
**Herramienta de grabación:** OBS Studio (recomendado) o QuickTime (Mac)
**Formato de salida:** MP4 1080p, 30fps

## Configuración previa a la grabación

- [ ] Backend Render staging funcionando (`curl https://bargain-api.onrender.com/api/v1/health/`)
- [ ] iPhone con IPA instalada y conectado a red WiFi (para evitar datos móviles)
- [ ] App apuntando al staging de Render (`EXPO_PUBLIC_API_URL` configurada)
- [ ] Web companion en localhost:5173 apuntando a staging (`VITE_API_URL`)
- [ ] Usuario demo pre-creado: `demo@bargain.local` con lista de compra preparada
- [ ] PYME demo pre-creada y aprobada para el flujo Business Portal
- [ ] OBS listo para capturar pantalla iPhone (Quicktime + iPhone USB) + ventana Chrome
- [ ] Re-sideload del IPA si el certificado ha expirado (caducidad 7 días con Apple ID gratuito)

---

## Escena 1: App móvil — Autenticación y lista (0:00 - 0:45)

**Pantalla:** iPhone (captura via Quicktime o grabación directa)

**Acciones:**
1. Abrir la app BarGAIN en iPhone
2. Mostrar pantalla de login (3 segundos)
3. Hacer login con `demo@bargain.local`
4. Navegar a "Mis Listas"
5. Abrir lista pre-creada "Lista de la semana" con 6-8 productos
   (leche, pan, manzanas, detergente, pasta, arroz)

**Narración sugerida:**
"El usuario accede a la app y ve sus listas de la compra. Aquí tenemos una lista con
varios productos de uso cotidiano."

---

## Escena 2: App móvil — OCR ticket (0:45 - 1:30)

**Pantalla:** iPhone

**Acciones:**
1. Pulsar el botón de añadir via OCR (icono cámara)
2. Apuntar la cámara a un ticket impreso de prueba
   (preparar ticket con 3-4 productos claramente impresos)
3. Mostrar el resultado del OCR: productos reconocidos con nivel de confianza
4. Confirmar añadir los productos a la lista
5. Ver la lista actualizada con los nuevos productos

**Narración sugerida:**
"Para añadir productos de un ticket de compra existente, el usuario hace una foto.
Google Vision API extrae el texto y el sistema identifica los productos automáticamente
mediante fuzzy matching contra el catálogo."

---

## Escena 3: App móvil — Optimización de ruta (1:30 - 2:30)

**Pantalla:** iPhone

**Acciones:**
1. Pulsar "Optimizar" en la lista de la compra
2. Mostrar el modal de configuración (modo: "equilibrado", radio: 5km)
3. Pulsar "Calcular ruta óptima"
4. Mostrar pantalla de carga (~3-5 segundos con ORS y OR-Tools procesando)
5. Mostrar el resultado: 3 opciones de ruta con precio total, distancia y tiempo
6. Seleccionar la opción 1 (mejor score)
7. Ver la ruta en el mapa con las paradas marcadas
8. Hacer zoom en el mapa para ver las tiendas con sus respectivos productos asignados

**Narración sugerida:**
"El algoritmo evalúa combinaciones de tiendas en un radio de 5 km. Usando OR-Tools para
el ruteo vehicular y OpenRouteService para calcular distancias reales de conducción,
genera las 3 mejores rutas ordenadas por la función de puntuación multicriterio."

---

## Escena 4: App móvil — Asistente LLM (2:30 - 3:00)

**Pantalla:** iPhone

**Acciones:**
1. Navegar a la pestaña "Asistente"
2. Escribir: "¿Cuánto debería gastar en leche entera de 1L?"
3. Mostrar la respuesta del asistente Gemini con sugerencias de precio
4. Escribir una consulta fuera de dominio: "¿Qué tiempo hace hoy?"
5. Mostrar el rechazo del guardrail: "Solo respondo consultas sobre compras domésticas"

**Narración sugerida:**
"El asistente usa Gemini 2.0 Flash con guardrails de dominio. Solo responde
preguntas relacionadas con la compra, rechazando consultas fuera de su ámbito."

---

## Escena 5: Web companion — Portal Business (3:00 - 3:45)

**Pantalla:** Chrome en localhost:5173 (web companion)

**Acciones:**
1. Login como PYME demo (`fruteria@bargain.local`)
2. Mostrar el Dashboard con estadísticas de precios
3. Ir a "Mis Precios" y editar el precio de una manzana
4. Guardar cambio y ver la confirmación
5. (Opcional) Mostrar la página de Promociones activas

**Narración sugerida:**
"Las PYMEs gestionan sus precios a través del portal web. Los cambios pasan por un
flujo de aprobación del administrador antes de ser visibles al usuario final."

---

## Checklist post-grabación

- [ ] Revisar que el audio es claro (si hay narración)
- [ ] Recortar silencios largos (>3 segundos)
- [ ] Añadir subtítulos si es vídeo sin narración
- [ ] Exportar a MP4, resolución 1080p
- [ ] Duración final: entre 3 min 30 s y 4 min
- [ ] Nombrar: `BarGAIN-demo-defensa.mp4`

---

## Herramienta de grabación recomendada

**OBS Studio** (gratuito, Windows/Mac/Linux):
- Añadir source: "Video Capture Device" (iPhone via Quicktime) + "Window Capture" (Chrome)
- Configurar resolución 1920×1080, bitrate 4000 kbps
- Grabar en MKV, convertir a MP4 al terminar

**Alternativa para iPhone directo:**
- iPhone → Configuración → Centro de Control → Añadir "Grabación de pantalla"
- Grabar el flujo móvil directamente en el iPhone
- Transferir via AirDrop o Cable USB
- Unir clips en iMovie o DaVinci Resolve (gratuito)

---

## Datos demo pre-cargados necesarios

| Entidad | Valor | Notas |
|---------|-------|-------|
| Usuario consumer | `demo@bargain.local` / `Demo1234!` | Con lista pre-creada |
| Lista de compra | "Lista de la semana" | 6-8 productos |
| Usuario PYME | `fruteria@bargain.local` / `Demo1234!` | Ya aprobada por admin |
| Tienda PYME | "Frutería El Vergel" | Con 3 productos y precios |
| Ticket OCR | `tests/fixtures/ticket-demo.jpg` | Ticket impreso legible |

Crear estos datos con el comando: `make seed-docker` o manualmente desde el admin Django.
