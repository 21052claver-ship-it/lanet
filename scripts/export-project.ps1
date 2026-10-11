param(
    [ValidateRange(1, 65535)]
    [int[]]$LocalPorts = @(5173, 8787)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$lnRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$lnRootPrefix = $lnRoot + [System.IO.Path]::DirectorySeparatorChar
$lnExportDir = Join-Path $lnRoot 'exports'
$lnStamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$lnArchivePath = Join-Path $lnExportDir "LaNET-complet-$lnStamp.zip"
$lnPartialPath = Join-Path $lnExportDir "LaNET-complet-$lnStamp.partial.zip"
$lnManifestPath = Join-Path $lnExportDir "LaNET-complet-$lnStamp.manifest.json"
$lnSummaryPath = Join-Path $lnExportDir "LaNET-complet-$lnStamp.verificacio.json"

# A coherent SQLite/R2 snapshot needs all writers to be stopped.
if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $lnListeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -in $LocalPorts })
    if ($lnListeners.Count -gt 0) {
        throw 'Atura npm run dev abans de fer la copia del projecte.'
    }
}

[System.IO.Directory]::CreateDirectory($lnExportDir) | Out-Null
if ([System.IO.File]::Exists($lnArchivePath) -or [System.IO.File]::Exists($lnPartialPath)) {
    throw 'Ja existeix un paquet amb aquesta marca horaria. Torna-ho a executar.'
}

$lnExcluded = @('node_modules', 'exports', 'dist-pages', '.git', '.agents', '.codex', '.aws', '.cache', '.cloud', '.dev.vars', '.wrangler/tmp', 'output/api-tests', 'output/tools',
    'output/revisio-v3/audio/window.wav', 'output/revisio-v3/audio/library.wav', 'output/revisio-v3/audio/cafe.wav', 'output/revisio-v3/audio/night.wav', 'output/revisio-v3/audio/garden.wav', 'CONTINGUT-ZIP.json')
$lnQueue = [System.Collections.Generic.Stack[string]]::new()
$lnQueue.Push($lnRoot)
$lnFiles = [System.Collections.Generic.List[object]]::new()

while ($lnQueue.Count -gt 0) {
    $lnDirectory = $lnQueue.Pop()
    foreach ($lnItem in Get-ChildItem -LiteralPath $lnDirectory -Force) {
        $lnAbsolute = [System.IO.Path]::GetFullPath($lnItem.FullName)
        if (-not $lnAbsolute.StartsWith($lnRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Fitxer fora del projecte: $lnAbsolute"
        }
        $lnRelative = $lnAbsolute.Substring($lnRootPrefix.Length).Replace('\', '/')
        if ($lnExcluded -contains $lnRelative -or ($lnItem.Name -match '^\.env(?:\.|$)|^\.dev\.vars(?:\.|$)' -and $lnItem.Name -notmatch '\.example$') -or $lnItem.Name -match '^(client_secret|oauth-client|google-credentials).*\.json$') { continue }
        if ($lnItem.PSIsContainer) {
            $lnQueue.Push($lnAbsolute)
        } else {
            $lnFiles.Add([pscustomobject]@{
                path = $lnRelative
                bytes = [long]$lnItem.Length
                sha256 = (Get-FileHash -LiteralPath $lnAbsolute -Algorithm SHA256).Hash.ToLowerInvariant()
            })
        }
    }
}

$lnSortedFiles = @($lnFiles | Sort-Object path)
foreach ($lnRequired in @('package.json', 'package-lock.json', 'src/App.jsx', 'DESIGN.md',
    'shared/music-catalog.js', 'shared/music-tracks.json', 'scripts/import-study-music.py',
    'public/audio/CREDITS.txt', 'docs/PLA-MUSICA.md', 'output/music-library/audio-import.json',
    'scripts/beta-content.mjs', 'scripts/prepare-beta.mjs', 'scripts/verify-beta-data.mjs',
    'migrations/0014_banner_archive.sql', 'tests/beta-content.test.js', 'docs/PLA-BETA.md',
    'output/beta-ready/remote-data.json', 'output/beta-ready/local-data.json',
    'backups/lanet-before-beta-2026-10-11.sql', 'backups/lanet-after-beta-2026-10-11.sql',
    'migrations/0013_welcome_cakes.sql', 'tests/welcome-cakes.test.js', 'scripts/verify-welcome-migration.mjs',
    'docs/PLA-PASTISSOS-BENVINGUDA.md', 'docs/historic/VERIFICATION-2026-10-11-own-address.md',
    'backups/lanet-before-welcome-2026-10-11.sql', 'backups/lanet-after-welcome-2026-10-11.sql',
    'output/welcome-cakes/publicacio-verificada.json', 'output/welcome-cakes/local-migration.json',
    'output/welcome-cakes/remote-migration.json', 'output/welcome-cakes/unit.txt', 'output/welcome-cakes/api-result.json',
    'output/welcome-cakes/typecheck.txt', 'output/welcome-cakes/final-lint.txt', 'output/welcome-cakes/public-smoke.json',
    'output/welcome-cakes/navegador-verificat.json', 'output/welcome-cakes/moneder-publicat.png',
    'cloudflare-target.json', 'wrangler.jsonc', 'wrangler.worker-archive.jsonc', 'wrangler.redirect.jsonc',
    'worker/pages-entry.js', 'scripts/pages-utils.mjs', 'scripts/build-pages.mjs', 'scripts/deploy-pages.mjs',
    'scripts/configure-pages-google.mjs', 'scripts/verify-pages.mjs', 'tests/pages-entry.test.js', 'tests/pages-google-configure.test.js',
    'docs/PLA-MARCA-LANET.md', 'docs/historic/VERIFICATION-2026-10-11-google-only.md',
    'output/brand-lanet/publicacio-verificada.json', 'output/brand-lanet/verificacio-final.json',
    'output/brand-lanet/recursos-preservats.json', 'output/brand-lanet/pages-deployments.json',
    'output/brand-lanet/api-result.json', 'output/brand-lanet/unit.txt', 'output/brand-lanet/typecheck.txt',
    'output/brand-lanet/public-smoke.json', 'output/brand-lanet/redirect-smoke.json',
    'output/brand-lanet/navegador-verificat.json', 'output/brand-lanet/perfil-escriptori.png', 'output/brand-lanet/perfil-mobil.png',
    'TRASLLAT.md', 'wrangler.local.jsonc', 'backups/la-net-local.sql', 'backups/la-net-local-2026-10-10.sql', 'backups/la-net-local-2026-10-10-cartell.sql', 'backups/la-net-local-2026-10-10-depuracio.sql', 'backups/la-net-local-2026-10-10-clean.sql',
    'design/comparador/la-net-comparador.html', 'design/comparador/fidelitat-implementacio.html',
    'docs/PLA-PERFECCIO.md', 'docs/PLA-DETALL.md', 'docs/VERIFICATION.md', 'src/art.jsx', 'src/fidelity.css',
    'shared/search.js', 'tests/search.test.js', 'scripts/measure-fidelity.py',
    'docs/SEGUIMENT.json', 'docs/CHECKLIST.md', 'docs/PLA-MESTRE.md', 'docs/HISTORIAL-CANVIS.md', 'docs/PUBLICACIO.md', 'src/revision.css',
    'docs/PLA-GOOGLE-UNIC.md', 'docs/historic/VERIFICATION-2026-10-11-bakery-transparent.md',
    'migrations/0012_google_only_sessions.sql', 'worker/legacy-entry.js', 'wrangler.legacy.jsonc',
    'scripts/verify-auth-migration.mjs', 'scripts/verify-public.mjs', 'scripts/track-task.mjs',
    'tests/auth-policy.test.js', 'tests/legacy-entry.test.js', 'tests/task-tracker.test.js',
    'backups/la-net-local-2026-10-11-google-only.sql', 'output/google-only/verificacio-final.json',
    'output/google-only/publicacio-verificada.json', 'output/google-only/migracio-local-verificada.json',
    'output/google-only/migracio-remota-verificada.json', 'output/google-only/copia-sql-verificada.json',
    'output/google-only/copia-d1-r2-verificada.json', 'output/google-only/api-result.json',
    'output/google-only/navegador-verificat.json', 'output/google-only/perfil-mobil.jpg',
    'output/google-only/perfil-escriptori.jpg', 'output/google-only/login-mobil.jpg',
    'output/google-only/login-escriptori.jpg', 'output/google-only/public-smoke.json',
    'output/google-only/lliurament-base-verificat.json',
    'docs/PLA-PASTISSERIA-TRANSPARENT.md', 'design/bakery-interior-transparent-v1-prompt.txt',
    'public/images/bakery-interior-transparent-v1.png', 'public/images/bakery-interior-transparent-v1.webp',
    'output/bakery-transparent/art-verificat.json', 'output/bakery-transparent/verificacio-final.json',
    'output/bakery-transparent/navegador-verificat.json', 'output/bakery-transparent/interior-mobil.jpg',
    'output/bakery-transparent/interior-escriptori.jpg', 'output/bakery-transparent/publicacio-verificada.json',
    'output/google-auth/entrada-real-verificada.json', 'output/google-auth/perfil-google-verificat.jpg',
    'tests/google-runtime.test.js', 'docs/PLA-CLOUDFLARE-LANET.md',
    'docs/PLA-PASTISSERIA-SIMPLE.md', 'docs/historic/VERIFICATION-2026-10-10-welcome-redesign.md',
    'public/images/bakery-simple-v1.png', 'public/images/bakery-simple-v1.webp', 'design/bakery-simple-v1-prompt.txt',
    'backups/la-net-local-2026-10-10-bakery-simple.sql', 'output/bakery-simple/verificacio-local.json',
    'output/bakery-simple/ui-verificada.json', 'output/bakery-simple/components-offline.html',
    'output/bakery-simple/fotogrames.json', 'output/bakery-simple/fotogrames-offline.png',
    'output/bakery-simple/art-verificat.json', 'output/bakery-simple/estils-verificats.json',
    'output/bakery-simple/recursos-preservats.json', 'output/bakery-simple/api-result.json',
    'output/bakery-simple/copia-sql-verificada.json', 'output/bakery-simple/copia-d1-r2-verificada.json',
    'output/bakery-simple/cloud-deploy.txt', 'output/bakery-simple/publicacio-verificada.json',
    'docs/PLA-BENVINGUDA.md', 'docs/historic/VERIFICATION-2026-10-10-assessment-model.md',
    'src/Auth.jsx', 'src/auth-session.js', 'src/welcome.css', 'tests/auth-session.test.js',
    'public/images/welcome-study-v1.png', 'public/images/welcome-study-v1.webp', 'design/welcome-study-v1-prompt.txt',
    'backups/la-net-local-2026-10-10-welcome.sql', 'output/welcome-redesign/verificacio-local.json',
    'output/welcome-redesign/ui-verificada.json', 'output/welcome-redesign/welcome-offline.html',
    'output/welcome-redesign/estils-verificats.json', 'output/welcome-redesign/art-verificat.json',
    'output/welcome-redesign/recursos-preservats.json', 'output/welcome-redesign/api-result.json',
    'output/welcome-redesign/copia-sql-verificada.json', 'output/welcome-redesign/copia-d1-r2-verificada.json',
    'output/welcome-redesign/cloud-deploy.txt', 'output/welcome-redesign/publicacio-verificada.json',
    'docs/PLA-AVALUACIO.md', 'docs/historic/VERIFICATION-2026-10-10-banner-policy.md',
    'shared/assessments.js', 'worker/assessment-input.js', 'migrations/0011_assessment_model.sql',
    'src/components/AssessmentEditor.jsx', 'src/assessments.css', 'tests/assessments.test.js',
    'backups/la-net-local-2026-10-10-assessment-model.sql', 'output/assessment-model/verificacio-local.json',
    'output/assessment-model/api-result.json', 'output/assessment-model/ui-verificada.json', 'output/assessment-model/recursos-preservats.json',
    'output/assessment-model/dades-local-preservades.json', 'output/assessment-model/dades-cloud-preservades.json',
    'output/assessment-model/copia-sql-verificada.json', 'output/assessment-model/copia-d1-r2-verificada.json',
    'output/assessment-model/copia-cloud-before.json', 'output/assessment-model/copia-cloud-after.json',
    'output/assessment-model/cloud-deploy.txt', 'output/assessment-model/publicacio-verificada.json',
    'docs/PLA-CARTELL-FIX.md', 'docs/historic/VERIFICATION-2026-10-10-google.md', 'migrations/0010_banner_minimum.sql',
    'backups/la-net-local-2026-10-10-banner-policy.sql', 'output/banner-policy/verificacio-local.json',
    'output/banner-policy/api-result.json', 'output/banner-policy/ui-verificada.json', 'output/banner-policy/recursos-preservats.json',
    'output/banner-policy/dades-preservades.json', 'output/banner-policy/copia-sql-verificada.json',
    'output/banner-policy/copia-d1-r2-verificada.json', 'output/banner-policy/copia-cloud-verificada.json',
    'output/banner-policy/cloud-deploy.txt', 'output/banner-policy/publicacio-verificada.json',
    'docs/PLA-GOOGLE.md', 'docs/GOOGLE-OAUTH.md', 'docs/historic/VERIFICATION-2026-10-10-bakery-pace.md',
    'worker/google.js', 'worker/google-token.js', 'worker/google-config.js', 'migrations/0009_google_auth.sql',
    'shared/google-auth.js', 'src/components/GoogleSignIn.jsx', 'src/google.css', 'scripts/configure-google.mjs',
    'tests/google-auth.test.js', 'tests/google-token.test.js', 'tests/google-configure.test.js', 'tests/helpers/d1.js',
    'public/licenses/jose-MIT.txt', 'backups/la-net-local-2026-10-10-google.sql',
    'output/google-auth/verificacio-local.json', 'output/google-auth/api-result.json',
    'output/google-auth/ui-verificada.json', 'output/google-auth/recursos-preservats.json',
    'output/google-auth/dades-preservades.json', 'output/google-auth/copia-sql-verificada.json',
    'output/google-auth/copia-d1-r2-verificada.json', 'output/google-auth/copia-cloud-verificada.json',
    'output/google-auth/cloud-deploy.txt', 'output/google-auth/publicacio-verificada.json', 'output/google-auth/activacio.json',
    'src/components/GradePrivacy.jsx', 'src/components/OptionsMenu.jsx', 'src/clean.css', 'docs/PLA-UI-CLEAN.md',
    'src/bakery.css', 'docs/PLA-PASTISSERIA-ANIMACIO.md', 'output/bakery-motion/verificacio-local.json',
    'docs/PLA-PASTISSERIA-EXTERIOR.md', 'public/images/bakery-exterior-transparent-v1.png',
    'backups/la-net-local-2026-10-10-exterior.sql', 'output/bakery-exterior/copia-d1-r2-verificada.json',
    'design/bakery-exterior-transparent-prompt.txt', 'output/bakery-exterior/verificacio-local.json',
    'output/bakery-exterior/imatge-verificada.json', 'output/bakery-exterior/publicacio-recursos.json',
    'output/bakery-exterior/publicacio-navegador.json', 'output/bakery-exterior/copia-sql-verificada.json',
    'docs/PLA-ANUNCIS-IDENTITAT.md', 'migrations/0008_banner_identity.sql',
    'docs/PLA-PASTISSERIA-COREOGRAFIA.md', 'docs/historic/VERIFICATION-2026-10-10-banner-identity.md',
    'src/components/BakerPuppet.jsx', 'src/components/BakerScene.jsx', 'src/components/CakeFlight.jsx',
    'src/baker-rig.json', 'public/images/baker-rig-v4.png', 'design/baker-rig-v4.json', 'design/baker-rig-v4-prompt.txt',
    'docs/PLA-PASTISSERIA-RITME.md', 'docs/historic/VERIFICATION-2026-10-10-bakery-joints.md',
    'backups/la-net-local-2026-10-10-bakery-pace.sql',
    'output/bakery-pace/verificacio-local.json', 'output/bakery-pace/temporitzacio-verificada.json',
    'output/bakery-pace/unions-verificades.json', 'output/bakery-pace/components-verificats.json',
    'output/bakery-pace/oclusio-peus.json', 'output/bakery-pace/regressions-preservades.json',
    'output/bakery-pace/final/intermedis.png', 'output/bakery-pace/final/renders.json',
    'output/bakery-pace/fotogrames-offline.png', 'output/bakery-pace/cloud-deploy.txt',
    'output/bakery-pace/copia-sql-verificada.json', 'output/bakery-pace/copia-d1-r2-verificada.json',
    'docs/PLA-PASTISSERIA-UNIONS.md', 'docs/historic/VERIFICATION-2026-10-10-bakery-choreography.md',
    'backups/la-net-local-2026-10-10-bakery-joints.sql',
    'output/bakery-joints/verificacio-local.json', 'output/bakery-joints/unions-verificades.json',
    'output/bakery-joints/components-verificats.json', 'output/bakery-joints/oclusio-peus.json',
    'output/bakery-joints/regressions-preservades.json', 'output/bakery-joints/final/intermedis.png',
    'output/bakery-joints/final/renders.json', 'output/bakery-joints/fotogrames-offline.png',
    'output/bakery-joints/cloud-deploy.txt', 'output/bakery-joints/copia-sql-verificada.json',
    'output/bakery-joints/copia-d1-r2-verificada.json',
    'backups/la-net-local-2026-10-10-bakery-choreography.sql',
    'output/bakery-choreography/verificacio-local.json', 'output/bakery-choreography/components-verificats.json',
    'output/bakery-choreography/oclusio-peus.json', 'output/bakery-choreography/regressions-preservades.json',
    'output/bakery-choreography/fotogrames-offline.png', 'output/bakery-choreography/fotogrames.json',
    'output/bakery-choreography/api-result.json', 'output/bakery-choreography/cloud-deploy.txt',
    'output/bakery-choreography/copia-sql-verificada.json', 'output/bakery-choreography/copia-d1-r2-verificada.json',
    'backups/la-net-local-2026-10-10-banner-identity.sql', 'output/banner-identity/copia-sql-verificada.json',
    'output/banner-identity/copia-d1-r2-verificada.json', 'output/banner-identity/migracio-local-verificada.json',
    'output/banner-identity/migracio-publica.txt', 'output/banner-identity/cloud-deploy.txt',
    'output/banner-identity/api-result.json', 'output/banner-identity/components-verificats.json',
    'output/banner-identity/verificacio-local.json', 'output/banner-identity/regressions-preservades.json',
    'docs/PLA-ICONES-TRANSPARENTS.md', 'src/art-polish.css', 'src/transparent-art.json',
    'public/images/ui/cake-alpha-v1.png', 'public/images/ui/megaphone-alpha-v1.png', 'public/images/ui/document-alpha-v1.png',
    'design/ui-alpha/RECURSOS.json', 'design/ui-alpha/cake-prompt.txt', 'design/ui-alpha/megaphone-prompt.txt', 'design/ui-alpha/document-prompt.txt',
    'backups/la-net-local-2026-10-10-icon-alpha.sql', 'output/icon-alpha/copia-sql-verificada.json',
    'output/icon-alpha/copia-d1-r2-verificada.json', 'output/icon-alpha/alfa-verificat.json',
    'output/icon-alpha/component-verificat.json', 'output/icon-alpha/integracio-compilada.json',
    'output/icon-alpha/regressions-preservades.json', 'output/icon-alpha/mostra-component.png',
    'output/icon-alpha/verificacio-local.json', 'output/icon-alpha/cloud-deploy.txt',
    'docs/PLA-SELECTORS-VISUALS.md', 'src/tabs.css', 'backups/la-net-local-2026-10-10-selectors.sql',
    'output/view-selectors/contrast.json', 'output/view-selectors/regressions-preservades.json',
    'output/view-selectors/copia-sql-verificada.json', 'output/view-selectors/copia-d1-r2-verificada.json',
    'output/view-selectors/cloud-deploy.txt', 'output/view-selectors/verificacio-local.json',
    'docs/PLA-CARTELL-VISUAL.md', 'shared/banner.js', 'tests/banner.test.js', 'src/board.css',
    'src/banner-image.js', 'src/components/BannerComposer.jsx', 'src/components/BannerImageEditor.jsx',
    'backups/la-net-local-2026-10-10-cartell-visual.sql', 'output/board-creative/verificacio-local.json',
    'output/board-creative/retall-pixels.json', 'output/board-creative/imatge-sencera-pixels.json',
    'output/board-creative/interaccions.json', 'output/board-creative/responsive-formulari.json',
    'output/board-creative/publicacio-recursos.json', 'output/board-creative/publicacio-navegador.json',
    'output/board-creative/copia-sql-verificada.json', 'output/board-creative/copia-d1-r2-verificada.json',
    'output/bakery-motion/integracio-compilada.json', 'output/bakery-motion/publicacio-recursos.json',
    'output/bakery-motion/publicacio-navegador.json', 'output/bakery-motion/copia-sql-verificada.json',
    'output/ui-clean/responsive.json', 'output/ui-clean/interaccions.json', 'output/ui-clean/copia-sql-verificada.json',
    'output/ui-clean/publicacio-recursos.json', 'output/ui-clean/publicacio-navegador.json',
    'shared/preferences.js', 'migrations/0006_user_preferences.sql', 'migrations/0007_agenda.sql',
    'public/audio/LICENSE.txt', 'public/audio/window.ogg', 'public/audio/library.ogg', 'public/audio/cafe.ogg', 'public/audio/night.ogg', 'public/audio/garden.ogg',
    'design/RECURSOS-V3.md', 'public/licenses/PDFJS-Apache-2.0.txt', 'public/licenses/Nunito-OFL.txt', 'public/licenses/NunitoSans-OFL.txt',
    'public/images/baker-poses-padded-v3.png', 'public/images/bakery-interior-stage-v3.png', 'public/images/references/cartell-fusta-original.png',
    'output/fidelity/checks-detall.json', 'output/fidelity/mesures-titols.json',
    'output/fidelity/checks-navegador.json', 'output/fidelity/api-result.json',
    'output/fidelity/01-horari-desktop.jpg', 'output/fidelity/02-apunts-desktop.jpg',
    'output/fidelity/03-plusos-desktop.jpg', 'output/fidelity/04-notes-desktop.jpg',
    'output/fidelity/05-estudi-desktop.jpg', 'output/fidelity/06-comunitat-desktop.jpg',
    'output/fidelity/07-pastisseria-desktop.jpg')) {
    if (-not ($lnSortedFiles.path -contains $lnRequired)) {
        throw "Falta un fitxer necessari: $lnRequired"
    }
}
if (-not @($lnSortedFiles | Where-Object { $_.path.StartsWith('.wrangler/state/v3/r2/la-net-files/blobs/') }).Count) {
    throw 'No hi ha fitxers R2 locals al paquet.'
}

$lnPlan = Get-Content -LiteralPath (Join-Path $lnRoot 'docs/SEGUIMENT.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$lnVerifiedTasks = @($lnPlan.tasks | Where-Object { $_.status -eq 'verified' })
foreach ($lnTask in $lnVerifiedTasks) {
    foreach ($lnEvidence in $lnTask.evidence) {
        if (-not ($lnSortedFiles.path -contains $lnEvidence)) {
            throw "Evidencia verificada absent del paquet: $($lnTask.id) / $lnEvidence"
        }
    }
}
$lnForbidden = @($lnSortedFiles | Where-Object {
    $_.path -match '(^|/)(node_modules|\.cloud|\.git|\.agents|\.codex|\.aws|\.cache)(/|$)|^output/api-tests/' -or
    ($_.path -match '(^|/)\.env(?:\.|$)|(^|/)\.dev\.vars(?:\.|$)' -and $_.path -notmatch '\.example$') -or
    $_.path -match '(^|/)(client_secret|oauth-client|google-credentials).*\.json$'
})
if ($lnForbidden.Count) { throw 'El paquet inclou un cami privat o reinstal·lable exclos.' }

$lnManifest = [ordered]@{
    project = 'La Net'
    snapshot = (Get-Date).ToUniversalTime().ToString('o')
    root = 'LaNET/'
    excluded = $lnExcluded
    file_count = $lnSortedFiles.Count
    uncompressed_bytes = [long](($lnSortedFiles | Measure-Object bytes -Sum).Sum)
    files = $lnSortedFiles
}
$lnManifestJson = $lnManifest | ConvertTo-Json -Depth 8
$lnUtf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($lnManifestPath, $lnManifestJson, $lnUtf8)

$lnArchive = [System.IO.Compression.ZipFile]::Open($lnPartialPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($lnFile in $lnSortedFiles) {
        $lnAbsolute = Join-Path $lnRoot ($lnFile.path.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $lnArchive, $lnAbsolute, ('LaNET/' + $lnFile.path),
            [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    $lnManifestEntry = $lnArchive.CreateEntry('LaNET/CONTINGUT-ZIP.json')
    $lnWriter = [System.IO.StreamWriter]::new($lnManifestEntry.Open(), $lnUtf8)
    try { $lnWriter.Write($lnManifestJson) } finally { $lnWriter.Dispose() }
} finally { $lnArchive.Dispose() }

$lnVerifiedFiles = 0
$lnArchive = [System.IO.Compression.ZipFile]::OpenRead($lnPartialPath)
try {
    if ($lnArchive.Entries.Count -ne ($lnSortedFiles.Count + 1)) {
        throw 'El nombre de fitxers del ZIP no coincideix amb el manifest.'
    }
    foreach ($lnFile in $lnSortedFiles) {
        $lnEntry = $lnArchive.GetEntry('LaNET/' + $lnFile.path)
        if (-not $lnEntry -or $lnEntry.Length -ne $lnFile.bytes) {
            throw "Mida incorrecta o fitxer absent: $($lnFile.path)"
        }
        $lnStream = $lnEntry.Open()
        $lnHasher = [System.Security.Cryptography.SHA256]::Create()
        try {
            $lnHash = [System.BitConverter]::ToString($lnHasher.ComputeHash($lnStream)).Replace('-', '').ToLowerInvariant()
        } finally {
            $lnStream.Dispose()
            $lnHasher.Dispose()
        }
        if ($lnHash -ne $lnFile.sha256) { throw "Integritat incorrecta: $($lnFile.path)" }
        $lnVerifiedFiles++
    }
    $lnManifestReader = [System.IO.StreamReader]::new($lnArchive.GetEntry('LaNET/CONTINGUT-ZIP.json').Open())
    try {
        if ($lnManifestReader.ReadToEnd() -ne $lnManifestJson) { throw 'Manifest incorrecte dins del ZIP.' }
    } finally { $lnManifestReader.Dispose() }
} finally { $lnArchive.Dispose() }

Move-Item -LiteralPath $lnPartialPath -Destination $lnArchivePath
$lnSummary = [ordered]@{
    archive = $lnArchivePath
    bytes = (Get-Item -LiteralPath $lnArchivePath).Length
    sha256 = (Get-FileHash -LiteralPath $lnArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    verified_files = $lnVerifiedFiles
    zip_entries = $lnVerifiedFiles + 1
    verified_tasks = $lnVerifiedTasks.Count
    all_plan_evidence_included = $true
    forbidden_paths_absent = $true
    integrity = 'All file sizes and SHA-256 hashes match; manifest matches.'
    manifest = $lnManifestPath
}
$lnSummaryJson = $lnSummary | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($lnSummaryPath, $lnSummaryJson, $lnUtf8)
Write-Output $lnSummaryJson
