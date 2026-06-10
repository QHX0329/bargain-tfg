@echo off
rem Verifica servicios Render + conectividad del backend de staging
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verificar-render.ps1"
