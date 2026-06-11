@echo off
rem Limpia lock huerfano + commit + push a main (log completo, sin pausa)
cd /d "%~dp0..\.."
if not exist tmp\logs mkdir tmp\logs
echo === inicio %date% %time% === > tmp\logs\git-push.log
if exist .git\index.lock del /f .git\index.lock >> tmp\logs\git-push.log 2>&1
git add -A >> tmp\logs\git-push.log 2>&1
git status --porcelain > tmp\logs\git-status.log 2>&1
git commit -m "feat(core): seed_sevilla con 50 tiendas ficticias y 55k precios estilo Mercadona, sembrado en arranque de Render (F7-11)" >> tmp\logs\git-push.log 2>&1
git push origin main >> tmp\logs\git-push.log 2>&1
echo === fin %date% %time% === >> tmp\logs\git-push.log
exit
