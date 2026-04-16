$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $root "serve-local.ps1"

Start-Process powershell -ArgumentList @(
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  "`"$serverScript`""
)

Start-Sleep -Seconds 2
Start-Process "http://localhost:8080/index.html"
