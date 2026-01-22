$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "mouse-scheduler-windows")
npm install
npm run pack
Write-Host "Installer ready under: mouse-scheduler-windows/release/"

