# Actualiza CORS_ALLOWED_ORIGINS del servicio bargain-free-api en Render
# (añade los orígenes locales de Expo web) y espera al redeploy automático.
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\tmp\logs" | Out-Null
Start-Transcript -Path "$root\tmp\logs\render-cors.log" -Force | Out-Null

$key = (Get-Content .env | Where-Object { $_ -match '^RENDER_API_KEY=' }) -replace '^RENDER_API_KEY=', ''
$h = @{ Authorization = "Bearer $key"; 'Content-Type' = 'application/json' }

$svcs = Invoke-RestMethod -Uri 'https://api.render.com/v1/services?limit=20' -Headers $h -TimeoutSec 30
$svc = ($svcs | Where-Object { $_.service.name -eq 'bargain-free-api' }).service
if (-not $svc) { Write-Host 'ERROR: servicio bargain-free-api no encontrado'; Stop-Transcript; Read-Host 'Enter'; exit 1 }
Write-Host ("Servicio: " + $svc.id + " | " + $svc.serviceDetails.url)

$cors = 'https://qhx0329.github.io,http://localhost:5173,http://localhost:3000,http://localhost:8081,http://127.0.0.1:8081'
$body = @{ value = $cors } | ConvertTo-Json
try {
    Invoke-RestMethod -Method Put -Uri ("https://api.render.com/v1/services/" + $svc.id + "/env-vars/CORS_ALLOWED_ORIGINS") -Headers $h -Body $body -TimeoutSec 30 | Out-Null
    Write-Host "CORS_ALLOWED_ORIGINS actualizado a: $cors"
} catch { Write-Host "ERROR actualizando env var: $($_.Exception.Message)"; Stop-Transcript; Read-Host 'Enter'; exit 1 }

Write-Host 'Lanzando redeploy para aplicar el cambio...'
try {
    $dep = Invoke-RestMethod -Method Post -Uri ("https://api.render.com/v1/services/" + $svc.id + "/deploys") -Headers $h -Body '{}' -TimeoutSec 30
    Write-Host ("Deploy creado: " + $dep.id)
} catch { Write-Host "Aviso: no se pudo crear deploy explícito: $($_.Exception.Message)" }

Write-Host 'Esperando a que el servicio vuelva a estar sano (puede tardar varios minutos)...'
$ok = $false
for ($i = 1; $i -le 60; $i++) {
    Start-Sleep 10
    try {
        $r = Invoke-RestMethod -Uri 'https://bargain-free-api.onrender.com/api/v1/health/' -TimeoutSec 20
        Write-Host ("HEALTH OK tras redeploy: " + ($r | ConvertTo-Json -Compress))
        $ok = $true; break
    } catch { Write-Host "  esperando ($i)..." }
}
if (-not $ok) { Write-Host 'AVISO: el health no respondio en el tiempo esperado; comprueba el dashboard de Render.' }

Stop-Transcript | Out-Null
Read-Host 'Pulsa Enter para cerrar'
