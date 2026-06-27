# Verificación complementaria: precios por tienda ficticia en producción
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
Start-Transcript -Path "$root\tmp\logs\seed-sevilla-prod2.log" -Force | Out-Null
$base = 'https://bargain-free-api.onrender.com/api/v1'

$tok = Invoke-RestMethod -Method Post -Uri "$base/auth/token/" -ContentType 'application/json' -Body '{"username":"demo","password":"Demo1234!"}' -TimeoutSec 60
$acc = if ($tok.data) { $tok.data.access } else { $tok.access }
$ah = @{ Authorization = "Bearer $acc" }

$st = Invoke-RestMethod -Uri "$base/stores/?lat=37.3891&lng=-5.9945&radius_km=10&page_size=100" -Headers $ah -TimeoutSec 60
$data = if ($st.data) { $st.data } else { $st }
$re = 'SuperGuadalquivir|MercaSur|Hispalis|SuperAzahar|Almacenes Triana|La Giralda|SuperB'
$fict = @($data.results | Where-Object { $_.name -match $re })
Write-Host ("TIENDAS EN RADIO 10KM: {0} | ficticias en pagina: {1}" -f $data.count, $fict.Count)

foreach ($s in ($fict | Select-Object -First 5)) {
    try {
        $sp = Invoke-RestMethod -Uri "$base/stores/$($s.id)/products/?page=1&page_size=5" -Headers $ah -TimeoutSec 60
        $spd = if ($sp.data) { $sp.data } else { $sp }
        Write-Host ("  {0} (id {1}): {2} productos con precio" -f $s.name, $s.id, $spd.count)
    } catch { Write-Host ("  {0}: error {1}" -f $s.name, $_.Exception.Message) }
}
Write-Host '== FIN =='
Stop-Transcript | Out-Null
exit
