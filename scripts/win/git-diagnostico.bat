@echo off
cd /d "%~dp0..\.."
if not exist tmp\logs mkdir tmp\logs
echo === procesos git === > tmp\logs\git-diag.log
tasklist /FI "IMAGENAME eq git.exe" >> tmp\logs\git-diag.log 2>&1
echo === lock === >> tmp\logs\git-diag.log
if exist .git\index.lock (echo LOCK PRESENTE >> tmp\logs\git-diag.log) else (echo SIN LOCK >> tmp\logs\git-diag.log)
exit
