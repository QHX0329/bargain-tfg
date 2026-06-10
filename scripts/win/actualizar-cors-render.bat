@echo off
rem Actualiza CORS del backend en Render y espera al redeploy
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0actualizar-cors-render.ps1"
