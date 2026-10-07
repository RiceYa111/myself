$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
$nodePath = 'C:\Program Files\nodejs\node.exe'
$appUrl = 'http://127.0.0.1:4213'
try {
    $ready = $false
    try { $reply = Invoke-WebRequest -Uri "$appUrl/__version" -UseBasicParsing -TimeoutSec 2; $ready = $(if ($reply.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($reply.Content) } else { $reply.Content }) -eq 'Myself-0.3-api-r4' } catch {}
    if (-not $ready) {
        $listeners = Get-NetTCPConnection -LocalPort 4213 -State Listen -ErrorAction SilentlyContinue
        foreach ($listener in $listeners) {
            $proc = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $listener.OwningProcess)
            if ($proc.Name -eq 'node.exe' -and $proc.CommandLine.Contains($appRoot) -and $proc.CommandLine.Contains('server.cjs')) { Stop-Process -Id $proc.ProcessId -ErrorAction Stop }
            else { throw 'Port 4213 is occupied by another application. Please close it first.' }
        }
        $env:PORT = '4213'
        Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $appRoot 'api-server.cjs') + '"') -WorkingDirectory $appRoot -WindowStyle Hidden
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 300
            try { $reply = Invoke-WebRequest -Uri "$appUrl/__version" -UseBasicParsing -TimeoutSec 1; if ($(if ($reply.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($reply.Content) } else { $reply.Content }) -eq 'Myself-0.3-api-r4') { $ready = $true; break } } catch {}
        }
    }
    if (-not $ready) { throw 'The local prototype could not start on port 4213.' }
    Start-Process $appUrl
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'Myself 0.3') | Out-Null
}

