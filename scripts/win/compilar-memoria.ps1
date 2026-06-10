# Compila la memoria (proyect.tex) en local. Instala MiKTeX (winget) si no existe.
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\tmp\logs" | Out-Null
Start-Transcript -Path "$root\tmp\logs\compilar-memoria.log" -Force | Out-Null

function Find-Pdflatex {
    $cmd = Get-Command pdflatex -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe",
        "$env:ProgramFiles\MiKTeX\miktex\bin\x64\pdflatex.exe"
    )
    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
    return $null
}

$pdflatex = Find-Pdflatex
if (-not $pdflatex) {
    Write-Host 'pdflatex no encontrado: instalando MiKTeX via winget (puede tardar varios minutos)...'
    winget install --id MiKTeX.MiKTeX -e --silent --accept-package-agreements --accept-source-agreements
    $pdflatex = Find-Pdflatex
}
if (-not $pdflatex) { Write-Host 'ERROR: no se pudo instalar pdflatex'; Stop-Transcript; exit 1 }
Write-Host "pdflatex: $pdflatex"

# Auto-instalar paquetes que falten sin preguntar
$initexmf = Join-Path (Split-Path $pdflatex) 'initexmf.exe'
& $initexmf --set-config-value "[MPM]AutoInstall=1" 2>$null

Set-Location "$root\memoriaTFG\Plantilla TfG"
# proyect.pdf puede estar bloqueado por un visor: compilamos con jobname propio
Remove-Item proyect-final.aux, proyect-final.toc, proyect-final.lof, proyect-final.lot, proyect-final.out -ErrorAction SilentlyContinue

for ($pass = 1; $pass -le 3; $pass++) {
    Write-Host "== Pasada $pass de pdflatex =="
    & $pdflatex -interaction=nonstopmode -jobname=proyect-final proyect.tex > "$root\tmp\logs\pdflatex-pass$pass.log" 2>&1
    Write-Host ("   exit: " + $LASTEXITCODE)
}

$errors = Select-String -Path proyect-final.log -Pattern '^!' -ErrorAction SilentlyContinue | Select-Object -First 5
if ($errors) { Write-Host 'ERRORES:'; $errors | ForEach-Object { Write-Host ("  " + $_.Line) } }
else { Write-Host 'Sin errores de compilacion.' }

if (Test-Path proyect-final.pdf) {
    $pdf = Get-Item proyect-final.pdf
    Write-Host ("PDF generado: " + $pdf.FullName + " (" + $pdf.Length + " bytes, " + $pdf.LastWriteTime + ")")
} else {
    Write-Host 'ERROR: no se genero proyect-final.pdf'
}

Stop-Transcript | Out-Null
exit
