<#
  prepara-consegna.ps1 - la consegna di ArcTrail 3D per Alessandro fuori casa e per ChatGPT.

    powershell -ExecutionPolicy Bypass -File tools\prepara-consegna.ps1

  (23/09/2026.) Da lanciare a fine di ogni sessione sostanziale, DOPO aver aggiornato
  gli originali in docs/ (e, se serve, dopo tools\genera-apk.ps1).

  COSA FA.
   1. copia i documenti correnti di docs/ in 00-ALESSANDRO-CHATGPT\ (nomi fissi):
        00-LEGGIMI-STATO-PROGETTO.md  <- docs\STATO-RIPRESA.md
        01-RUNBOOK-DEPLOY.md          <- docs\RUNBOOK-DEPLOY-*.md       (il piu' recente)
        02-ALLENAMENTI.md             <- docs\ALLENAMENTI-*.md          (il piu' recente)
        03-PUSH-SAMSUNG.md            <- docs\DIAGNOSI-PUSH-SAMSUNG-*.md (il piu' recente)
      e scrive 04-APK.md leggendo i dati dall'APK vero (non da un documento a mano);
   2. fa CONSEGNA_CHATGPT.zip con quei cinque file e nient'altro;
   3. controlla che ArcTrail3D.apk in Dropbox sia la build corrente
      (versionCode di android\versione-apk.properties, firma ufficiale);
   4. scrive ArcTrail3D-WEB.url;
   5. toglie da Dropbox doppioni e versioni vecchie (APK, ZIP, link, la vecchia
      cartella 00-ALESSANDRO-CHATGPT). Quello che non riconosce NON lo cancella:
      lo segnala;
   6. stampa i tre artefatti.

  In Dropbox\PROGETTI\ArcTrail 3D\ restano SOLO:
      ArcTrail3D.apk   ArcTrail3D-WEB.url   CONSEGNA_CHATGPT.zip
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

$PACKAGE  = 'com.arctrail3d.app'
$WEBAPP   = 'https://arctrail3d.com/app.html'
$Radice   = Split-Path -Parent $PSScriptRoot
$Docs     = Join-Path $Radice 'docs'
$Locale   = Join-Path $Radice '00-ALESSANDRO-CHATGPT'
$RadiceDb = Join-Path $env:USERPROFILE 'Dropbox\PROGETTI'
$Dropbox  = Join-Path $RadiceDb 'ArcTrail 3D'
$Apk      = Join-Path $Dropbox 'ArcTrail3D.apk'
$Url      = Join-Path $Dropbox 'ArcTrail3D-WEB.url'
$Zip      = Join-Path $Dropbox 'CONSEGNA_CHATGPT.zip'
$TENUTI   = @('ArcTrail3D.apk', 'ArcTrail3D-WEB.url', 'CONSEGNA_CHATGPT.zip')

function Passo($t)  { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "   ok  $t" -ForegroundColor Green }
function Avviso($t) { Write-Host "   !!  $t" -ForegroundColor Yellow }
function Stop-Qui($t) { Write-Host ""; Write-Host "   ERRORE: $t" -ForegroundColor Red; exit 1 }
function Nativo([scriptblock]$b) {
  $prima = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { return ((& $b 2>&1 | ForEach-Object { "$_" }) -join "`n") }
  finally { $ErrorActionPreference = $prima }
}
function Piu-Recente($schema) {
  $f = Get-ChildItem (Join-Path $Docs $schema) -File -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
  if (-not $f) { Stop-Qui "nessun documento docs\$schema" }
  return $f.FullName
}

if (-not $Dropbox.StartsWith($RadiceDb, [StringComparison]::OrdinalIgnoreCase)) { Stop-Qui "destinazione Dropbox inattesa." }

Write-Host ""
Write-Host "ArcTrail 3D - consegna per Alessandro e ChatGPT" -ForegroundColor White

# -- APK: i dati veri, letti dal file --------------------------------------------
Passo "1. APK in Dropbox"
$sdk = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) | Where-Object { $_ -and (Test-Path (Join-Path $_ 'build-tools')) } | Select-Object -First 1
if (-not $sdk) { Stop-Qui "SDK Android non trovato (serve aapt/apksigner per controllare l'APK)." }
$bt = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory |
      Where-Object { (Test-Path (Join-Path $_.FullName 'apksigner.bat')) -and (Test-Path (Join-Path $_.FullName 'aapt.exe')) } |
      Sort-Object { [version]($_.Name -replace '[^0-9.]', '') } | Select-Object -Last 1
$java = @($env:JAVA_HOME, "$env:ProgramFiles\Android\Android Studio\jbr") | Where-Object { $_ -and (Test-Path (Join-Path $_ 'bin\java.exe')) } | Select-Object -First 1
if ($java) { $env:JAVA_HOME = $java; $env:PATH = (Join-Path $java 'bin') + ';' + $env:PATH }

if (-not (Test-Path $Apk)) { Stop-Qui "manca $($Apk) - lanciare prima tools\genera-apk.ps1." }
$badging = Nativo { & (Join-Path $bt.FullName 'aapt.exe') dump badging $Apk }
if ($badging -notmatch "package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'") { Stop-Qui "APK illeggibile." }
$apkPkg = $Matches[1]; $apkCode = [int]$Matches[2]; $apkName = $Matches[3]
$vers = @{}
foreach ($r in [IO.File]::ReadAllLines((Join-Path $Radice 'android\versione-apk.properties'))) { if ($r -match '^\s*(\w+)\s*=\s*(.*?)\s*$') { $vers[$Matches[1]] = $Matches[2] } }
if ($apkPkg -ne $PACKAGE) { Stop-Qui "l'APK in Dropbox ha package $apkPkg." }
if ($apkCode -ne [int]$vers['versionCode']) { Stop-Qui "l'APK in Dropbox (versionCode $apkCode) non e' la build corrente ($($vers['versionCode']))." }
$firma = Nativo { & (Join-Path $bt.FullName 'apksigner.bat') verify --print-certs $Apk }
if ($LASTEXITCODE -ne 0 -or $firma -notmatch 'certificate SHA-256 digest:\s*([0-9a-f]{64})') { Stop-Qui "firma dell'APK non valida." }
$sha = (($Matches[1].ToUpper()) -split '(..)' | Where-Object { $_ }) -join ':'
$al = Get-Content (Join-Path $Radice '.well-known\assetlinks.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if (@($al[0].target.sha256_cert_fingerprints) -notcontains $sha) { Stop-Qui "l'APK non e' firmato con la chiave ufficiale (assetlinks.json)." }
$apkFile = Get-Item $Apk
Ok "$apkPkg $apkName (versionCode $apkCode), firma ufficiale, $([math]::Round($apkFile.Length/1KB)) KB"

# -- 1. DOCUMENTI ------------------------------------------------------------------
Passo "2. Documenti correnti -> 00-ALESSANDRO-CHATGPT"
if (-not (Test-Path $Locale)) { New-Item -ItemType Directory $Locale | Out-Null }
$mappa = [ordered]@{
  '00-LEGGIMI-STATO-PROGETTO.md' = (Join-Path $Docs 'STATO-RIPRESA.md')
  '01-RUNBOOK-DEPLOY.md'         = (Piu-Recente 'RUNBOOK-DEPLOY-*.md')
  '02-ALLENAMENTI.md'            = (Piu-Recente 'ALLENAMENTI-*.md')
  '03-PUSH-SAMSUNG.md'           = (Piu-Recente 'DIAGNOSI-PUSH-SAMSUNG-*.md')
}
foreach ($k in $mappa.Keys) {
  Copy-Item $mappa[$k] (Join-Path $Locale $k) -Force
  Ok "$k  <- docs\$(Split-Path -Leaf $mappa[$k])"
}
$compat = 'NO. Il vecchio APK ArcTrail (package e firma mai ritrovati, vedi 00) NON si aggiorna con questo: QUESTO APK E'' PER NUOVE INSTALLAZIONI. NON AGGIORNA IL VECCHIO APK CON FIRMA DIVERSA. Tutti i prossimi APK invece aggiornano questo, finche'' si usa la stessa chiave.'
$apkMd = @"
# ArcTrail 3D - APK

Generato da ``tools\prepara-consegna.ps1`` leggendo l'APK in Dropbox il $((Get-Date).ToString('dd/MM/yyyy HH:mm')).

- **Tecnologia:** Trusted Web Activity (Bubblewrap). L'APK apre $WEBAPP a schermo intero; l'app vera e' il sito, gli aggiornamenti web arrivano da soli.
- **Package:** ``$apkPkg``
- **versionName:** ``$apkName``
- **versionCode:** ``$apkCode``
- **SHA-256 certificato:** ``$sha``
- **Aggiorna il vecchio APK:** $compat
- **Comando di build:** ``powershell -ExecutionPolicy Bypass -File tools\genera-apk.ps1`` (poi ``tools\prepara-consegna.ps1``)
- **Percorso output:** ``$Apk``
"@
[IO.File]::WriteAllText((Join-Path $Locale '04-APK.md'), $apkMd, (New-Object Text.UTF8Encoding($false)))
Ok "04-APK.md  <- dati letti dall'APK"
$attesi = @($mappa.Keys) + '04-APK.md'
Get-ChildItem $Locale | Where-Object { $attesi -notcontains $_.Name } | ForEach-Object { Avviso "in 00-ALESSANDRO-CHATGPT c'e' anche $($_.Name): non entra nello ZIP." }

# -- 2. ZIP ------------------------------------------------------------------------
Passo "3. CONSEGNA_CHATGPT.zip"
$segreto = '(?i)((store|key)Password\s*=\s*\S|BEGIN (RSA |EC )?PRIVATE KEY|"private_key"|AKIA[0-9A-Z]{16})'
# E la password vera della chiave, se il file c'e': non deve comparire da nessuna parte.
$vere = @()
$propFirma = Join-Path $(if ($env:ARCTRAIL3D_FIRMA) { $env:ARCTRAIL3D_FIRMA } else { Join-Path $env:USERPROFILE '.arctrail3d\signing' }) 'keystore.properties'
if (Test-Path $propFirma) {
  foreach ($r in [IO.File]::ReadAllLines($propFirma)) { if ($r -match '^\s*\w*Password\s*=\s*(\S{6,})\s*$') { $vere += $Matches[1] } }
}
foreach ($n in $attesi) {
  $t = [IO.File]::ReadAllText((Join-Path $Locale $n))
  if ($t -match $segreto) { Stop-Qui "$n contiene qualcosa che sembra un segreto." }
  foreach ($v in $vere) { if ($t.Contains($v)) { Stop-Qui "$n contiene la password della chiave." } }
}
Ok "nessun segreto nei documenti"
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
if (-not (Test-Path $Dropbox)) { New-Item -ItemType Directory -Force $Dropbox | Out-Null }
$tmpZip = "$Zip.tmp"
if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force }
$z = [IO.Compression.ZipFile]::Open($tmpZip, 'Create')
try {
  foreach ($n in $attesi) { [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, (Join-Path $Locale $n), $n) }
} finally { $z.Dispose() }
$z = [IO.Compression.ZipFile]::OpenRead($tmpZip)
try { $dentro = @($z.Entries | ForEach-Object { $_.FullName }) } finally { $z.Dispose() }
if ((Compare-Object $dentro $attesi) -ne $null) { Remove-Item $tmpZip -Force; Stop-Qui "lo ZIP non contiene esattamente i cinque documenti." }
Move-Item $tmpZip $Zip -Force
Ok "$($dentro.Count) file: $($dentro -join ', ')"

# -- 4. LINK -----------------------------------------------------------------------
Passo "4. ArcTrail3D-WEB.url"
[IO.File]::WriteAllText($Url, "[InternetShortcut]`r`nURL=$WEBAPP`r`n", (New-Object Text.ASCIIEncoding))
try {
  $r = Invoke-WebRequest -UseBasicParsing $WEBAPP -Method Head -TimeoutSec 20
  Ok "URL=$WEBAPP (risponde $($r.StatusCode))"
} catch { Avviso "URL=$WEBAPP scritto, ma non raggiungibile adesso ($($_.Exception.Message))." }

# -- 5. PULIZIA --------------------------------------------------------------------
Passo "5. Pulizia Dropbox"
$tolti = 0
foreach ($x in Get-ChildItem $Dropbox -Force) {
  if ($TENUTI -contains $x.Name) { continue }
  $noto = ($x.PSIsContainer -and $x.Name -eq '00-ALESSANDRO-CHATGPT') -or
          (-not $x.PSIsContainer -and $x.Extension -in '.apk', '.aab', '.idsig', '.zip', '.url', '.tmp')
  if ($noto) { Remove-Item $x.FullName -Recurse -Force; Ok "rimosso $($x.Name)"; $tolti++ }
  else { Avviso "NON riconosciuto, lasciato dov'e': $($x.Name)" }
}
if (-not $tolti) { Ok "niente da togliere" }

# -- 6. ELENCO ---------------------------------------------------------------------
Write-Host ""
Write-Host "DROPBOX - $Dropbox" -ForegroundColor Green
Get-ChildItem $Dropbox -Force | ForEach-Object {
  Write-Host ("  {0,-22} {1,8} KB  {2}" -f $_.Name, [math]::Round($(if ($_.PSIsContainer) { 0 } else { $_.Length }) / 1KB), $_.LastWriteTime.ToString('dd/MM/yyyy HH:mm'))
}
$mancanti = @($TENUTI | Where-Object { -not (Test-Path (Join-Path $Dropbox $_)) })
if ($mancanti.Count) { Stop-Qui "mancano: $($mancanti -join ', ')" }
Write-Host ""
