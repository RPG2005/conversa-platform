[CmdletBinding()]
param(
  [ValidateSet('core', 'attachments', 'all')]
  [string]$Suite = 'all',
  [string]$TestPassword = 'local-test-password-123'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$collection = Join-Path $projectRoot 'postman/collections/chat-yes-no-api'
$environment = Join-Path $projectRoot 'postman/environments/local.environment.yaml'
$runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
$attachmentFile = $null

if (-not (Get-Command postman -ErrorAction SilentlyContinue)) { throw 'Postman CLI no está instalado o no está en PATH.' }

try {
  $health = $null
  for ($attempt = 1; $attempt -le 20 -and -not $health; $attempt++) {
    try { $health = Invoke-RestMethod 'http://localhost:3000/health' } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $health) { throw 'La API no respondió a /health tras 20 segundos.' }
  if ($health.status -ne 'ok') { throw 'La API no está sana. Ejecuta docker compose --profile app up -d --build api.' }
  $requestNames = @('health', 'register-ada', 'register-bob', 'register-eve', 'register-Mallory', 'create-conversation', 'eve-cannot-read', 'add-eve', 'send-ada-message', 'send-bob-message', 'list-first-message-page', 'list-next-message-page', 'Sync messages after reconnect', 'Get notification preferences', 'Update notification preferences')
  if ($Suite -in @('attachments', 'all')) {
    $attachmentFile = Join-Path ([IO.Path]::GetTempPath()) "chat-yes-no-$runId.pdf"
    [IO.File]::WriteAllBytes($attachmentFile, [byte[]]::new(1024))
    $requestNames += @('Create attachment upload URL', 'Upload attachment binary', 'Complete attachment upload', 'Send Ada message with attachment', 'Get attachment download URL')
  }
  if ($Suite -eq 'attachments') { $requestNames = @('health', 'register-ada', 'register-bob', 'create-conversation', 'Create attachment upload URL', 'Upload attachment binary', 'Complete attachment upload', 'Send Ada message with attachment', 'Get attachment download URL') }
  $arguments = @('collection', 'run', $collection, '-e', $environment, '--env-var', "test_password=$TestPassword", '--env-var', "run_id=$runId", '--timeout-request', '10000')
  if ($attachmentFile) { $arguments += @('--env-var', "attachment_file_path=$attachmentFile") }
  foreach ($requestName in $requestNames) { $arguments += @('-i', $requestName) }
  Write-Host "Ejecutando suite '$Suite' con run_id=$runId"
  & postman @arguments
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  if ($attachmentFile -and (Test-Path -LiteralPath $attachmentFile)) { Remove-Item -LiteralPath $attachmentFile -Force }
}
Write-Host 'Pruebas HTTP terminadas. Consulta docs/NOTIFICATIONS_TESTING.md para WebSocket y Mailpit.'
