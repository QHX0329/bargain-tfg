# recapturar-fallidas.ps1 — Reinicia backend (nuevo throttle) y portal PYME
# (nuevo VITE_API_URL) y recaptura solo las pantallas pendientes.

$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
$logDir = Join-Path $root 'tmp\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Test-Http($url) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null; return $true }
    catch { if ($_.Exception.Response) { return $true } return $false }
}
function Wait-Http($url, $label, $tries = 40) {
    for ($i = 1; $i -le $tries; $i++) {
        if (Test-Http $url) { Write-Host "OK $label"; return $true }
        Start-Sleep 3
    }
    Write-Host "TIMEOUT $label"; return $false
}

Write-Host '== Reiniciando backend (aplica nuevo rate-limit de dev) =='
docker compose -f docker-compose.dev.yml restart backend *>> (Join-Path $logDir 'docker.log')
Wait-Http 'http://localhost:8000/api/v1/products/' 'Backend API' 40 | Out-Null

Write-Host '== Reiniciando portal PYME (Vite) para leer VITE_API_URL =='
# Matar el proceso que ocupa el puerto 5173
$conns = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
}
Start-Sleep 2
Start-Process powershell -WindowStyle Minimized -ArgumentList '-NoExit', '-Command', `
    "Set-Location '$root\frontend\web'; npm run dev 2>&1 | Tee-Object -FilePath '$logDir\vite.log'"
Wait-Http 'http://localhost:5173' 'Portal PYME' 40 | Out-Null
Start-Sleep 5

Write-Host '== Datos demo (capture_setup.py) =='
Get-Content -Raw (Join-Path $root 'scripts\capture_setup.py') |
    docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell *>> (Join-Path $logDir 'capture_setup.log')

Write-Host '== Recapturando pantallas pendientes =='
$shots = @(
    'pyme-admin-aprobacion',
    'mobile-ocr-revision'
) -join ','
node (Join-Path $root 'scripts\capture-memoria.mjs') "--shot=$shots" 2>&1 |
    Tee-Object -FilePath (Join-Path $logDir 'capturas.log')

Write-Host ''
Write-Host '== FIN =='
Read-Host 'Pulsa Enter para cerrar'
