# 09. Manual de Usuario

## 9.1 Introducción

BarGAIN permite al usuario gestionar su compra diaria desde una app móvil/web, comparar precios,
consultar tiendas cercanas y configurar preferencias de optimización. Esta versión del manual
describe los flujos implementados hasta el estado del proyecto a fecha **2026-03-19**
(F4-27 completada).

## 9.2 Requisitos de uso

- Backend levantado en Docker (`make dev`).
- Base de datos migrada (`make migrate-docker`).
- Frontend Expo en host (`make frontend`).
- Cuenta de usuario registrada en el sistema.

## 9.3 Flujo de acceso

1. Abrir la app en Expo/Web.
2. Seleccionar "Iniciar sesión" o "Registrarse".
3. Introducir credenciales válidas.
4. Tras autenticación, se carga la navegación principal por pestañas.

Notas:
- El sistema usa JWT con refresh automático.
- Si el access token expira, la sesión se recupera sin intervención del usuario cuando el
	refresh token es válido.

## 9.4 Pantalla principal (Home)

Funciones disponibles:
- Resumen de listas y accesos directos.
- CTA para crear lista cuando el usuario no tiene listas activas.
- Buscador global para navegar a catálogo/funciones de compra.

## 9.5 Gestión de listas de compra

1. Crear lista con nombre personalizado.
2. Abrir detalle de lista para ver ítems.
3. Añadir productos desde catálogo o buscador.
4. Ajustar cantidades con controles rápidos `+/-`.
5. Marcar productos como comprados o eliminarlos.
6. Renombrar listas o convertirlas en plantilla.
7. Compartir lista con colaboradores por usuario.

## 9.6 Catálogo y detalle de producto

- Catálogo paginado con filtros plegables.
- Tarjetas con precio mínimo detectado.
- Acciones de añadido rápido a lista.
- Detalle de producto con comparación de precios por tienda.

## 9.7 Mapa de tiendas

- Visualización de tiendas cercanas sobre mapa.
- Panel de tiendas plegable (mejora UX F4-27).
- Apertura de perfil de tienda desde el mapa y desde favoritas.
- Gestión de favoritos.

## 9.8 Alertas y notificaciones

- Creación de alertas de precio por producto.
- Edición/eliminación de alertas existentes.
- Bandeja de notificaciones con borrado funcional.

## 9.9 Perfil y preferencias

El usuario puede:
- Editar datos básicos del perfil.
- Ajustar preferencias del optimizador (radio, pesos, modo).
- Configurar notificaciones.
- Cerrar sesión.

## 9.10 Módulo OCR y asistente

Estado actual:
- Existe interfaz de captura/revisión OCR en frontend (flujo UI).
- Existe interfaz de chat del asistente con historial local (flujo UI).
- La decisión aprobada para el OCR backend es migrar a Google Cloud Vision API, motivada por la
  falta de claridad de Tesseract en fotos reales. La alineación completa del código queda
  planificada en F5.

## 9.11 Portal Business (web)

Para cuentas PYME:
- Inicio de sesión en portal web.
- Gestión de precios.
- Gestión de promociones.
- Perfil de negocio.

## 9.12 Resolución de incidencias comunes

- Si el frontend no conecta con backend: verificar que backend expone `http://localhost:8000`.
- Si hay errores JWT: cerrar sesión e iniciar de nuevo para regenerar credenciales.
- Si no aparecen tiendas en mapa: comprobar permisos de ubicación o usar coordenadas válidas.

## 9.13 Estado de cobertura del manual

Este manual cubre el uso funcional implementado hasta F4-27. Los flujos de optimización
avanzada real, OCR productivo con Google Vision API y asistente con datos en vivo se
documentarán en la actualización final tras F5/F6.
