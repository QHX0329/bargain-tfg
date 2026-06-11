$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Start-Transcript -Path "$repo\tmp\logs\seed-sevilla-fase2.log" -Force
Set-Location $repo

Write-Host "== 1. Autoformato Ruff =="
docker compose -f docker-compose.dev.yml exec -T backend ruff format apps/core/management/commands/seed_sevilla.py
docker compose -f docker-compose.dev.yml exec -T backend ruff check apps/core/management/commands/seed_sevilla.py
docker compose -f docker-compose.dev.yml exec -T backend ruff format --check apps/core/management/commands/seed_sevilla.py

Write-Host "== 2. Re-ejecucion tras formatear (debe decir 'ya sembrado') =="
docker compose -f docker-compose.dev.yml exec -T backend python manage.py seed_sevilla

Write-Host "== 3. Verificacion de conteos =="
docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell -c "exec(open('scripts/verify_seed_sevilla.py').read())"

Write-Host "== FIN FASE 2 =="
Stop-Transcript
