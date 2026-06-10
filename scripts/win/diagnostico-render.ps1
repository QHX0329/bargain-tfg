# Diagnóstico del servicio bargain-free-api: deploys, eventos y logs recientes
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\tmp\logs" | Out-Null
Start-Transcript -Path "$root\tmp\logs\diagnostico-render.log" -Force | Out-Null

$key = (Get-Content .env | Where-Object { $_ -match '^RENDER_API_KEY=' }) -replace '^RENDER_API_KEY=', ''
$h = @{ Authorization = "Bearer $key" }
$svc = 'srv-d8k24e6rnols73dhjphg'

Write-Host '== Ultimos deploys =='
try {
    $deps = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/deploys?limit=5" -Headers $h -TimeoutSec 30
    foreach ($it in $deps) {
        $d = $it.deploy
        Write-Host ("{0} | commit {1} | {2} | {3}" -f $d.id, $d.commit.id.Substring(0,7), $d.status, $d.finishedAt)
    }
} catch { Write-Host "error deploys: $($_.Exception.Message)" }

Write-Host ''
Write-Host '== Eventos recientes =='
try {
    $evs = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/events?limit=12" -Headers $h -TimeoutSec 30
    foreach ($it in $evs) {
        $e = $it.event
        Write-Host ("{0} | {1} | {2}" -f $e.timestamp, $e.type, ($e.details | ConvertTo-Json -Compress -Depth 3))
    }
} catch { Write-Host "error eventos: $($_.Exception.Message)" }

Write-Host ''
Write-Host '== Logs recientes del servicio =='
try {
    $logs = Invoke-RestMethod -Uri "https://api.render.com/v1/logs?ownerId=&resource=$svc&limit=60&direction=backward" -Headers $h -TimeoutSec 30
    foreach ($l in $logs.logs) { Write-Host ($l.timestamp + ' ' + $l.message) }
} catch { Write-Host "error logs: $($_.Exception.Message)" }

Stop-Transcript | Out-Null
exit
