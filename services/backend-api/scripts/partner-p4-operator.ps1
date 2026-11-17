param([Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedSource)
$ErrorActionPreference='Stop'
$origin='https://karigo-partner-p25-api-ratd.onrender.com'
$resultPath='C:/Dev/KariGO/artifacts/partner-p4-hosted-result.json'
try {
  $ready=Invoke-RestMethod -Uri "$origin/ready" -TimeoutSec 30
  if ($ready.environment -ne 'partner-staging' -or $ready.source -ne $ExpectedSource) {throw 'P4_SOURCE_OR_ENVIRONMENT_MISMATCH'}
  Add-Type -AssemblyName System.Windows.Forms
  $form=New-Object System.Windows.Forms.Form
  $form.Text='KariGO Partner P4 - protected staging operator input'
  $form.Width=570;$form.Height=205;$form.StartPosition='CenterScreen';$form.TopMost=$true
  $label=New-Object System.Windows.Forms.Label
  $label.Text='Enter STAGING_OPERATOR_SECRET from the Partner staging service only. Never enter a payment key or Production credential.'
  $label.Left=20;$label.Top=15;$label.Width=520;$label.Height=45
  $inputBox=New-Object System.Windows.Forms.TextBox
  $inputBox.Left=20;$inputBox.Top=70;$inputBox.Width=510;$inputBox.UseSystemPasswordChar=$true
  $ok=New-Object System.Windows.Forms.Button
  $ok.Text='Run isolated P4 checks';$ok.Left=20;$ok.Top=110;$ok.Width=210;$ok.DialogResult=[System.Windows.Forms.DialogResult]::OK
  $form.Controls.AddRange(@($label,$inputBox,$ok));$form.AcceptButton=$ok
  $dialog=$form.ShowDialog()
  if ($dialog -ne [System.Windows.Forms.DialogResult]::OK -or $inputBox.Text.Length -lt 32) {$form.Dispose();throw 'P4_INPUT_CANCELLED'}
  $operatorValue=$inputBox.Text;$inputBox.Clear();$form.Dispose()
  $headers=@{Authorization='Bearer '+$operatorValue}
  $result=Invoke-RestMethod -Uri "$origin/staging/p4-smoke" -Method Post -Headers $headers -ContentType 'application/json' -Body '{}' -TimeoutSec 240
  if ($result.source -ne $ExpectedSource) {throw 'P4_RESULT_SOURCE_MISMATCH'}
  $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resultPath -Encoding utf8
} catch {
  $status=if ($_.Exception.Response) {[int]$_.Exception.Response.StatusCode} else {0}
  @{failed=$true;code='P4_OPERATOR_STOP';httpStatus=$status} | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding utf8
} finally { $operatorValue=$null;$headers=$null;[GC]::Collect() }
