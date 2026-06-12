@echo off
rem Push de la rama main al remoto (los commits se preparan previamente)
cd /d "%~dp0..\.."
if not exist tmp\logs mkdir tmp\logs
echo === inicio %date% %time% === > tmp\logs\git-push.log
if exist .git\index.lock del /f .git\index.lock >> tmp\logs\git-push.log 2>&1
git push origin main >> tmp\logs\git-push.log 2>&1
echo exit-code: %errorlevel% >> tmp\logs\git-push.log
echo === fin %date% %time% === >> tmp\logs\git-push.log
exit
