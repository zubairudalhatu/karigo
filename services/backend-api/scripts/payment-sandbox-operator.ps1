# Interactive local operator for the dedicated PAY-02 sandbox only.
# Credentials are held in this process; commands/results contain no credentials.
param([string]$ExchangeDirectory='C:/Dev/KariGO/artifacts/pay-02-operator')
$ErrorActionPreference='Stop'
$Host.UI.RawUI.WindowTitle='KariGO PAY-02 sandbox operator - protected input'
$base='https://karigo-pay02-sandbox-api-ansz.onrender.com'
$root=[IO.Path]::GetFullPath($ExchangeDirectory)
if($root -ne 'C:\Dev\KariGO\artifacts\pay-02-operator'){throw 'EXCHANGE_PATH_REJECTED'}
New-Item -ItemType Directory -Force -Path $root | Out-Null
$secret=Read-Host 'Enter ONLY the generated PAYMENT_SANDBOX_OPERATOR_SECRET from karigo-pay02-sandbox-api-ansz Environment' -AsSecureString
$pointer=[IntPtr]::Zero
$references=[Collections.Generic.HashSet[string]]::new()
$attempts=[Collections.Generic.HashSet[string]]::new()
$created=0
try {
 $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
 $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
 if($plain.Length -lt 32 -or $plain.Length -gt 128 -or $plain -match '\s'){throw 'OPERATOR_SECRET_FORMAT_REJECTED'}
 $headers=@{Authorization='Bearer '+$plain}
 $health=Invoke-RestMethod "$base/ready" -TimeoutSec 20
 if($health.environment -ne 'payment-sandbox' -or $health.source -ne '8457563820f79cddeb480bce5325b82a223aed5d' -or !$health.credentialConfigured){throw 'SANDBOX_IDENTITY_OR_TEST_KEY_NOT_READY'}
 $probe=Invoke-RestMethod "$base/sandbox/orders/not-a-route" -Headers $headers -SkipHttpErrorCheck -StatusCodeVariable probeStatus -TimeoutSec 20
 if($probeStatus -ne 404){throw 'OPERATOR_AUTHENTICATION_NOT_CONFIRMED'}
 [IO.File]::WriteAllText((Join-Path $root 'status.json'),'{"status":"AUTHENTICATED_READY_NO_ORDER_CREATED"}')
 Write-Host 'AUTHENTICATED_READY_NO_ORDER_CREATED'
 while($true){
  $requestFile=Join-Path $root 'request.json'
  if(!(Test-Path -LiteralPath $requestFile)){Start-Sleep -Milliseconds 500;continue}
  $request=Get-Content -LiteralPath $requestFile -Raw | ConvertFrom-Json
  Remove-Item -LiteralPath $requestFile
  if($request.operation -eq 'shutdown'){break}
  if($request.id -notmatch '^[A-Za-z0-9_-]{1,60}$'){throw 'COMMAND_ID_REJECTED'}
  try {
   $method='POST';$body='{}';$path=$null
   switch($request.operation){
    'create' {if($created -ge 8){throw 'SYNTHETIC_ORDER_LIMIT'};$created++;$path='/sandbox/orders'}
    'verify' {if(!$references.Contains([string]$request.reference)){throw 'REFERENCE_NOT_CREATED_BY_THIS_OPERATOR'};$path='/sandbox/verify/'+$request.reference}
    'inspect' {if(!$attempts.Contains([string]$request.attemptId)){throw 'ATTEMPT_NOT_CREATED_BY_THIS_OPERATOR'};$path='/sandbox/attempts/'+$request.attemptId;$method='GET'}
    'reconcile' {if(!$attempts.Contains([string]$request.attemptId)){throw 'ATTEMPT_NOT_CREATED_BY_THIS_OPERATOR'};$path='/sandbox/attempts/'+$request.attemptId+'/reconcile'}
    'refund' {
      if(!$attempts.Contains([string]$request.attemptId) -or $request.amountMinor -ne 10000 -or $request.idempotencyKey -notmatch '^PAY02-REFUND-[A-Za-z0-9-]{12,64}$'){throw 'REFUND_SCOPE_REJECTED'}
      $path='/sandbox/attempts/'+$request.attemptId+'/refund';$body=@{amountMinor=10000;idempotencyKey=$request.idempotencyKey}|ConvertTo-Json -Compress
    }
    default {throw 'OPERATION_REJECTED'}
   }
   $requestOptions=@{Uri=$base+$path;Method=$method;Headers=$headers;TimeoutSec=30;SkipHttpErrorCheck=$true;StatusCodeVariable='status'}
   if($method -eq 'POST'){$requestOptions.ContentType='application/json';$requestOptions.Body=$body}
   $result=Invoke-RestMethod @requestOptions
   if($request.operation -eq 'create' -and $status -eq 200){
    if($result.payment.transactionReference -notmatch '^KGO-ORDER-[a-f0-9-]{36}$' -or $result.attempt.id -notmatch '^[a-f0-9-]{36}$'){throw 'UNEXPECTED_SYNTHETIC_REFERENCE'}
    $null=$references.Add([string]$result.payment.transactionReference);$null=$attempts.Add([string]$result.attempt.id)
   }
   $safe=@{id=$request.id;operation=$request.operation;httpStatus=$status;result=$result;at=[DateTime]::UtcNow.ToString('o')}
   $json=$safe|ConvertTo-Json -Depth 15
   [IO.File]::WriteAllText((Join-Path $root ($request.id+'.json')),$json)
   Write-Host ('COMMAND_COMPLETE '+$request.id+' HTTP '+$status)
  }catch{
   [IO.File]::WriteAllText((Join-Path $root ($request.id+'.json')),(@{id=$request.id;operation=$request.operation;code='OPERATOR_COMMAND_FAILED_NO_AUTOMATIC_RETRY'}|ConvertTo-Json -Compress))
   Write-Host ('COMMAND_FAILED '+$request.id)
  }
 }
} catch {
 [IO.File]::WriteAllText((Join-Path $root 'status.json'),'{"status":"OPERATOR_STOP_NO_SECRET_LOGGED"}')
 Write-Host 'OPERATOR_STOP_NO_SECRET_LOGGED'
} finally {
 if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
 $plain=$null;$headers=$null;$secret.Dispose()
}
