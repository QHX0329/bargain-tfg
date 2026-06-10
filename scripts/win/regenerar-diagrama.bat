@echo off
rem Regenera el diagrama de arquitectura (PlantUML -> PNG)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0regenerar-diagrama.ps1"
