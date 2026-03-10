#!/bin/bash
# Script para crear issues de Fase 1 y 2 en GitHub
# Requiere: gh cli (https://cli.github.com/)
# Uso: cd bargain-tfg && bash .github/issues-batch/create-issues.sh

REPO="QHX0329/bargain-tfg"

echo "🏗️ Creando milestone Fase 1..."
gh api repos/$REPO/milestones -f title="F1 — Análisis y Diseño" -f description="Semanas 1-3 | 45 horas | Requisitos, diseño, diagramas" -f due_on="2026-03-29T23:59:59Z"

echo "🏗️ Creando milestone Fase 2..."
gh api repos/$REPO/milestones -f title="F2 — Infraestructura Base" -f description="Semanas 3-5 | 30 horas | Docker, Django, React Native, CI/CD" -f due_on="2026-04-12T23:59:59Z"

echo ""
echo "📋 Creando labels..."
gh label create "fase:F1" --color "0052CC" --description "Fase 1: Análisis y Diseño" --repo $REPO 2>/dev/null
gh label create "fase:F2" --color "5319E7" --description "Fase 2: Infraestructura" --repo $REPO 2>/dev/null
gh label create "tipo:historia-usuario" --color "1D76DB" --description "Historia de usuario" --repo $REPO 2>/dev/null
gh label create "tipo:tarea-tecnica" --color "7057FF" --description "Tarea técnica" --repo $REPO 2>/dev/null
gh label create "tipo:documentacion" --color "0E8A16" --description "Documentación / Memoria TFG" --repo $REPO 2>/dev/null
gh label create "tipo:infraestructura" --color "B0B0B0" --description "Infraestructura y DevOps" --repo $REPO 2>/dev/null
gh label create "prioridad:critica" --color "D93F0B" --description "Prioridad crítica" --repo $REPO 2>/dev/null
gh label create "prioridad:alta" --color "E99695" --description "Prioridad alta" --repo $REPO 2>/dev/null
gh label create "prioridad:media" --color "FBCA04" --description "Prioridad media" --repo $REPO 2>/dev/null
gh label create "semana:S1" --color "C2E0C6" --repo $REPO 2>/dev/null
gh label create "semana:S2" --color "C2E0C6" --repo $REPO 2>/dev/null
gh label create "semana:S3" --color "C2E0C6" --repo $REPO 2>/dev/null
gh label create "semana:S4" --color "C2E0C6" --repo $REPO 2>/dev/null
gh label create "semana:S5" --color "C2E0C6" --repo $REPO 2>/dev/null

echo ""
echo "📝 Creando issues de FASE 1 — Análisis y Diseño..."

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "📄 Estudio de mercado y análisis de competidores" \
  --label "tipo:documentacion,prioridad:critica,fase:F1,semana:S1" \
  --body "## Descripción
Realizar un estudio exhaustivo del mercado español de apps de comparación de precios.

## Tareas
- [ ] Identificar competidores directos: Soysuper, OCU Market, FindItApp
- [ ] Analizar visores de catálogos: Tiendeo, Ofertia
- [ ] Revisar optimizadores logísticos: Simpliroute, RouteXL
- [ ] Analizar apps propias de supermercados (Mercadona, Carrefour, Lidl)
- [ ] Documentar fortalezas y debilidades

## Entregable
\`docs/memoria/03-antecedentes.md\`, \`docs/memoria/04-comparativa.md\`

**Horas estimadas:** 6h | **Semana:** S1"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "📄 Definición de objetivos del TFG" \
  --label "tipo:documentacion,prioridad:critica,fase:F1,semana:S1" \
  --body "## Descripción
Definir objetivo principal y específicos medibles del TFG.

## Tareas
- [ ] Redactar objetivo principal
- [ ] Definir 10 objetivos específicos medibles
- [ ] Establecer indicadores de éxito cuantificables
- [ ] Revisar con el tutor Juan Vicente

## Entregable
\`docs/memoria/02-objetivos.md\`

**Horas estimadas:** 3h | **Semana:** S1"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "📄 Especificación de actores del sistema" \
  --label "tipo:documentacion,prioridad:critica,fase:F1,semana:S1" \
  --body "## Descripción
Definir los actores del sistema BargAIn: Consumidor, Comercio/PYME, Admin, Sistema (Scraper).

## Tareas
- [ ] Definir permisos por actor
- [ ] Documentar flujos por rol
- [ ] Diagrama de actores

## Entregable
\`docs/memoria/07-requisitos.md\` — Sección 7.1

**Horas estimadas:** 3h | **Semana:** S1"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "📄 Requisitos de Información (RI-001 a RI-012)" \
  --label "tipo:documentacion,prioridad:critica,fase:F1,semana:S1" \
  --body "## Descripción
Especificar los 12 requisitos de información del sistema.

## Requisitos
- [ ] RI-001 Usuarios | RI-002 Productos | RI-003 Categorías
- [ ] RI-004 Tiendas | RI-005 Cadenas | RI-006 Precios
- [ ] RI-007 Listas compra | RI-008 Optimización | RI-009 Perfiles PYME
- [ ] RI-010 Notificaciones | RI-011 Sesiones OCR | RI-012 Conversaciones LLM

## Entregable
\`docs/memoria/07-requisitos.md\` — Sección 7.2

**Horas estimadas:** 6h | **Semana:** S1-S2"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "📄 Requisitos funcionales (RF-001 a RF-035)" \
  --label "tipo:documentacion,prioridad:critica,fase:F1,semana:S2" \
  --body "## Descripción
Especificar los 35 requisitos funcionales agrupados por módulo.

## Módulos
- [ ] Autenticación (RF-001 a RF-005)
- [ ] Productos (RF-006 a RF-010)
- [ ] Tiendas (RF-011 a RF-014)
- [ ] Precios (RF-015 a RF-019)
- [ ] Listas (RF-020 a RF-023)
- [ ] Optimizador (RF-024 a RF-027)
- [ ] OCR (RF-028 a RF-029)
- [ ] Asistente (RF-030 a RF-031)
- [ ] Business (RF-032 a RF-034)
- [ ] Notificaciones (RF-035)

## Entregable
\`docs/memoria/07-requisitos.md\` — Sección 7.3

**Horas estimadas:** 8h | **Semana:** S2"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "📄 Requisitos no funcionales + Historias de usuario + Reglas de negocio" \
  --label "tipo:documentacion,prioridad:alta,fase:F1,semana:S2" \
  --body "## Descripción
Completar la sección de requisitos con RNF, HU y reglas de negocio.

## Tareas
- [ ] 8 Requisitos no funcionales (rendimiento, seguridad, usabilidad...)
- [ ] 30 Historias de usuario con criterios de aceptación
- [ ] 8+ Reglas de negocio documentadas

## Entregable
\`docs/memoria/07-requisitos.md\` — Secciones 7.4, 7.5 y 7.6

**Horas estimadas:** 10h | **Semana:** S2"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "🏗️ Diseño de arquitectura de capas" \
  --label "tipo:tarea-tecnica,prioridad:critica,fase:F1,semana:S3" \
  --body "## Descripción
Diseñar la arquitectura lógica del sistema en capas con PlantUML.

## Capas
1. Presentación (React Native + React Web)
2. API (DRF)
3. Lógica de Negocio (Servicios Django)
4. Datos (PostgreSQL + PostGIS + Redis)
5. Integraciones (Scrapy, Claude API, Google Maps)
6. Tareas Asíncronas (Celery)

## Entregable
\`docs/diagramas/arquitectura/\` + Sección 8.1 memoria

**Horas estimadas:** 3h | **Semana:** S3"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "🏗️ Modelo de clases UML + Modelo E-R" \
  --label "tipo:tarea-tecnica,prioridad:critica,fase:F1,semana:S3" \
  --body "## Descripción
Crear diagramas UML de clases y E-R que mapean a los modelos Django + PostGIS.

## Clases principales
User, Product, Category, Brand, Store, Chain, Price, ShoppingList, OptimizationResult, BusinessProfile, OCRSession, Notification

## Tareas
- [ ] Diagrama de clases UML (PlantUML)
- [ ] Diagrama E-R con campos PostGIS
- [ ] Diagramas de casos de uso por actor
- [ ] Al menos 2 diagramas de secuencia

## Entregable
\`docs/diagramas/clases/\`, \`docs/diagramas/er/\`, \`docs/diagramas/casos-uso/\`

**Horas estimadas:** 8h | **Semana:** S3"

gh issue create --repo $REPO --milestone "F1 — Análisis y Diseño" \
  --title "🎨 Wireframes y mockups de UI" \
  --label "tipo:tarea-tecnica,prioridad:alta,fase:F1,semana:S3" \
  --body "## Descripción
Diseñar wireframes de las 10 pantallas principales de la app.

## Pantallas
- [ ] Onboarding (splash + login/registro)
- [ ] Home (lista activa + accesos rápidos)
- [ ] Lista de compra (gestión items)
- [ ] Comparador de precios
- [ ] Mapa de tiendas cercanas
- [ ] Ruta optimizada (mapa + desglose)
- [ ] Cámara OCR
- [ ] Chat asistente
- [ ] Portal Business
- [ ] Perfil y configuración

## Herramienta
Figma / Excalidraw

**Horas estimadas:** 5h | **Semana:** S3"

echo ""
echo "📝 Creando issues de FASE 2 — Infraestructura..."

gh issue create --repo $REPO --milestone "F2 — Infraestructura Base" \
  --title "⚙️ Inicialización repositorio GitHub + CI/CD" \
  --label "tipo:infraestructura,prioridad:critica,fase:F2,semana:S3" \
  --body "## Descripción
Subir scaffold a GitHub, configurar protecciones y verificar CI.

## Tareas
- [ ] Crear repo github.com/QHX0329/bargain-tfg
- [ ] Push scaffold inicial
- [ ] Crear ramas main + develop
- [ ] Branch protection rules en main
- [ ] Verificar GitHub Actions pasan
- [ ] Configurar labels y milestones

**Horas estimadas:** 3h | **Semana:** S3"

gh issue create --repo $REPO --milestone "F2 — Infraestructura Base" \
  --title "🐳 Configuración Docker + Docker Compose" \
  --label "tipo:infraestructura,prioridad:critica,fase:F2,semana:S3" \
  --body "## Descripción
Verificar entorno Docker funcional con PostgreSQL+PostGIS, Redis, Django, Celery.

## Tareas
- [ ] \`make dev\` levanta todo sin errores
- [ ] Healthchecks de postgres y redis funcionan
- [ ] Volumes persistentes verificados
- [ ] Documentar en README

**Horas estimadas:** 4h | **Semana:** S3"

gh issue create --repo $REPO --milestone "F2 — Infraestructura Base" \
  --title "⚙️ Setup Django + PostGIS + React Native + Celery" \
  --label "tipo:infraestructura,prioridad:critica,fase:F2,semana:S4" \
  --body "## Descripción
Verificar que toda la infraestructura base funciona end-to-end.

## Tareas
- [ ] Django: \`manage.py check\` + migraciones + admin funcional
- [ ] PostGIS: extensión activa + query ST_DWithin funciona
- [ ] React Native: Expo app arranca + navegación tabs funciona
- [ ] Celery: worker conecta + tarea de prueba ejecuta
- [ ] Redis: ping + caché funcional
- [ ] Swagger en /api/docs/

**Horas estimadas:** 14h | **Semana:** S4"

gh issue create --repo $REPO --milestone "F2 — Infraestructura Base" \
  --title "⚙️ Linters + Sentry + Seed de datos" \
  --label "tipo:infraestructura,prioridad:alta,fase:F2,semana:S5" \
  --body "## Descripción
Configurar calidad de código, monitorización y datos de prueba.

## Tareas
- [ ] Ruff configurado para backend
- [ ] ESLint + Prettier para frontend
- [ ] \`make lint\` funciona sin errores
- [ ] Sentry integrado (plan developer)
- [ ] Seed con 5 usuarios, 10 tiendas Sevilla, 100 productos, 3 listas
- [ ] \`make seed\` idempotente

**Horas estimadas:** 7h | **Semana:** S5"

gh issue create --repo $REPO --milestone "F2 — Infraestructura Base" \
  --title "📄 Documentación de herramientas utilizadas" \
  --label "tipo:documentacion,prioridad:media,fase:F2,semana:S5" \
  --body "## Descripción
Redactar sección 5 de la memoria con todas las herramientas y su justificación.

## Herramientas a documentar
Django 5, PostgreSQL+PostGIS, React Native+Expo, Celery+Redis, Scrapy, Claude API, Tesseract, OR-Tools, Docker, GitHub Actions, Ruff, Sentry

## Tareas
- [ ] Cada herramienta con versión y justificación
- [ ] Alternativas consideradas mencionadas
- [ ] ADRs para decisiones clave

## Entregable
\`docs/memoria/05-herramientas.md\`

**Horas estimadas:** 2h | **Semana:** S5"

echo ""
echo "✅ ¡Todos los issues creados! Total: 14 issues (9 F1 + 5 F2)"
echo "📊 Horas planificadas: F1=45h + F2=30h = 75h"
