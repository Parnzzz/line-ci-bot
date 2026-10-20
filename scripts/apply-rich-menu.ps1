param(
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$nodeScript = Join-Path $PSScriptRoot "setup-rich-menu.mjs"

if (-not $Apply) {
  node $nodeScript
  exit $LASTEXITCODE
}

$secureToken = Read-Host "LINE channel access token (input is hidden)" -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

try {
  $env:LINE_CHANNEL_ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  node $nodeScript --apply
  if ($LASTEXITCODE -ne 0) {
    throw "Rich menu setup failed with exit code $LASTEXITCODE"
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
  Remove-Item Env:LINE_CHANNEL_ACCESS_TOKEN -ErrorAction SilentlyContinue
  Remove-Variable secureToken -ErrorAction SilentlyContinue
}
