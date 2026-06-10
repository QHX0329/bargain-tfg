# Capturas de pantalla para la memoria (cap. 9)

Genera los 47 PNG de `memoriaTFG/Plantilla TfG/diagramas/capturas/` referenciados
por `cap09.tex` (galería + figuras del manual de usuario).

## Pasos (PowerShell, desde la raíz del repo)

```powershell
# 1. Backend en Docker + migraciones + seed base (usuarios/tiendas)
make dev
make migrate-docker
make seed-docker

# 2. Datos demo para las capturas (idempotente)
Get-Content -Raw scripts/capture_setup.py | docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell

# 3. App de usuario (Expo Web, puerto 8081) — dejar abierto en otra terminal
cd frontend; npx expo start --web

# 4. Portal PYME (Vite, puerto 5173) — dejar abierto en otra terminal
cd frontend/web; npm run dev

# 5. Navegador de Playwright (solo la primera vez)
npx playwright install chromium

# 6. Capturar todo
node scripts/capture-memoria.mjs
```

## Opciones

```powershell
node scripts/capture-memoria.mjs --only=mobile   # solo mobile-*.png
node scripts/capture-memoria.mjs --only=web      # solo web-*.png
node scripts/capture-memoria.mjs --only=pyme     # solo pyme-*.png
node scripts/capture-memoria.mjs --shot=mobile-mapa  # reintentar una captura
```

Variables: `API_URL` (def. `http://localhost:8000/api/v1`), `EXPO_URL`
(def. `http://localhost:8081`), `PYME_URL` (def. `http://localhost:5173`).

## Credenciales demo creadas por `capture_setup.py`

| Cuenta | Rol |
|---|---|
| `demo@bargain.local` / `Demo1234!` | Consumer con lista, alerta, notificaciones y favoritas |
| `fruteria@bargain.local` / `Demo1234!` | PYME aprobada (Frutería El Vergel) |
| `panaderia@bargain.local` / `Demo1234!` | PYME pendiente (para el panel admin) |
| `admin@bargain.local` / `Demo1234!` | Staff (página /admin del portal) |

## Notas

- La primera carga de Expo Web compila el bundle: el script espera hasta 5 min.
- `mobile-ocr-revision` sube `scripts/assets/ticket-demo.png` y usa Google
  Vision (requiere `GOOGLE_CLOUD_VISION_API_KEY` en `.env`).
- `*-asistente` envía una pregunta real al asistente (requiere `GEMINI_API_KEY`).
- El mapa requiere `EXPO_PUBLIC_GOOGLE_MAPS_KEY` en `frontend/.env.local` (ya presente).
