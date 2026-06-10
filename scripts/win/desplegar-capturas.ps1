# desplegar-capturas.ps1 — Despliegue completo + captura de pantallas para la memoria
# Lanzado por desplegar-capturas.bat (doble clic). Logs en tmp\logs\.

$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
$logDir = Join-Path $root 'tmp\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$statusLog = Join-Path $logDir 'deploy-status.log'
"" | Set-Content $statusLog

function Log($msg) {
    $line = "$([DateTime]::Now.ToString('HH:mm:ss')) $msg"
    Write-Host $line
    Add-Content -Path $statusLog -Value $line
}

function Test-Docker {
    docker info *> $null
    return ($LASTEXITCODE -eq 0)
}

function Test-Http($url) {
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        return $true
    } catch {
        if ($_.Exception.Response) { return $true }  # 401/403/404 = servidor vivo
        return $false
    }
}

function Wait-Http($url, $label, $maxTries = 60, $delaySec = 5) {
    for ($i = 1; $i -le $maxTries; $i++) {
        if (Test-Http $url) { Log "$label responde ($url)"; return $true }
        Start-Sleep -Seconds $delaySec
    }
    Log "ERROR: $label no responde en $url tras $($maxTries * $delaySec)s"
    return $false
}

Log '== Despliegue BarGAIN para capturas de la memoria =='

# --- 1. Docker Desktop -------------------------------------------------------
if (-not (Test-Docker)) {
    Log 'Docker no responde; intentando arrancar Docker Desktop...'
    $dd = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dd) { Start-Process $dd }
    $ok = $false
    for ($i = 1; $i -le 48; $i++) {
        Start-Sleep -Seconds 5
        if (Test-Docker) { $ok = $true; break }
    }
    if (-not $ok) { Log 'ERROR FATAL: Docker no disponible.'; Read-Host 'Enter para salir'; exit 1 }
}
Log 'Docker OK'

# --- 2. Backend + BD + Redis + Celery ---------------------------------------
Log 'Levantando servicios (docker compose up -d)...'
docker compose -f docker-compose.dev.yml up -d --build *>> (Join-Path $logDir 'docker.log')
if (-not (Wait-Http 'http://localhost:8000/api/v1/products/' 'Backend API' 60 5)) {
    Log 'Revisa tmp\logs\docker.log'; Read-Host 'Enter para salir'; exit 1
}

Log 'Aplicando migraciones...'
docker compose -f docker-compose.dev.yml exec -T backend python manage.py migrate --noinput *>> (Join-Path $logDir 'backend-setup.log')

Log 'Seed base (usuarios/tiendas)...'
docker compose -f docker-compose.dev.yml exec -T backend python manage.py seed_data *>> (Join-Path $logDir 'backend-setup.log')

Log 'Datos demo para capturas (capture_setup.py)...'
Get-Content -Raw (Join-Path $root 'scripts\capture_setup.py') |
    docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell *>> (Join-Path $logDir 'capture_setup.log')
Log 'Datos demo OK (detalle en tmp\logs\capture_setup.log)'

# --- 3. Frontends ------------------------------------------------------------
if (-not (Test-Http 'http://localhost:8081')) {
    Log 'Arrancando Expo Web (puerto 8081)...'
    Start-Process powershell -WindowStyle Minimized -ArgumentList '-NoExit', '-Command', `
        "`$env:CI='1'; Set-Location '$root\frontend'; npx expo start --web 2>&1 | Tee-Object -FilePath '$logDir\expo.log'"
} else { Log 'Expo Web ya estaba levantado' }

if (-not (Test-Http 'http://localhost:5173')) {
    Log 'Arrancando portal PYME (Vite, puerto 5173)...'
    Start-Process powershell -WindowStyle Minimized -ArgumentList '-NoExit', '-Command', `
        "Set-Location '$root\frontend\web'; npm run dev 2>&1 | Tee-Object -FilePath '$logDir\vite.log'"
} else { Log 'Portal PYME ya estaba levantado' }

$expoOk = Wait-Http 'http://localhost:8081' 'Expo Web' 60 5
$viteOk = Wait-Http 'http://localhost:5173' 'Portal PYME' 24 5
if (-not ($expoOk -and $viteOk)) { Log 'ERROR: frontends incompletos. Revisa tmp\logs\expo.log / vite.log'; Read-Host 'Enter'; exit 1 }

# --- 4. Playwright + capturas -------------------------------------------------
Log 'Instalando Chromium de Playwright (si falta)...'
npx playwright install chromium *>> (Join-Path $logDir 'playwright-install.log')

Log 'Lanzando captura de pantallas (puede tardar varios minutos)...'
node (Join-Path $root 'scripts\capture-memoria.mjs') 2>&1 | Tee-Object -FilePath (Join-Path $logDir 'capturas.log')
Log "Captura finalizada con codigo $LASTEXITCODE (detalle en tmp\logs\capturas.log)"

Log '== FIN == Los servicios siguen corriendo para reintentos.'
Read-Host 'Pulsa Enter para cerrar esta ventana'
