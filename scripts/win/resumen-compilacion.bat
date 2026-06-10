@echo off
cd /d "%~dp0..\.."
powershell -NoProfile -Command "Select-String -Path 'memoriaTFG\Plantilla TfG\proyect-final.log' -Pattern 'Output written','LaTeX Warning: There were','Reference.*undefined','not found' | Select-Object -Last 6 | ForEach-Object { $_.Line } | Out-File -Encoding utf8 'tmp\logs\resumen-pdf.log'"
exit
