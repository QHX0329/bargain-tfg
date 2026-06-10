@echo off
rem Compila la memoria en local (instala MiKTeX si hace falta)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0compilar-memoria.ps1"
