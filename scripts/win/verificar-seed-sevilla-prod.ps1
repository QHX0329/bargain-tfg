# Espera al deploy del último commit en Render y verifica seed_sevilla en producción
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\tmp\logs" | Out-Null
Start-Transcript -Path "$root\tmp\logs\seed-sevilla-prod.log" -Force | Out-Null

$key = (Get-Content .env | Where-Object { $_ -match '^RENDER_API_KEY=' }) -replace '^RENDER_API_KEY=', ''
$h = @{ Authorization = "Bearer $key"; 'Content-Type' = 'application/json' }
$svc = 'srv-d8k24e6rnols73dhjphg'
$base = 'https://bargain-free-api.onrender.com/api/v1'

Write-Host '== 1. Esperando a que el deploy del ultimo commit este live (seed corre en el arranque) =='
$live = $false
for ($i = 1; $i -le 120; $i++) {
    try {
        $deps = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/deploys?limit=1" -Headers $h -TimeoutSec 30
        $d = $deps[0].deploy
        Write-Host ("  [{0}] deploy {1} | commit {2} | estado: {3}" -f $i, $d.id, $d.commit.id.Substring(0,7), $d.status)
        if ($d.status -eq 'live') { $live = $true; break }
        if ($d.status -match 'failed|canceled') { Write-Host 'DEPLOY FALLIDO'; break }
    } catch { Write-Host "  error consultando deploys: $($_.Exception.Message)" }
    Start-Sleep 10
}
if (-not $live) { Write-Host 'ERROR: deploy no llego a live'; Stop-Transcript | Out-Null; exit 1 }

Write-Host '== 2. Login demo =='
Start-Sleep 30
$acc = $null
for ($i = 1; $i -le 10; $i++) {
    try {
        $tok = Invoke-RestMethod -Method Post -Uri "$base/auth/token/" -ContentType 'application/json' -Body '{"username":"demo","password":"Demo1234!"}' -TimeoutSec 40
        $acc = if ($tok.data) { $tok.data.access } else { $tok.access }
        if ($acc) { break }
    } catch { Write-Host "  intento ${i}: $($_.Exception.Message)"; Start-Sleep 15 }
}
if (-not $acc) { Write-Host 'ERROR: login fallido'; Stop-Transcript | Out-Null; exit 1 }
$ah = @{ Authorization = "Bearer $acc" }

Write-Host '== 3. Tiendas en 10 km del centro de Sevilla =='
$st = Invoke-RestMethod -Uri "$base/stores/?lat=37.3891&lng=-5.9945&radius_km=10&page_size=100" -Headers $ah -TimeoutSec 60
$data = if ($st.data) { $st.data } else { $st }
$results = $data.results
Write-Host ("TIENDAS EN RADIO 10KM: {0}" -f $data.count)
$fict = @($results | Where-Object { $_.chain -and $_.chain.slug -match 'superguadalquivir|mercasur|hispalis|superazahar|almacenes-triana|la-giralda|superbetica' })
Write-Host ("TIENDAS FICTICIAS EN PAGINA 1: {0}" -f $fict.Count)
$results | Select-Object -First 8 | ForEach-Object { Write-Host ("  - " + $_.name) }

Write-Host '== 4. Productos totales en staging =='
$prods = Invoke-RestMethod -Uri "$base/products/?page=1" -Headers $ah -TimeoutSec 60
$pc = if ($prods.data) { $prods.data.count } else { $prods.count }
Write-Host "PRODUCTOS EN STAGING: $pc"

Write-Host '== 5. Productos con precio en una tienda ficticia =='
if ($fict.Count -gt 0) {
    $sid = $fict[0].id
    Write-Host ("  tienda: {0} (id {1})" -f $fict[0].name, $sid)
    $sp = Invoke-RestMethod -Uri "$base/stores/$sid/products/?page=1&page_size=20" -Headers $ah -TimeoutSec 60
    $spd = if ($sp.data) { $sp.data } else { $sp }
    Write-Host ("PRODUCTOS CON PRECIO EN LA TIENDA: {0}" -f $spd.count)
} else {
    Write-Host '  (sin tienda ficticia en pagina 1; revisar manualmente)'
}

Write-Host '== FIN VERIFICACION PRODUCCION =='
Stop-Transcript | Out-Null
exit
