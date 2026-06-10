@echo off
rem Prepara datos demo y relanza la captura (requiere servicios ya levantados)
cd /d "%~dp0..\.."
echo === Datos demo (capture_setup.py) ===
type scripts\capture_setup.py | docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell > tmp\logs\capture_setup.log 2>&1
echo (detalle en tmp\logs\capture_setup.log)
echo === Captura de pantallas ===
node scripts\capture-memoria.mjs %* > tmp\logs\capturas.log 2>&1
type tmp\logs\capturas.log
echo.
echo (fin de capturas - revisa tmp\logs\capturas.log)
pause
