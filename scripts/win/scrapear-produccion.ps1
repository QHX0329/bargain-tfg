<#
.SYNOPSIS
    Ejecuta los spiders de BarGAIN contra la base de datos de PRODUCCION y verifica el resultado.

.DESCRIPTION
    Lanza cada spider dentro de un contenedor efimero construido con backend/Dockerfile.dev
    (Django+GIS, Scrapy, Playwright y Chromium ya incluidos; ./scraping montado en /scraping).
    El contenedor apunta a produccion sobrescribiendo DATABASE_URL solo para esa ejecucion;
    no levanta Postgres/Redis locales (--no-deps).

    Antes y despues ejecuta el comando de diagnostico scraping_status para ver que spiders
    persisten datos (y cuales se descartan por no existir su cadena) y el conteo real.

    IMPORTANTE: usa la External Database URL de Render (host con dominio .render.com y SSL).
    La Internal Database URL (host sin dominio) NO es accesible desde tu PC.

.PARAMETER Spiders
    Lista de spiders a ejecutar. Por defecto los 11. Ej: -Spiders mercadona,carrefour

.PARAMETER SkipBuild
    No reconstruir la imagen del backend (usalo si ya esta construida).

.PARAMETER Yes
    No pedir confirmacion interactiva antes de escribir en produccion.

.EXAMPLE
    $env:BARGAIN_PROD_DATABASE_URL = "postgresql://bargain:***@dpg-xxxx-a.frankfurt-postgres.render.com/bargain_n0nw"
    .\scripts\win\scrapear-produccion.ps1

.EXAMPLE
    .\scripts\win\scrapear-produccion.ps1 -Spiders mercadona,carrefour,lidl,dia,alcampo -Yes
#>

[CmdletBinding()]
param(
    [string[]]$Spiders = @(
        'mercadona', 'carrefour', 'lidl', 'dia', 'alcampo',
        'costco', 'hipercor', 'eroski', 'spar', 'consum', 'coviran'
    ),
    [switch]$SkipBuild,
    [switch]$Yes
)

# NOTA: usamos 'Continue', no 'Stop'. docker y Scrapy escriben avisos/logs por stderr;
# con 'Stop' + '2>&1' PowerShell los trata como error terminante (NativeCommandError) y
# aborta el script. Con 'Continue' esos mensajes son texto normal; los fallos reales se
# detectan por $LASTEXITCODE (build) y por los 'throw' de validacion (no dependen de EAP).
$ErrorActionPreference = 'Continue'
$ComposeFile = 'docker-compose.dev.yml'

function Get-LastCount {
    # Devuelve el ultimo valor de una clave de estadisticas de Scrapy en un log (o 0).
    param([string]$LogFile, [string]$Key)
    if (-not (Test-Path $LogFile)) { return 0 }
    $m = Select-String -Path $LogFile -Pattern "'$Key':\s*(\d+)" | Select-Object -Last 1
    if ($m) { return [int]$m.Matches[0].Groups[1].Value }
    return 0
}

# Raiz del repositorio (este script vive en scripts/win/).
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot

if (-not (Test-Path (Join-Path $RepoRoot $ComposeFile))) {
    throw "No encuentro $ComposeFile en $RepoRoot. Ejecuta el script desde el repo BarGAIN."
}

# 1. Obtener la URL de produccion (sin hardcodearla).
$ProdUrl = $env:BARGAIN_PROD_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($ProdUrl)) {
    $secure = Read-Host 'Pega la EXTERNAL Database URL de produccion (Render)' -AsSecureString
    $ProdUrl = [System.Net.NetworkCredential]::new('', $secure).Password
}
if ([string]::IsNullOrWhiteSpace($ProdUrl)) {
    throw 'No se proporciono ninguna URL de base de datos.'
}
if ($ProdUrl -notmatch '^(postgres|postgresql|postgis)://') {
    throw 'La URL no parece una cadena de conexion PostgreSQL valida.'
}

# Aviso si la URL parece la INTERNA de Render (host sin punto -> no resoluble desde el PC).
if ($ProdUrl -match '@([^/:?]+)') {
    $dbHost = $Matches[1]
    if ($dbHost -notlike '*.*') {
        Write-Warning ("El host '$dbHost' no tiene dominio: parece la Internal Database URL de " +
            "Render y NO sera accesible desde tu equipo. Usa la External Database URL.")
    }
}

# Forzar SSL (Render exige SSL en conexiones externas).
if ($ProdUrl -notmatch 'sslmode=') {
    $sep = if ($ProdUrl -match '\?') { '&' } else { '?' }
    $ProdUrl = "$ProdUrl${sep}sslmode=require"
}

$Masked = [regex]::Replace($ProdUrl, '(://[^:]+:)[^@]+(@)', '$1***$2')
Write-Host ''
Write-Host "Destino de escritura (PRODUCCION): $Masked" -ForegroundColor Yellow
Write-Host "Spiders a ejecutar: $($Spiders -join ', ')" -ForegroundColor Yellow

if (-not $Yes) {
    $confirm = Read-Host 'Vas a ESCRIBIR en produccion. Continuar? (escribe si)'
    if ($confirm -ne 'si') { Write-Host 'Cancelado.'; return }
}

# Argumentos comunes de "docker compose run" (array -> se pasan literales al exe nativo).
$RunArgs = @(
    'compose', '-f', $ComposeFile, 'run', '--rm', '--no-deps',
    '-e', "DATABASE_URL=$ProdUrl",
    '-e', 'DJANGO_SETTINGS_MODULE=config.settings.dev',
    'backend'
)

# 2. Construir la imagen del backend (idempotente con cache).
if (-not $SkipBuild) {
    Write-Host "`n[build] Construyendo imagen backend..." -ForegroundColor Cyan
    & docker compose -f $ComposeFile build backend
    if ($LASTEXITCODE -ne 0) { throw "Fallo 'docker compose build backend' (codigo $LASTEXITCODE)." }
}

# 3. Carpeta de logs.
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir = Join-Path $RepoRoot "logs\scraping-prod\$Stamp"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# 4. PREFLIGHT.
Write-Host "`n[preflight] Estado previo en produccion..." -ForegroundColor Cyan
& docker @RunArgs python manage.py scraping_status --title 'PREFLIGHT (antes de scrapear)' 2>&1 |
    Tee-Object -FilePath (Join-Path $LogDir '00-preflight.log')

# 5. Ejecutar cada spider.
$results = @()
foreach ($spider in $Spiders) {
    $log = Join-Path $LogDir "$spider.log"
    Write-Host "`n[spider] $spider -> log: $log" -ForegroundColor Cyan

    & docker @RunArgs sh -lc "cd /scraping && scrapy crawl $spider -s LOG_LEVEL=INFO" 2>&1 |
        Tee-Object -FilePath $log
    $exit = $LASTEXITCODE

    $results += [pscustomobject]@{
        Spider      = $spider
        Exit        = $exit
        Guardados   = (Get-LastCount $log 'item_scraped_count')
        Descartados = (Get-LastCount $log 'item_dropped_count')
    }
}

# 6. POSTFLIGHT.
Write-Host "`n[postflight] Estado final en produccion..." -ForegroundColor Cyan
& docker @RunArgs python manage.py scraping_status --title 'POSTFLIGHT (despues de scrapear)' 2>&1 |
    Tee-Object -FilePath (Join-Path $LogDir '99-postflight.log')

# 7. Resumen.
Write-Host "`n================ RESUMEN ================" -ForegroundColor Green
$results | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "Logs completos en: $LogDir" -ForegroundColor Green
Write-Host ("Nota: un spider con Guardados=0 y Descartados>0 indica que su cadena no existe " +
    "en produccion (el pipeline descarta esos items).") -ForegroundColor DarkYellow
