@echo off
rem Fase 1: revisar qué se va a commitear (no commitea nada, no deja ventana)
cd /d "%~dp0..\.."
if not exist tmp\logs mkdir tmp\logs
git add -A > tmp\logs\git-status.log 2>&1
git status --porcelain >> tmp\logs\git-status.log 2>&1
echo --- STAT --- >> tmp\logs\git-status.log
git -c core.quotepath=false diff --cached --stat >> tmp\logs\git-status.log 2>&1
exit
