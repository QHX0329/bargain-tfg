---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase 7 complete, milestone v1.0 ready for defense
stopped_at: Completed 12-consumer-web-app-04-PLAN.md
last_updated: "2026-05-27T19:25:59.550Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 12
  completed_plans: 10
  percent: 83
---

# Project State

## Current Position

Phase: 07 COMPLETE — TFG BargAIn v1.0 listo para defensa

## Summary

- F1 completada
- F2 completada
- F3 completada
- F4 completada
- F5 completada (9/9 UAT tests passed)
- F6 completada (servicio compartido, tests integracion, UAT aprobada)
- F7 completada (E2E tests Playwright, deploy staging Render, memoria LaTeX, slides defensa, demo script)

## Entregables pendientes (acción manual del autor)

- Compilar memoria PDF (pdflatex / Overleaf) — ver `memoriaTFG/BUILD-INSTRUCTIONS.md`
- Grabar vídeo de demo — ver `docs/defensa/demo-script.md`
- Generar slides PDF — `npx @marp-team/marp-cli docs/defensa/slides.md --pdf`
- Re-sideload IPA 1-2 días antes de la defensa (certificado Apple ID gratuito caduca en 7 días)
- Inscripción en convocatoria ETSII

## Risks

- Certificado Sideloadly caduca en 7 dias — re-sideload 1-2 dias antes de la defensa.
- Cold start Render staging ~30s — hacer una petición antes de entrar al aula.

## Key Decisions

- 04-01: Silent fail for Google Places API proxy - errors return {} to prevent frontend breakage
- 04-01: Redis cache key format places_detail:{pk} with 24h TTL to protect API quota
- 04-01: google_place_id nullable to keep existing stores unaffected
- 04-02: Autocomplete type=establishment (not supermarket) - supermarket is not a valid autocomplete collection type per library docs
- 04-02: DB-match threshold 50m for Places-to-store proximity; discovery markers are ephemeral client state only
- 05-02: legado OCR documentado con pytesseract; ADR-007 aprueba migracion a Google Vision API para F5/F6
- 05-02: 422 for OCRProcessingError (no text extracted), 400 for invalid image, 500 for unexpected errors
- 05-03: gemini-2.0-flash-lite for LLM assistant (ADR-008); history truncated to messages[-20:]; ScopedRateThrottle at 30/hour
- 05-04: Mock target for get_distance_matrix is apps.optimizer.services.distance (Python name resolution - mock where defined)
- 05-04: OR-Tools stop_count dimension uses from_node != 0 to count store visits (not depot transitions)
- 06-01: Proposal approval logic extracted to approve_proposal() in services.py; source=CROWDSOURCING canonical for all proposals
- 06-02: Integration tests for proposal admin (6 tests) and bulk prices (5 tests) cover all critical paths
- 07-01: ORS replaces Graphhopper as distance matrix provider; fallback haversine when ORS_API_KEY empty
- 07-01: render.yaml declares 5 services (web+postgres+redis+2 workers); secrets use sync:false (Render Dashboard)
- 07-01: DATABASE_URL postgresql:// converted to postgis:// in base.py before dj_database_url
- 07-02: Flujos auth y business son UI-driven; optimizer y OCR son API-level via request fixture (pantallas de lista/cámara son móviles)
- 07-02: Fixture JPEG mínimo (1x1 px) versionado en e2e/fixtures/ para independencia de archivos externos
- 07-03: Descubrimiento dinamico de workspace/scheme con ls + xcodebuild -list para evitar nombres hardcoded tras expo prebuild
- 07-03: method ad-hoc en ExportOptions.plist permite re-firma con Sideloadly y Apple ID gratuito
- 07-04: Capítulos 8-11 convertidos a LaTeX (cap08-11.tex); proyect.tex con fuente Helvetica y metadatos BargAIn
- 07-05: Slides Marp en docs/defensa/slides.md; outline 20 slides 7 bloques ETSII; demo script 5 escenas

## Roadmap Evolution

- Phase 6 added: Portal Business y App Movil - Admin UI, CSV prices, EAN-13 validation, UX loading states, business approval notification, RF-019 mobile proposal screen, shared lists verification, email notifications
- Phase 6 complete: service extraction, 11 integration tests, UAT verification, frontend screen validation
- Phase 7 complete: ORS+Render deploy, E2E Playwright, iOS build CI, memoria LaTeX, defensa slides
- Phase 11 added: Auditoria memoria TFG contra guias oficiales y preparacion de despliegue reproducible

## Last Session

- **Stopped at:** Completed 12-consumer-web-app-04-PLAN.md
- **Date:** 2026-04-09

---
Last updated: 2026-04-09
