# ADR 002: Modelo de Desarrollo Híbrido (Docker + Nativo)

## Fecha: 2026-03-11

## Estado: Aceptado

## Contexto
Durante la fase inicial de desarrollo, se intentó ejecutar todo el stack (Backend Django y Frontend Expo) dentro de contenedores Docker. Sin embargo, en entornos Windows con Docker Desktop, se observaron problemas críticos de sincronización de volúmenes que impedían que el bundler Metro (dentro del contenedor) detectara los cambios realizados en el host en tiempo real. Esto resultaba en una experiencia de desarrollo lenta y errores de resolución de módulos.

## Decisión
Se ha decidido adoptar un modelo de desarrollo híbrido:
- **Backend (Django, PostgreSQL, Redis, Celery):** Se mantiene en Docker para garantizar la paridad de entornos, gestionar dependencias complejas (PostGIS) y facilitar el despliegue.
- **Frontend (React Native con Expo):** Se ejecuta de forma nativa en el host (Windows).

## Consecuencias
### Positivas
- **Rendimiento:** Recarga rápida (Hot Module Replacement) instantánea al no depender de la sincronización de red/volúmenes de Docker.
- **Simplicidad:** Menor consumo de recursos de memoria y CPU al no correr una instancia de Node/Metro dentro de Docker.
- **Compatibilidad:** Evita problemas de red complejos para conectar dispositivos físicos (Expo Go) con contenedores Docker.

### Negativas
- **Dependencia del Host:** Los desarrolladores deben tener Node.js instalado directamente en su sistema.
- **Configuración de Red:** Se debe asegurar que el frontend nativo pueda comunicarse con el `localhost:8000` del backend expuesto por Docker.
