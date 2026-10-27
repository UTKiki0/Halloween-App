param(
  [ValidateSet('', 'base', 'tap', 'hollow', 'carved', 'lit', 'smoke', 'basket', 'walk', 'hang')][string]$Preview = '',
  [int]$Width = 390,
  [int]$Height = 844
)
$ErrorActionPreference = 'Stop'
$edgeExe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$evidenceDir = Join-Path ([IO.Path]::GetTempPath()) ('halloween-story-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $evidenceDir | Out-Null
$testPath = Join-Path $PSScriptRoot 'story-regression.html'
$testUrl = ([uri]$testPath).AbsoluteUri
if ($Preview) { $testUrl += '?preview=' + $Preview }
$portReservation = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$portReservation.Start()
$debugPort = $portReservation.LocalEndpoint.Port
$portReservation.Stop()
$edgeArgs = @('--headless', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--allow-file-access-from-files',
  ('--user-data-dir=' + (Join-Path $evidenceDir 'profile')),
  ('--remote-debugging-port=' + $debugPort), 'about:blank')
$browser = Start-Process -FilePath $edgeExe -ArgumentList $edgeArgs -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $evidenceDir 'browser.out') `
  -RedirectStandardError (Join-Path $evidenceDir 'browser.log')

# Edge enforces a minimum desktop window width. DevTools emulation sets the actual
# layout viewport, so narrow-phone checks and screenshots use the requested size.
$socket = [Net.WebSockets.ClientWebSocket]::new()
$script:commandId = 0
function Invoke-BrowserCommand([string]$Method, [hashtable]$Parameters = @{}) {
  $script:commandId++
  $id = $script:commandId
  $message = @{ id = $id; method = $Method; params = $Parameters } | ConvertTo-Json -Compress -Depth 20
  $bytes = [Text.Encoding]::UTF8.GetBytes($message)
  $timeout = [Threading.CancellationTokenSource]::new(15000)
  try {
    $null = $socket.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text,
      $true, $timeout.Token).GetAwaiter().GetResult()
    do {
      $buffer = New-Object byte[] 65536
      $stream = [IO.MemoryStream]::new()
      do {
        $packet = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), $timeout.Token).GetAwaiter().GetResult()
        $stream.Write($buffer, 0, $packet.Count)
      } while (!$packet.EndOfMessage)
      $reply = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
      $stream.Dispose()
    } while ($reply.id -ne $id)
    if ($reply.error) { throw ($reply.error | ConvertTo-Json -Compress) }
    if ($reply.result.exceptionDetails) { throw ($reply.result.exceptionDetails | ConvertTo-Json -Compress -Depth 10) }
    return $reply
  } finally { $timeout.Dispose() }
}

try {
  $targets = $null
  for ($attempt = 0; $attempt -lt 80; $attempt++) {
    try { $targets = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $debugPort + '/json/list'); break }
    catch { Start-Sleep -Milliseconds 100 }
  }
  if (!$targets) { throw 'Browser debugging endpoint did not start.' }
  $target = $targets | Where-Object type -EQ 'page' | Select-Object -First 1
  $null = $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  Invoke-BrowserCommand 'Emulation.setDeviceMetricsOverride' @{
    width = $Width; height = $Height; deviceScaleFactor = 1; mobile = $false
  } | Out-Null
  Invoke-BrowserCommand 'Page.navigate' @{ url = $testUrl } | Out-Null
  $status = ''
  for ($attempt = 0; $attempt -lt 200; $attempt++) {
    $reply = Invoke-BrowserCommand 'Runtime.evaluate' @{ expression = 'document.body?.dataset.result || ""' }
    $status = $reply.result.result.value
    if ($status -in 'pass', 'fail') { break }
    Start-Sleep -Milliseconds 100
  }
  $reply = Invoke-BrowserCommand 'Runtime.evaluate' @{ expression = 'document.documentElement.outerHTML' }
  $result = $reply.result.result.value
  [IO.File]::WriteAllText((Join-Path $evidenceDir 'result.html'), $result)
  Write-Output ('Evidence: ' + $evidenceDir)
  if ($status -ne 'pass') { throw 'Story checks failed or timed out; see evidence.' }
  $viewport = Invoke-BrowserCommand 'Runtime.evaluate' @{ expression = 'JSON.stringify([innerWidth, innerHeight])' }
  if ($viewport.result.result.value -ne ('[' + $Width + ',' + $Height + ']')) { throw 'Layout viewport does not match requested dimensions.' }
  Write-Output ('Viewport: ' + $Width + 'x' + $Height)
  if ($Preview) {
    Invoke-BrowserCommand 'Runtime.evaluate' @{
      expression = 'Promise.all(Array.from(document.images, image => image.decode())).then(() => true)'
      awaitPromise = $true
    } | Out-Null
    $reply = Invoke-BrowserCommand 'Page.captureScreenshot' @{ format = 'png'; captureBeyondViewport = $false }
    [IO.File]::WriteAllBytes((Join-Path $evidenceDir 'preview.png'), [Convert]::FromBase64String($reply.result.data))
  } else {
    $pre = [regex]::Match($result, '(?s)<pre id="results">(.*?)</pre>').Groups[1].Value
    Write-Output ([Net.WebUtility]::HtmlDecode($pre))
  }
} finally {
  if ($socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
    try { Invoke-BrowserCommand 'Browser.close' | Out-Null } catch { }
  }
  $socket.Dispose()
}
