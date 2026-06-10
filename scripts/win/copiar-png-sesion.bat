@echo off
rem Copia los PNG recien generados a la carpeta de sesion de Claude (fuera de OneDrive)
set DEST=C:\Users\xxnii\AppData\Roaming\Claude\local-agent-mode-sessions\dbbcd449-2da5-4f9f-ad27-2ad550fd2f09\bb8a0537-09ed-42bc-a9de-0db4cb8d4ce2\local_ce7df371-4c7c-440f-aaaf-00d7afef4a55\outputs
cd /d "%~dp0..\.."
copy /y "memoriaTFG\Plantilla TfG\diagramas\arquitectura\arquitectura-capas.png" "%DEST%\" >nul
copy /y "memoriaTFG\Plantilla TfG\diagramas\capturas\mobile-mapa.png" "%DEST%\" >nul
copy /y "memoriaTFG\Plantilla TfG\diagramas\capturas\mobile-tienda-perfil.png" "%DEST%\" >nul
copy /y "memoriaTFG\Plantilla TfG\diagramas\capturas\web-mapa.png" "%DEST%\" >nul
copy /y "memoriaTFG\Plantilla TfG\diagramas\capturas\web-tienda-perfil.png" "%DEST%\" >nul
dir "%DEST%\*.png" > tmp\logs\copia-png.log
exit
