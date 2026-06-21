[System.IO.File]::Copy(
  (Join-Path $PSScriptRoot '..\client\public\icon.ico'),
  (Join-Path $PSScriptRoot 'app.ico'),
  $true
)
Write-Output "Icon synced from client/public/icon.ico"
