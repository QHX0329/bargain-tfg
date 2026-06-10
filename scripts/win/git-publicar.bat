@echo off
rem Limpia lock huerfano + commit + push a main (log completo, sin pausa)
cd /d "%~dp0..\.."
if not exist tmp\logs mkdir tmp\logs
echo === inicio %date% %time% === > tmp\logs\git-push.log
if exist .git\index.lock del /f .git\index.lock >> tmp\logs\git-push.log 2>&1
git add -A >> tmp\logs\git-push.log 2>&1
git status --porcelain > tmp\logs\git-status.log 2>&1
git commit -m "feat(deploy): frontends conectados a bargain-free-api, capturas reales y cuadros como imagenes en la memoria, seed_demo para staging y guia de despliegue (F7-07/F7-08)" >> tmp\logs\git-push.log 2>&1
git push origin main >> tmp\logs\git-push.log 2>&1
echo === fin %date% %time% === >> tmp\logs\git-push.log
exit
