@echo off
rem Recaptura las 4 pantallas de mapa contra el backend de Render (sin marca de agua)
cd /d "%~dp0..\.."
if not exist tmp\logs mkdir tmp\logs
set API_URL=https://bargain-free-api.onrender.com/api/v1
node scripts\capture-memoria.mjs --shot=mobile-mapa,mobile-tienda-perfil,web-mapa,web-tienda-perfil > tmp\logs\capturas.log 2>&1
exit
