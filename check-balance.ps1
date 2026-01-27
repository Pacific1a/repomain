# Check balance for user
$TELEGRAM_ID = "1889923046"
$SERVER = "https://duopartners.xyz"

Write-Host "Checking balance for ID: $TELEGRAM_ID" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$SERVER/api/balance/$TELEGRAM_ID" -Method Get
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Rubles: $($response.rubles)" -ForegroundColor Cyan
    Write-Host "Chips: $($response.chips)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Full response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
