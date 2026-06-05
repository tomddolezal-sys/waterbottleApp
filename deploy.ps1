# Deploy Hearthstone Deck Builder to EC2
param(
    [string]$Ec2Host = "3.133.162.134",
    [string]$KeyPath = "$HOME/Downloads/MY-AWS-KEYPAIR.pem",
    [string]$ImageName = "hearthstone-app",
    [string]$ContainerName = "hearthstone-app",
    [int]$RemotePort = 80
)

$ErrorActionPreference = "Stop"

$ctx = Split-Path -Parent $PSCommandPath
if (-not $ctx) { $ctx = (Get-Location).Path }

$tmpDir = "$env:TEMP"
if (-not (Test-Path $tmpDir)) { $tmpDir = "C:\Windows\Temp" }

$zipPath = "$tmpDir\hearthstone-app-src.zip"

# Remove old archive if exists
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host "=== Packaging source ===" -ForegroundColor Cyan
# Exclude large/unnecessary dirs
$excludeDirs = @('.git', 'node_modules', '.next', '.pnpm-store', '*.pem')
$srcItems = Get-ChildItem -Path $ctx -Exclude $excludeDirs | Where-Object { $_.Name -ne 'deploy.ps1' -and $_.Name -ne '.dockerignore' }
Compress-Archive -Path $srcItems -DestinationPath $zipPath -Force

Write-Host "=== Copying source to EC2 ===" -ForegroundColor Cyan
scp -i $KeyPath $zipPath "ec2-user@${Ec2Host}:~/hearthstone-app-src.zip"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Host "=== Building and starting on EC2 ===" -ForegroundColor Cyan
ssh -i $KeyPath "ec2-user@${Ec2Host}" @"
set -e
cd ~
rm -rf hearthstone-app 2>/dev/null || true
mkdir hearthstone-app
cd hearthstone-app
unzip -o ../hearthstone-app-src.zip
docker build -t $ImageName .
docker stop $ContainerName 2`$null || true
docker rm $ContainerName 2`$null || true
docker run -d --name $ContainerName -p ${RemotePort}:3000 --restart unless-stopped $ImageName
echo 'DEPLOY_COMPLETE'
"@

if ($LASTEXITCODE -ne 0) { throw "SSH/build failed" }

Write-Host "=== Health check ===" -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 4
    $resp = ssh -i $KeyPath "ec2-user@${Ec2Host}" `
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:${RemotePort}/"
    if ($resp -eq "200") {
        Write-Host "App is live at http://${Ec2Host}:${RemotePort}" -ForegroundColor Green
        $ok = $true
        break
    }
    Write-Host "  Attempt $($i+1)/15: status=$resp (waiting...)"
}
if (-not $ok) { Write-Host "Warning: health check did not return 200" -ForegroundColor Yellow }

# Cleanup
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Write-Host "=== Done ===" -ForegroundColor Cyan