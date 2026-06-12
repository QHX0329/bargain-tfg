---
phase: 07-testing-deploy-memoria
plan: "03"
subsystem: ci-ios-deploy
tags: [ci, ios, github-actions, render, sideload, deploy]
dependency_graph:
  requires: [07-01]
  provides: [ios-build-workflow, render-deploy-docs]
  affects: [Makefile, docs/decisiones/011-deploy-staging.md]
tech_stack:
  added: [xcodebuild, expo-prebuild, CocoaPods, Sideloadly, ios-build-workflow]
  patterns: [dynamic-workspace-discovery, unsigned-ipa-export, workflow-dispatch-trigger]
key_files:
  created:
    - .github/workflows/ios-build.yml
    - frontend/ExportOptions.plist
  modified:
    - docs/decisiones/011-deploy-staging.md
    - Makefile
decisions:
  - Descubrimiento dinámico de workspace/scheme con ls + xcodebuild -list para evitar nombres hardcoded tras expo prebuild
  - Fallback xcodebuild sin xcpretty para compatibilidad con cualquier runner macos-latest
  - method ad-hoc en ExportOptions.plist permite re-firma con Sideloadly y Apple ID gratuito
  - Re-sideload planificado 1-2 días antes de la defensa documentado en Makefile y ADR-011
metrics:
  duration: "~10 min"
  completed: "2026-04-09"
  tasks_completed: 4
  files_created: 2
  files_modified: 2
---

# Phase 7 Plan 03: iOS Build Workflow y Deploy Render Summary

Workflow de GitHub Actions para compilar la app iOS en `macos-latest` generando un `.ipa` unsigned descargable como artefacto, junto con documentación del proceso de deploy en Render staging.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Crear ExportOptions.plist para IPA unsigned | e8222c7 | `frontend/ExportOptions.plist` |
| 2 | Crear .github/workflows/ios-build.yml | e8222c7 | `.github/workflows/ios-build.yml` |
| 3 | Documentar proceso de Render staging deploy | b87c855 | `docs/decisiones/011-deploy-staging.md` |
| 4 | Actualizar Makefile con targets deploy y iOS | dcdb85d | `Makefile` |

## What Was Built

### `.github/workflows/ios-build.yml`
Workflow con runner `macos-latest`, timeout 60 min, y doble trigger:
- `workflow_dispatch` (manual con input de node version)
- `push` con tags `ios-*`

Pasos clave:
1. `actions/checkout@v4` + `actions/setup-node@v4` con cache npm
2. `npm ci` en `frontend/`
3. `npx expo prebuild --platform ios --clean --non-interactive` con `EXPO_PUBLIC_GOOGLE_MAPS_KEY` desde secrets
4. Verificación del workspace generado (`ls *.xcworkspace` + `xcodebuild -list`)
5. Cache CocoaPods en `frontend/ios/Pods` por `Podfile.lock`
6. `pod install --repo-update`
7. Build `.xcarchive` con descubrimiento dinámico de workspace y scheme — no hardcoded
8. Export `.ipa` con `frontend/ExportOptions.plist`
9. Upload artifact `BarGAIN-unsigned-{sha}` con retención 7 días

### `frontend/ExportOptions.plist`
Configuración de exportación unsigned para Sideloadly:
- `method: ad-hoc` — permite re-firma con Apple ID gratuito
- `signingCertificate: "-"` — firma vacía (unsigned)
- `compileBitcode: false`, `stripSwiftSymbols: true`

### `docs/decisiones/011-deploy-staging.md` (ADR-011)
Sección añadida al final: "Instrucciones de despliegue en Render (actualizado 2026-04-08)" con:
- Proceso Blueprint en Render (5 servicios)
- Tabla de variables de entorno `sync: false`
- Migraciones post-deploy y health check
- Procedimiento completo de sideload iOS con Sideloadly
- Nota de re-sideload 1-2 días antes de la defensa

### `Makefile`
- `deploy-staging`: reemplazado con instrucciones reales del flujo Render (git push → auto-deploy)
- `ios-build`: nuevo target con instrucciones de `workflow_dispatch` y nota de re-sideload
- `ios-build` añadido a `.PHONY`

## Verification Results

```
YAML OK                             # python -c "import yaml; yaml.safe_load(...)" → OK
<string>ad-hoc</string>            # grep "ad-hoc" frontend/ExportOptions.plist → OK
1                                   # grep -c "Instrucciones de despliegue" ADR-011 → 1
ios-build: line 128                # grep "ios-build" Makefile → OK
```

## Workflow Status
El workflow `.github/workflows/ios-build.yml` existe y puede dispararse desde GitHub Actions → "iOS Build (unsigned IPA)" → Run workflow. No se ha ejecutado aún — requiere runner `macos-latest` en GitHub. El build tardará ~15 min la primera vez.

## Render Deploy Status
El deploy en Render es un paso manual descrito en ADR-011 y en `make deploy-staging`. Requiere que 07-01 esté completo (`render.yaml` en raíz) y que las env vars estén configuradas en el Dashboard.

## Re-sideload Timing
**IMPORTANTE para el agente de cierre (07-06):** El certificado de Sideloadly con Apple ID gratuito caduca en 7 días. Programar re-sideload 1-2 días antes de la defensa. El artefacto del último run de iOS Build tiene retención de 7 días — triggear un nuevo run si el artefacto ha expirado.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: secret_in_ci | .github/workflows/ios-build.yml | `EXPO_PUBLIC_GOOGLE_MAPS_KEY` leído de GitHub Secrets — no en código fuente. Secret debe configurarse en GitHub repo → Settings → Secrets → Actions. |

## Self-Check: PASSED

- `frontend/ExportOptions.plist`: FOUND
- `.github/workflows/ios-build.yml`: FOUND
- `docs/decisiones/011-deploy-staging.md` (sección deploy): FOUND (grep count=1)
- `Makefile` (ios-build target): FOUND (line 128)
- Commit e8222c7: FOUND
- Commit b87c855: FOUND
- Commit dcdb85d: FOUND
