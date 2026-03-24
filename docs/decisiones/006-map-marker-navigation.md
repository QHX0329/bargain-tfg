# ADR-006: Navegación al perfil de tienda desde marcadores del mapa

**Fecha:** 2026-03-24
**Estado:** Aceptada
**Contexto:** UX del mapa de tiendas en MapScreen

## Problema

Los marcadores del mapa mostraban un Callout informativo (nombre, cadena, distancia, estado)
pero no ofrecían forma de navegar al perfil completo de la tienda. El botón "Ver perfil" solo
aparecía en el panel inferior tras seleccionar una tienda, lo cual no era descubrible.

## Decisión

Se añade `onCalloutPress` al componente `<Callout>` de cada marcador de tienda.
Al pulsar la burbuja informativa, se navega a `StoreProfile` con los parámetros necesarios:

```tsx
<Callout onPress={() => navigation.navigate("StoreProfile", {
  storeId: store.id,
  storeName: store.name,
  userLat,
  userLng,
})}>
```

Se añade un texto indicador "Pulsa para ver perfil" al final del Callout para
comunicar la affordance al usuario.

## Consecuencias

**Positivas:**
- Acceso directo al perfil desde el marcador — flujo natural de exploración.
- Compatible con iOS y Android (react-native-maps soporta `onCalloutPress` en ambos).
- El panel inferior sigue ofreciendo el acceso alternativo para tiendas seleccionadas.

**Consideraciones:**
- En iOS, `onCalloutPress` requiere un segundo toque después de abrir el Callout.
  Esto es comportamiento estándar de Apple Maps y Google Maps nativos.
