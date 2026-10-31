$exe = Join-Path $PWD 'release/win-unpacked/CleanSlate.exe'
if (!(Test-Path $exe)) { throw 'Packaged CleanSlate.exe is missing.' }

$app = Start-Process $exe -ArgumentList '--smoke-test' -PassThru
if (!$app.WaitForExit(120000)) {
  Stop-Process -Id $app.Id -Force
  throw 'Packaged Windows smoke test timed out.'
}
if ($app.ExitCode -ne 0) { throw "Packaged Windows smoke test failed with exit code $($app.ExitCode)." }
