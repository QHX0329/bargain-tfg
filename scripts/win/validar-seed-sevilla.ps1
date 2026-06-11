$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
New-Item -ItemType Directory -Force -Path "$repo\tmp\logs" | Out-Null
Start-Transcript -Path "$repo\tmp\logs\seed-sevilla-local.log" -Force
Set-Location $repo

Write-Host "== 1. Comprobando Docker =="
$ok = $false
for ($i = 0; $i -lt 24; $i++) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    if ($i -eq 0) {
        Write-Host "  arrancando Docker Desktop..."
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    }
    Start-Sleep -Seconds 10
}
if (-not $ok) { Write-Host "ERROR: Docker no disponible"; Stop-Transcript; exit 1 }

Write-Host "== 2. Levantando postgres + redis + backend =="
docker compose -f docker-compose.dev.yml up -d postgres redis backend 2>&1 | Select-Object -Last 3

Write-Host "== 3. Esperando al backend =="
$up = $false
for ($i = 0; $i -lt 30; $i++) {
    docker compose -f docker-compose.dev.yml exec -T backend python -c "print('backend up')" 2>$null
    if ($LASTEXITCODE -eq 0) { $up = $true; break }
    Start-Sleep -Seconds 5
}
if (-not $up) { Write-Host "ERROR: backend no responde"; Stop-Transcript; exit 1 }

Write-Host "== 4. Lint Ruff del comando =="
docker compose -f docker-compose.dev.yml exec -T backend ruff check apps/core/management/commands/seed_sevilla.py
docker compose -f docker-compose.dev.yml exec -T backend ruff format --check apps/core/management/commands/seed_sevilla.py

Write-Host "== 5. Migraciones =="
docker compose -f docker-compose.dev.yml exec -T backend python manage.py migrate --noinput 2>&1 | Select-Object -Last 2

Write-Host "== 6. seed_sevilla (primera ejecucion) =="
docker compose -f docker-compose.dev.yml exec -T backend python manage.py seed_sevilla

Write-Host "== 7. seed_sevilla (segunda ejecucion: idempotencia) =="
docker compose -f docker-compose.dev.yml exec -T backend python manage.py seed_sevilla

Write-Host "== 8. Verificacion de conteos =="
Get-Content -Raw scripts/verify_seed_sevilla.py | docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell

Write-Host "== FIN VALIDACION LOCAL =="
Stop-Transcript
