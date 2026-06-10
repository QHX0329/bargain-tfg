# Regenera el diagrama de arquitectura desde su fuente PlantUML
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\tmp\logs" | Out-Null
Start-Transcript -Path "$root\tmp\logs\diagrama.log" -Force | Out-Null

$jar = "$root\tmp\plantuml.jar"
if (-not (Test-Path $jar)) {
    Write-Host 'Descargando plantuml.jar...'
    Invoke-WebRequest -Uri 'https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar' -OutFile $jar -TimeoutSec 180
}
Write-Host ("plantuml.jar: " + (Get-Item $jar).Length + " bytes")

$src = "$root\docs\diagramas\arquitectura\arquitectura-capas.puml"
$work = "$root\tmp\arquitectura-capas.puml"
$content = Get-Content $src -Raw -Encoding UTF8

# Si no hay Graphviz, usar el motor smetana (puro Java)
$dot = Get-Command dot -ErrorAction SilentlyContinue
if (-not $dot) {
    Write-Host 'Graphviz no encontrado: usando layout smetana'
    $content = $content -replace '@startuml arquitectura-capas', "@startuml arquitectura-capas`n!pragma layout smetana"
}
Set-Content -Path $work -Value $content -Encoding UTF8

Write-Host 'Renderizando PNG (DPI 200)...'
java -jar $jar -charset UTF-8 -tpng -DPLANTUML_LIMIT_SIZE=16384 -SdefaultFontSize=13 -Sdpi=200 $work -o "$root\tmp\render-diagrama"

$png = "$root\tmp\render-diagrama\arquitectura-capas.png"
if (Test-Path $png) {
    Copy-Item $png "$root\docs\diagramas\arquitectura\arquitectura-capas.png" -Force
    Copy-Item $png "$root\memoriaTFG\Plantilla TfG\diagramas\arquitectura\arquitectura-capas.png" -Force
    Write-Host ("OK: PNG regenerado y copiado (" + (Get-Item $png).Length + " bytes)")
} else {
    Write-Host 'ERROR: no se genero el PNG'
}

Stop-Transcript | Out-Null
Read-Host 'Pulsa Enter para cerrar'
