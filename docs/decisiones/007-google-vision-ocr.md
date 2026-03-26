# ADR-007: Migración del OCR a Google Cloud Vision API

## Estado
Aceptado

## Contexto
El proyecto incorporó inicialmente un enfoque OCR basado en Tesseract por su coste cero y su
facilidad de integración local. Sin embargo, las pruebas con fotos reales de listas de compra y
tickets han mostrado una limitación práctica relevante: Tesseract no reconoce con suficiente
claridad textos con iluminación irregular, contraste pobre, deformación del papel o tipografías
de ticket degradadas.

BarGAIN necesita un OCR más robusto para:

- fotografías de tickets de supermercado,
- listas manuscritas o semiestructuradas,
- un flujo móvil donde la calidad de captura es variable,
- un backend que ya opera con integraciones externas controladas.

## Decisión
Se adopta **Google Cloud Vision API** como proveedor OCR backend para BargAIn.

La decisión afecta a la documentación y al diseño objetivo de F5/F6. El repositorio todavía
contiene implementación basada en Tesseract; esa base queda considerada **legado en migración**
hasta que el código se alinee con esta ADR.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes |
| --- | --- | --- |
| Tesseract | Sin coste de licenciamiento, ejecución local, sin dependencia de red | Precisión insuficiente en fotos reales, requiere más preprocesado, peor robustez en tickets degradados |
| Google Cloud Vision API | Mejor robustez en tickets y fotos móviles, menor dependencia de ajustes manuales, integración REST directa | Coste por uso, latencia de red, dependencia externa, gestión de cuotas |
| AWS Textract | Buen rendimiento en documentos estructurados | Mayor sobrecoste y complejidad para el alcance actual del proyecto |

## Justificación

- **Precisión práctica**: el motivo principal del cambio es que Tesseract no reconoce los textos
  con la claridad necesaria en el caso de uso real del proyecto.
- **Menor fragilidad del pipeline**: Vision reduce la dependencia de cadenas de preprocesado muy
  agresivas para obtener un resultado aceptable.
- **Mejor ajuste al producto**: el valor para el usuario depende de reducir correcciones manuales
  tras fotografiar tickets o listas.
- **Consistencia arquitectónica**: el proyecto ya acepta dependencias externas controladas
  (Claude API, Google Maps/Places), por lo que introducir Vision no rompe el modelo operativo.

## Consecuencias

- El OCR queda documentado como **procesamiento backend** con Google Cloud Vision API.
- Se mantiene el **matching fuzzy** contra catálogo y la **revisión manual** en frontend, porque
  el OCR sigue siendo probabilístico.
- Debe documentarse una variable de entorno dedicada:
  `GOOGLE_CLOUD_VISION_API_KEY`.
- Se acepta un tradeoff explícito:
  - mayor precisión esperada,
  - a cambio de coste, cuota, latencia y dependencia del proveedor.
- La documentación que describa el estado actual implementado debe indicar que la migración está
  aprobada, pero aún pendiente de alinear completamente con el código legado basado en Tesseract.
