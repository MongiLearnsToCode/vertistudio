$ErrorActionPreference = 'Stop'
$nodeVersion = '22.14.0'
$archive = "node-v$nodeVersion-win-x64.zip"
$directory = Join-Path $env:TEMP 'verti-ci-node'
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$checksums = (Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$nodeVersion/SHASUMS256.txt").Content
$line = ($checksums -split "`n" | Where-Object { $_.Trim().EndsWith(" $archive") })
if (@($line).Count -ne 1) { throw 'Missing Node.js checksum' }
$expected = ($line.Trim() -split '\s+')[0]
$zip = Join-Path $directory $archive
Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$nodeVersion/$archive" -OutFile $zip
if ((Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant() -ne $expected) {
  throw 'Node.js download checksum mismatch'
}
Expand-Archive -Force -Path $zip -DestinationPath $directory
$env:Path = "$(Join-Path $directory "node-v$nodeVersion-win-x64");$env:Path"

function Invoke-Npm {
  & npm.cmd @args
  if ($LASTEXITCODE -ne 0) { throw "npm failed with exit code $LASTEXITCODE" }
}
function Invoke-Node {
  & node.exe @args
  if ($LASTEXITCODE -ne 0) { throw "Node.js failed with exit code $LASTEXITCODE" }
}

Invoke-Npm ci
Invoke-Node scripts/check-release-version.js
Invoke-Npm run typecheck
Invoke-Npm run lint
Invoke-Npm run test
Invoke-Npm run release:tools -- --platform win32 --arch x64
$env:CSC_LINK = $env:WIN_CSC_LINK
$env:CSC_KEY_PASSWORD = $env:WIN_CSC_KEY_PASSWORD
Invoke-Npm run build:win -- --x64
Invoke-Node scripts/ci/stage-artifacts.mjs win-x64
