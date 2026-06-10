# Reinicia Expo web (8081) y portal PYME Vite (5173) para que tomen el nuevo .env.local
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
$logDir = Join-Path $root 'tmp\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Kill-Port($port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
}
function Test-Http($url) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null; return $true }
    catch { if ($_.Exception.Response) { return $true } return $false }
}

Write-Host 'Deteniendo frontends actuales...'
Kill-Port 8081
Kill-Port 5173
Start-Sleep 3

Write-Host 'Arrancando Expo Web (8081) con la nueva configuracion...'
Start-Process powershell -WindowStyle Minimized -ArgumentList '-NoExit', '-Command', `
    "`$env:CI='1'; Set-Location '$root\frontend'; npx expo start --web 2>&1 | Tee-Object -FilePath '$logDir\expo.log'"

Write-Host 'Arrancando portal PYME (5173) con la nueva configuracion...'
Start-Process powershell -WindowStyle Minimized -ArgumentList '-NoExit', '-Command', `
    "Set-Location '$root\frontend\web'; npm run dev 2>&1 | Tee-Object -FilePath '$logDir\vite.log'"

for ($i = 1; $i -le 40; $i++) {
    Start-Sleep 5
    $a = Test-Http 'http://localhost:8081'
    $b = Test-Http 'http://localhost:5173'
    Write-Host "  expo: $a | vite: $b"
    if ($a -and $b) { break }
}
Write-Host 'Frontends reiniciados.'
Read-Host 'Pulsa Enter para cerrar'
