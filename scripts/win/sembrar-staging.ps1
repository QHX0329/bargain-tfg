# Espera al deploy del último commit en Render y ejecuta seed_demo como job one-off
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\tmp\logs" | Out-Null
Start-Transcript -Path "$root\tmp\logs\seed-staging.log" -Force | Out-Null

$key = (Get-Content .env | Where-Object { $_ -match '^RENDER_API_KEY=' }) -replace '^RENDER_API_KEY=', ''
$h = @{ Authorization = "Bearer $key"; 'Content-Type' = 'application/json' }
$svc = 'srv-d8k24e6rnols73dhjphg'

Write-Host '== Esperando a que el deploy del ultimo commit este live (puede tardar ~10 min) =='
$live = $false
for ($i = 1; $i -le 90; $i++) {
    try {
        $deps = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/deploys?limit=1" -Headers $h -TimeoutSec 30
        $d = $deps[0].deploy
        Write-Host ("  [{0}] deploy {1} | commit {2} | estado: {3}" -f $i, $d.id, $d.commit.id.Substring(0,7), $d.status)
        if ($d.status -eq 'live') { $live = $true; break }
        if ($d.status -match 'failed|canceled') { Write-Host 'DEPLOY FALLIDO'; break }
    } catch { Write-Host "  error consultando deploys: $($_.Exception.Message)" }
    Start-Sleep 10
}

if ($live) {
    Write-Host '(seed_demo se ejecuta automaticamente en el arranque del servicio)'
    Write-Host '== Verificacion: login demo y conteo de productos en staging =='
    Start-Sleep 20
    try {
        $tok = Invoke-RestMethod -Method Post -Uri 'https://bargain-free-api.onrender.com/api/v1/auth/token/' -ContentType 'application/json' -Body '{"username":"demo","password":"Demo1234!"}' -TimeoutSec 30
        $acc = if ($tok.data) { $tok.data.access } else { $tok.access }
        $ah = @{ Authorization = "Bearer $acc" }
        $prods = Invoke-RestMethod -Uri 'https://bargain-free-api.onrender.com/api/v1/products/?page=1' -Headers $ah -TimeoutSec 30
        $count = if ($prods.data) { $prods.data.count } else { $prods.count }
        Write-Host "PRODUCTOS EN STAGING: $count"
    } catch { Write-Host "verificacion fallo: $($_.Exception.Message)" }
}

Stop-Transcript | Out-Null
exit
