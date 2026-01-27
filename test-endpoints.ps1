# Test if admin endpoints exist
$SERVER = "https://duopartners.xyz"

Write-Host "Testing admin endpoints..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Check if endpoint exists
try {
    Write-Host "Test 1: /api/balance/admin/clear" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$SERVER/api/balance/admin/clear" -Method Post -Body '{"adminKey":"wrong"}' -ContentType "application/json" -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "OK - Endpoint exists (403 Forbidden)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "ERROR - Endpoint NOT FOUND (404)" -ForegroundColor Red
        Write-Host "NEED TO DEPLOY CODE TO SERVER!" -ForegroundColor Red
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 2: Check if endpoint exists
try {
    Write-Host "Test 2: /api/balance/admin/set" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$SERVER/api/balance/admin/set" -Method Post -Body '{"adminKey":"wrong"}' -ContentType "application/json" -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "OK - Endpoint exists (403 Forbidden)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "ERROR - Endpoint NOT FOUND (404)" -ForegroundColor Red
        Write-Host "NEED TO DEPLOY CODE TO SERVER!" -ForegroundColor Red
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "If endpoints not found, deploy on server:" -ForegroundColor Yellow
Write-Host "ssh root@77.239.125.70" -ForegroundColor White
Write-Host "cd /var/www/duo && git pull origin main && pm2 restart duo-server" -ForegroundColor White
