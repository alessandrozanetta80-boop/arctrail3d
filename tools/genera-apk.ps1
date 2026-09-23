<#
  genera-apk.ps1 - costruisce l'APK release di ArcTrail 3D e lo mette in Dropbox.

    powershell -ExecutionPolicy Bypass -File tools\genera-apk.ps1
    powershell -ExecutionPolicy Bypass -File tools\genera-apk.ps1 -SenzaDropbox

  COSA E'. (23/09/2026.) L'APK e' una Trusted Web Activity (progetto `android/`,
  generato da Bubblewrap): un contenitore Android che apre https://arctrail3d.com/app.html
  a schermo intero. L'app vera resta il sito: gli aggiornamenti web arrivano da soli,
  l'APK si rigenera solo se cambiano icona, nome, colori o package.

  COSA FA, IN ORDINE. Prerequisiti (Java 17+, SDK Android, apksigner, aapt, chiave);
  stato git; manifest PWA; package; firma (l'impronta della chiave deve essere quella
  di assetlinks.json); versione (versionCode +1, versionName = data di oggi);
  build release; verifica dell'APK prodotto (firma, package, versione, impronta,
  nessuna chiave dentro); copia in Dropbox come `ArcTrail3D.apk`, al posto del
  precedente, passando da un file temporaneo. In Dropbox resta UN solo APK.

  SE QUALCOSA VA STORTO. Si ferma con un messaggio chiaro, rimette com'era
  `android/versione-apk.properties` e non tocca l'APK gia' in Dropbox.

  LA CHIAVE. Sta in %USERPROFILE%\.arctrail3d\signing\ (o in $env:ARCTRAIL3D_FIRMA):
  `arctrail3d-release.jks` + `keystore.properties`. Mai nel repository, mai in Dropbox,
  mai stampata. Se sparisce, nessun APK futuro potra' aggiornare quelli installati:
  tenerne una copia offline.

  Dopo una build riuscita va committato `android/versione-apk.properties`
  (il versionCode usato non deve tornare indietro).
#>
[CmdletBinding()]
param(
  [switch]$SenzaDropbox
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

$PACKAGE   = 'com.arctrail3d.app'
$ALIAS     = 'arctrail3d'
$WEBAPP    = 'https://arctrail3d.com/app.html'
$Radice    = Split-Path -Parent $PSScriptRoot
$Android   = Join-Path $Radice 'android'
$FileVers  = Join-Path $Android 'versione-apk.properties'
$ApkOut    = Join-Path $Android 'app\build\outputs\apk\release\app-release.apk'
$Dropbox   = Join-Path $env:USERPROFILE 'Dropbox\PROGETTI\ArcTrail 3D'
$ApkNome   = 'ArcTrail3D.apk'
$Firma     = if ($env:ARCTRAIL3D_FIRMA) { $env:ARCTRAIL3D_FIRMA } else { Join-Path $env:USERPROFILE '.arctrail3d\signing' }

function Passo($t)  { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "   ok  $t" -ForegroundColor Green }
function Avviso($t) { Write-Host "   !!  $t" -ForegroundColor Yellow }
function Stop-Qui($t) { Write-Host ""; Write-Host "   ERRORE: $t" -ForegroundColor Red; Write-Host "   L'APK in Dropbox NON e' stato toccato." -ForegroundColor Red; exit 1 }

function Leggi-Prop($file) {
  $h = @{}
  foreach ($r in [IO.File]::ReadAllLines($file)) {
    if ($r -match '^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$') { $h[$Matches[1]] = $Matches[2] }
  }
  return $h
}
function Impronta-Normale($s) { return (($s -replace '[^0-9A-Fa-f]', '').ToUpper()) }

Write-Host ""
Write-Host "ArcTrail 3D - generazione APK release" -ForegroundColor White

# -- 1. PREREQUISITI -----------------------------------------------------------
Passo "1. Prerequisiti"
$java = $null
foreach ($c in @($env:JAVA_HOME, "$env:ProgramFiles\Android\Android Studio\jbr")) {
  if ($c -and (Test-Path (Join-Path $c 'bin\java.exe'))) { $java = $c; break }
}
if (-not $java) { Stop-Qui "Java non trovato (JAVA_HOME o Android Studio\jbr)." }
$jv = (& (Join-Path $java 'bin\java.exe') -version 2>&1 | Out-String)
if ($jv -notmatch 'version "(\d+)') { Stop-Qui "versione di Java illeggibile." }
if ([int]$Matches[1] -lt 17) { Stop-Qui "serve Java 17 o piu' recente (trovato $($Matches[1]))." }
Ok "Java $($Matches[1]) - $java"

$sdk = $null
foreach ($c in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk'))) {
  if ($c -and (Test-Path (Join-Path $c 'build-tools'))) { $sdk = $c; break }
}
if (-not $sdk) { Stop-Qui "SDK Android non trovato." }
$bt = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory |
      Where-Object { (Test-Path (Join-Path $_.FullName 'apksigner.bat')) -and (Test-Path (Join-Path $_.FullName 'aapt.exe')) } |
      Sort-Object { [version]($_.Name -replace '[^0-9.]', '') } | Select-Object -Last 1
if (-not $bt) { Stop-Qui "build-tools con apksigner e aapt non trovati in $sdk." }
$apksigner = Join-Path $bt.FullName 'apksigner.bat'
$aapt      = Join-Path $bt.FullName 'aapt.exe'
$keytool   = Join-Path $java 'bin\keytool.exe'
Ok "SDK $sdk (build-tools $($bt.Name))"

$env:JAVA_HOME = $java
$env:ANDROID_HOME = $sdk
$env:PATH = (Join-Path $java 'bin') + ';' + $env:PATH

$propFirma = Join-Path $Firma 'keystore.properties'
if (-not (Test-Path $propFirma)) { Stop-Qui "chiave release non trovata: manca $propFirma. NON crearne una nuova a caso: la firma ufficiale e' una sola." }
$pf = Leggi-Prop $propFirma
$jks = Join-Path $Firma $pf['storeFile']
if (-not (Test-Path $jks)) { Stop-Qui "keystore non trovato: $jks" }
if ($pf['keyAlias'] -ne $ALIAS) { Stop-Qui "alias della chiave inatteso." }
if ($Firma.StartsWith($Radice, [StringComparison]::OrdinalIgnoreCase) -or $Firma -like '*Dropbox*') {
  Stop-Qui "la chiave non deve stare nel repository ne' in Dropbox ($Firma)."
}
Ok "chiave release presente (fuori dal repository)"

# -- 2. STATO GIT --------------------------------------------------------------
Passo "2. Stato git"
Push-Location $Radice
try {
  $sporchi = @(git status --porcelain -- android .well-known 2>$null | Where-Object { $_ })
  if ($sporchi.Count) { Stop-Qui ("modifiche non committate in android/ o .well-known/:`n" + ($sporchi -join "`n")) }
  $tracciatiSegreti = @(git ls-files 2>$null | Where-Object { $_ -match '\.(apk|aab|jks|keystore|p12|pk8)$' -or $_ -match '(^|/)(keystore|signing)\.properties$' })
  if ($tracciatiSegreti.Count) { Stop-Qui ("file che non devono stare in git: " + ($tracciatiSegreti -join ', ')) }
  $altri = @(git status --porcelain 2>$null | Where-Object { $_ })
  if ($altri.Count) { Avviso "altri file modificati nel repository ($($altri.Count)): non entrano nell'APK." }
  Ok "android/ e .well-known/ puliti, nessun segreto tracciato - ramo $(git branch --show-current)"
} finally { Pop-Location }

# -- 3. MANIFEST PWA -----------------------------------------------------------
Passo "3. Manifest PWA"
$wm = Get-Content (Join-Path $Radice 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($wm.start_url -notmatch 'app\.html$') { Stop-Qui "manifest.json: start_url inatteso ($($wm.start_url))." }
if ($wm.display -ne 'standalone') { Stop-Qui "manifest.json: display non standalone." }
foreach ($i in $wm.icons) { if (-not (Test-Path (Join-Path $Radice $i.src))) { Stop-Qui "icona mancante: $($i.src)" } }
if (-not ($wm.icons | Where-Object { $_.sizes -eq '512x512' })) { Stop-Qui "manca l'icona 512x512." }
Ok "start_url $($wm.start_url), $(@($wm.icons).Count) icone presenti"

# -- 4. PACKAGE ----------------------------------------------------------------
Passo "4. Package"
$twa = Get-Content (Join-Path $Android 'twa-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$gradle = Get-Content (Join-Path $Android 'app\build.gradle') -Raw
if ($twa.packageId -ne $PACKAGE) { Stop-Qui "twa-manifest.json: packageId $($twa.packageId), atteso $PACKAGE." }
if ($gradle -notmatch "applicationId `"$([regex]::Escape($PACKAGE))`"") { Stop-Qui "app/build.gradle: applicationId diverso da $PACKAGE." }
if ($twa.host -ne 'arctrail3d.com' -or $twa.startUrl -ne '/app.html') { Stop-Qui "twa-manifest.json: host o startUrl inattesi." }
Ok "$PACKAGE -> https://$($twa.host)$($twa.startUrl)"

# -- 5. FIRMA ------------------------------------------------------------------
Passo "5. Firma"
# La password passa per una variabile d'ambiente del solo processo, non per la
# riga di comando (che si vede nell'elenco dei processi) e non a schermo.
$env:AT3D_STOREPASS = $pf['storePassword']
try { $elenco = (& $keytool -list -v -keystore $jks -alias $ALIAS -storepass:env AT3D_STOREPASS 2>&1 | Out-String) }
finally { Remove-Item Env:\AT3D_STOREPASS -ErrorAction SilentlyContinue }
if ($elenco -notmatch 'SHA256:\s*([0-9A-F:]{95})') { Stop-Qui "impossibile leggere l'impronta della chiave (password o keystore errati)." }
$impronta = $Matches[1]
$al = Get-Content (Join-Path $Radice '.well-known\assetlinks.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$alImpr = @($al[0].target.sha256_cert_fingerprints)
if ($al[0].target.package_name -ne $PACKAGE) { Stop-Qui "assetlinks.json: package diverso da $PACKAGE." }
if (-not ($alImpr | Where-Object { (Impronta-Normale $_) -eq (Impronta-Normale $impronta) })) {
  Stop-Qui "l'impronta della chiave NON e' quella di assetlinks.json: chiave sbagliata?"
}
Ok "SHA-256 $impronta (uguale ad assetlinks.json)"
try {
  $live = Invoke-WebRequest -UseBasicParsing 'https://arctrail3d.com/.well-known/assetlinks.json' -TimeoutSec 20
  if ((Impronta-Normale $live.Content) -like "*$(Impronta-Normale $impronta)*") { Ok "assetlinks.json online con la stessa impronta" }
  else { Avviso "assetlinks.json online diverso: l'app si aprirebbe con la barra dell'indirizzo." }
} catch { Avviso "assetlinks.json online non raggiungibile ($($_.Exception.Message))." }

# -- 6. VERSIONE ---------------------------------------------------------------
Passo "6. Versione"
$versioneVecchia = [IO.File]::ReadAllText($FileVers)
$pv = Leggi-Prop $FileVers
$codice = [int]$pv['versionCode'] + 1
$pubblicato = Join-Path $Dropbox $ApkNome
if (Test-Path $pubblicato) {
  $b = (& $aapt dump badging $pubblicato 2>$null | Select-Object -First 1)
  if ($b -match "versionCode='(\d+)'" -and [int]$Matches[1] -ge $codice) { $codice = [int]$Matches[1] + 1 }
}
$nome = (Get-Date).ToString('yyyy.MM.dd')
[IO.File]::WriteAllText($FileVers, "versionCode=$codice`nversionName=$nome`n")
$twaTesto = [IO.File]::ReadAllText((Join-Path $Android 'twa-manifest.json'))
$twaTesto2 = $twaTesto -replace '"appVersionCode":\s*\d+', "`"appVersionCode`": $codice" `
                       -replace '"appVersionName":\s*"[^"]*"', "`"appVersionName`": `"$nome`"" `
                       -replace '"appVersion":\s*"[^"]*"', "`"appVersion`": `"$nome`""
[IO.File]::WriteAllText((Join-Path $Android 'twa-manifest.json'), $twaTesto2)
Ok "versionCode $($pv['versionCode']) -> $codice, versionName $nome"

function Annulla-Versione {
  [IO.File]::WriteAllText($FileVers, $versioneVecchia)
  [IO.File]::WriteAllText((Join-Path $Android 'twa-manifest.json'), $twaTesto)
}

# -- 7. BUILD ------------------------------------------------------------------
Passo "7. Build release"
if (Test-Path $ApkOut) { Remove-Item $ApkOut -Force }
Push-Location $Android
try {
  & .\gradlew.bat --no-daemon -q assembleRelease
  $esito = $LASTEXITCODE
} finally { Pop-Location }
if ($esito -ne 0 -or -not (Test-Path $ApkOut)) { Annulla-Versione; Stop-Qui "build fallita (gradle uscito con $esito)." }
Ok "build riuscita: $ApkOut"

# -- 8/9. VERIFICA DELL'APK ----------------------------------------------------
Passo "8. Verifica APK"
$ver = (& $apksigner verify --verbose --print-certs $ApkOut 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $ver -notmatch '(?m)^Verifies') { Annulla-Versione; Stop-Qui "apksigner: firma NON valida.`n$ver" }
if ($ver -notmatch 'certificate SHA-256 digest:\s*([0-9a-f]{64})') { Annulla-Versione; Stop-Qui "apksigner: impronta non trovata." }
if ($Matches[1].ToUpper() -ne (Impronta-Normale $impronta)) { Annulla-Versione; Stop-Qui "l'APK e' firmato con una chiave diversa da quella ufficiale." }
if ($ver -match 'CN=Android Debug') { Annulla-Versione; Stop-Qui "l'APK e' firmato con la chiave di DEBUG." }
Ok "firma valida, chiave ufficiale"
$badging = (& $aapt dump badging $ApkOut 2>&1 | Out-String)
if ($badging -notmatch "package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'") { Annulla-Versione; Stop-Qui "aapt: APK illeggibile." }
if ($Matches[1] -ne $PACKAGE -or [int]$Matches[2] -ne $codice -or $Matches[3] -ne $nome) {
  Annulla-Versione; Stop-Qui "aapt: package/versione inattesi ($($Matches[1]) $($Matches[2]) $($Matches[3]))."
}
Ok "package $PACKAGE, versionCode $codice, versionName $nome"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($ApkOut)
try {
  $voci = @($zip.Entries | ForEach-Object { $_.FullName })
} finally { $zip.Dispose() }
$chiavi = @($voci | Where-Object { $_ -match '\.(jks|keystore|p12|pk8)$' -or $_ -match 'keystore\.properties' })
if ($chiavi.Count) { Annulla-Versione; Stop-Qui "l'APK contiene file di chiave: $($chiavi -join ', ')" }
if (-not ($voci -contains 'AndroidManifest.xml') -or -not ($voci -contains 'classes.dex')) { Annulla-Versione; Stop-Qui "APK incompleto." }
Ok "$($voci.Count) voci, nessuna chiave dentro, $([math]::Round((Get-Item $ApkOut).Length/1KB)) KB"

# -- 10/11/12. DROPBOX ---------------------------------------------------------
if ($SenzaDropbox) {
  Passo "9. Dropbox: saltato (-SenzaDropbox)"
} else {
  Passo "9. Dropbox"
  $radiceDropbox = Join-Path $env:USERPROFILE 'Dropbox\PROGETTI'
  if (-not $Dropbox.StartsWith($radiceDropbox, [StringComparison]::OrdinalIgnoreCase)) { Stop-Qui "destinazione Dropbox inattesa: $Dropbox" }
  if (-not (Test-Path $Dropbox)) { New-Item -ItemType Directory -Force $Dropbox | Out-Null }
  $tmp = Join-Path $Dropbox "$ApkNome.tmp"
  Copy-Item $ApkOut $tmp -Force
  if ((Get-FileHash $tmp).Hash -ne (Get-FileHash $ApkOut).Hash) { Remove-Item $tmp -Force; Stop-Qui "copia in Dropbox corrotta." }
  Move-Item $tmp $pubblicato -Force
  Get-ChildItem $Dropbox -File | Where-Object { $_.Extension -in '.apk', '.aab', '.idsig', '.tmp' -and $_.Name -ne $ApkNome } |
    ForEach-Object { Remove-Item $_.FullName -Force; Avviso "rimosso vecchio $($_.Name)" }
  Ok "$pubblicato"
}

Write-Host ""
Write-Host "APK PRONTO" -ForegroundColor Green
Write-Host "  package      $PACKAGE"
Write-Host "  versionName  $nome"
Write-Host "  versionCode  $codice"
Write-Host "  SHA-256      $impronta"
Write-Host "  apre         $WEBAPP"
if (-not $SenzaDropbox) { Write-Host "  Dropbox      $pubblicato ($([math]::Round((Get-Item $pubblicato).Length/1KB)) KB)" }
Write-Host ""
Write-Host "  Da committare: android/versione-apk.properties e android/twa-manifest.json" -ForegroundColor Yellow
Write-Host "  (versionCode $codice e' ora usato: non deve tornare indietro)."
