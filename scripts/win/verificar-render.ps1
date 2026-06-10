# Verifica servicios Render + conectividad real del backend de staging
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\tmp\logs" | Out-Null
Start-Transcript -Path "$root\tmp\logs\render-verify.log" -Force | Out-Null

$key = (Get-Content .env | Where-Object { $_ -match '^RENDER_API_KEY=' }) -replace '^RENDER_API_KEY=', ''
$h = @{ Authorization = "Bearer $key" }
$api = 'https://bargain-free-api.onrender.com/api/v1'

Write-Host '== Servicios en Render =='
try {
    $svcs = Invoke-RestMethod -Uri 'https://api.render.com/v1/services?limit=20' -Headers $h -TimeoutSec 30
    foreach ($it in $svcs) {
        $s = $it.service
        Write-Host ("{0,-8} | {1,-22} | suspendido: {2,-9} | {3}" -f $s.type, $s.name, $s.suspended, $s.serviceDetails.url)
    }
} catch { Write-Host "ERROR API Render: $($_.Exception.Message)" }

Write-Host ''
Write-Host '== Despertando backend (cold start ~1 min) =='
$ok = $false
for ($i = 1; $i -le 14; $i++) {
    try {
        $r = Invoke-RestMethod -Uri "$api/health/" -TimeoutSec 25
        Write-Host ("HEALTH OK: " + ($r | ConvertTo-Json -Compress))
        $ok = $true; break
    } catch { Write-Host "  intento ${i}: aun no responde..." ; Start-Sleep 5 }
}

if ($ok) {
    Write-Host ''
    Write-Host '== Registro + login + lectura de datos en staging =='
    $stamp = Get-Date -Format 'MMddHHmm'
    $email = "verificacion_$stamp@test.bargain.local"
    $body = @{ username = "verif$stamp"; email = $email; password = 'Verif1234!';
               password_confirm = 'Verif1234!'; first_name = 'Verificacion'; last_name = 'Staging' } | ConvertTo-Json
    try {
        Invoke-RestMethod -Method Post -Uri "$api/auth/register/" -ContentType 'application/json' -Body $body -TimeoutSec 30 | Out-Null
        Write-Host "REGISTRO OK: $email"
    } catch { Write-Host "REGISTRO fallo: $($_.Exception.Message)" }
    $login = @{ username = $email; password = 'Verif1234!' } | ConvertTo-Json
    try {
        $tok = Invoke-RestMethod -Method Post -Uri "$api/auth/token/" -ContentType 'application/json' -Body $login -TimeoutSec 30
        $acc = if ($tok.data) { $tok.data.access } else { $tok.access }
        Write-Host 'LOGIN OK (JWT emitido)'
        $ah = @{ Authorization = "Bearer $acc" }
        try {
            $prods = Invoke-RestMethod -Uri "$api/products/?page=1" -Headers $ah -TimeoutSec 30
            $count = if ($prods.data) { $prods.data.count } else { $prods.count }
            Write-Host "PRODUCTOS OK: $count productos en el catalogo de staging"
        } catch { Write-Host "PRODUCTOS fallo: $($_.Exception.Message)" }
    } catch { Write-Host "LOGIN fallo: $($_.Exception.Message)" }
} else {
    Write-Host 'ERROR: el backend no responde tras 14 intentos'
}

Stop-Transcript | Out-Null
Read-Host 'Pulsa Enter para cerrar'
