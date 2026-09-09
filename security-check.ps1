# Local SHAKALPA security smoke test. Run after starting server.py.
param([string]$BaseUrl = 'http://localhost:8080')

$ErrorActionPreference = 'Stop'
function Assert-Status([string]$Name, [string]$Url, [int]$Expected, [hashtable]$Headers = @{}, [string]$Method = 'GET') {
  try { $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers $Headers -Method $Method }
  catch { $response = $_.Exception.Response; if (-not $response) { throw } }
  if ($response.StatusCode -ne $Expected) { throw "$Name expected HTTP $Expected but received HTTP $($response.StatusCode)." }
  "${Name}: passed"
}

$vendor = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/vendor.html"
foreach ($header in 'Cache-Control', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy') {
  if (-not $vendor.Headers[$header]) { throw "Vendor page is missing the $header security header." }
}
if ($vendor.Headers['Cache-Control'] -notmatch 'no-store') { throw 'Vendor page must not be cached.' }
'Response headers and cache policy: passed'

Assert-Status 'Unauthenticated team list' "$BaseUrl/api/vendor/staff" 401
Assert-Status 'Unauthenticated approval queue' "$BaseUrl/api/vendor/product-change-requests" 401
Assert-Status 'Invalid-origin employee creation' "$BaseUrl/api/vendor/staff" 403 @{ Origin = 'https://attacker.invalid' } 'POST'
Assert-Status 'Blocked encoded traversal' "$BaseUrl/%2e%2e%2fserver.py" 404
Assert-Status 'Blocked unapproved static file type' "$BaseUrl/nexahub.db" 404

$teamScript = (Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/vendor.js").Content
if ($teamScript.Contains("teamNav.style.display = 'none';")) { throw 'Team navigation is hidden in the served script.' }
if (-not $teamScript.Contains("teamNav.href = 'vendor-team.html'")) { throw 'Team navigation is missing in the served script.' }
'Vendor navigation integrity: passed'

node --check vendor.js
node --check vendor-team.js
'Client script parsing: passed'
