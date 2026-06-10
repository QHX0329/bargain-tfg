@echo off
rem Reinicia backend + portal PYME y recaptura las pantallas pendientes
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0recapturar-fallidas.ps1"
