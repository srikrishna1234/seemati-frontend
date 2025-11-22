param(
  [Parameter(Mandatory=$true)][string]$ProductId,
  [Parameter(Mandatory=$true)][string]$ImagePath,
  [Parameter(Mandatory=$true)][string]$AdminToken,
  [Parameter()][string]$ServerUrl = "http://localhost:4000"
)

function Fail($msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

if (!(Test-Path $ImagePath)) {
  Fail "Image file not found: $ImagePath"
}

Write-Host "Uploading image..." -ForegroundColor Cyan

# ---- UPLOAD IMAGE ----
$uploadCmd = @(
  "curl.exe",
  "--silent", "--show-error",
  "-X", "POST",
  "$ServerUrl/admin-api/products/upload",
  "--form", "image=@$ImagePath"
)

$upload = & $uploadCmd[0] $uploadCmd[1..($uploadCmd.Length-1)] 2>&1
if ($LASTEXITCODE -ne 0) { Fail "Upload failed: $upload" }

try {
  $uploadJson = $upload | ConvertFrom-Json
} catch {
  Fail "Upload response is not JSON: $upload"
}

# Extract URL
if ($uploadJson.file -and $uploadJson.file.url) {
  $imgUrl = $uploadJson.file.url
} elseif ($uploadJson[0] -and $uploadJson[0].url) {
  $imgUrl = $uploadJson[0].url
} else {
  Fail "Uploaded URL not found in response."
}

Write-Host "Uploaded: $imgUrl" -ForegroundColor Green

# ---- PATCH PRODUCT (push image) ----
Write-Host "Attaching image to product..." -ForegroundColor Cyan

$payload = @{
  '$push' = @{
    images = $imgUrl
  }
} | ConvertTo-Json -Depth 5

$tempJson = Join-Path $env:TEMP "patch-$([guid]::NewGuid().ToString()).json"
Set-Content -Path $tempJson -Value $payload -Encoding UTF8

$patchCmd = @(
  "curl.exe",
  "--silent", "--show-error",
  "-X", "PATCH",
  "$ServerUrl/admin-api/products/$ProductId",
  "-H", "Content-Type: application/json",
  "-H", "Authorization: Bearer $AdminToken",
  "--data-binary",
  "@$tempJson"
)

$patch = & $patchCmd[0] $patchCmd[1..($patchCmd.Length-1)] 2>&1
if ($LASTEXITCODE -ne 0) {
  Fail "PATCH failed: $patch"
}

try {
  $patchJson = $patch | ConvertFrom-Json
} catch {
  Fail "PATCH response invalid JSON: $patch"
}

Write-Host "Updated Product Response:" -ForegroundColor Green
$patchJson | ConvertTo-Json -Depth 6 | Write-Host

Remove-Item -Force $tempJson -ErrorAction SilentlyContinue

Write-Host "Done." -ForegroundColor Green
