$ErrorActionPreference = "Continue"
Set-Location "C:\Users\USER\tennis-center"
$done = "C:\Users\USER\tennis-center\MIGRATION_DONE.txt"
$log = "C:\Users\USER\tennis-center\MIGRATION_LOG.txt"

function Log($msg) { $msg | Out-File -FilePath $log -Append -Encoding utf8; Write-Host $msg }

"" | Out-File -FilePath $log -Encoding utf8
Log "=== Started $(Get-Date -Format o) ==="

try {
  Log "--- npm install pg --no-save ---"
  npm install pg --no-save 2>&1 | ForEach-Object { Log $_ }
  Log "npm exit: $LASTEXITCODE"

  Log "--- node scripts/apply-user-permissions-migration.mjs ---"
  $migOut = node scripts/apply-user-permissions-migration.mjs 2>&1
  $migOut | ForEach-Object { Log $_ }
  $migExit = $LASTEXITCODE
  Log "migration exit: $migExit"

  if ($migExit -ne 0) {
    Log "--- supabase link + db push ---"
    npx supabase link --project-ref kcwvqwvcyiiwalyvhvxz 2>&1 | ForEach-Object { Log $_ }
    npx supabase db push 2>&1 | ForEach-Object { Log $_ }
    Log "--- retry migration ---"
    node scripts/apply-user-permissions-migration.mjs 2>&1 | ForEach-Object { Log $_ }
    $migExit = $LASTEXITCODE
  }

  if ($migExit -eq 0) {
    "SUCCESS" | Out-File -FilePath $done -Encoding utf8 -NoNewline
    exit 0
  }

  Log "--- verify via supabase-js ---"
  $verify = node -e @"
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const c=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const t=await c.from('user_permissions').select('id').limit(1);
const r=await c.rpc('get_my_permissions');
console.log('TABLE:',t.error?'MISSING:'+t.error.message:'OK');
console.log('RPC:',r.error?'MISSING:'+r.error.message:'OK');
"@
  $verify | ForEach-Object { Log $_ }

  if ($verify -match 'TABLE: OK' -and $verify -match 'RPC: OK') {
    "SUCCESS" | Out-File -FilePath $done -Encoding utf8 -NoNewline
    exit 0
  }

  $reason = ($migOut | Out-String).Trim()
  if (-not $reason) { $reason = "migration failed; see MIGRATION_LOG.txt" }
  "FAILED: $reason" | Out-File -FilePath $done -Encoding utf8 -NoNewline
  exit 1
} catch {
  "FAILED: $($_.Exception.Message)" | Out-File -FilePath $done -Encoding utf8 -NoNewline
  Log "ERROR: $($_.Exception.Message)"
  exit 1
}
