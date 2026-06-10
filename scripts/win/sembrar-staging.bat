@echo off
rem Espera al deploy en Render y siembra el catalogo demo en staging
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sembrar-staging.ps1"
