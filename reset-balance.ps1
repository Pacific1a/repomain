# Reset Balance Script
# Очищает все балансы и устанавливает баланс для ID 1889923046

$SERVER = "https://duopartners.xyz"
$ADMIN_KEY = "G3ce12soSjWJK38jyGq"
$TELEGRAM_ID = "1889923046"
$RUBLES = 50000
$CHIPS = 0

Write-Host "🗑️  Clearing all balances..." -ForegroundColor Yellow

# Clear all balances
$clearBody = @{
    adminKey = $ADMIN_KEY
} | ConvertTo-Json

try {
    $clearResponse = Invoke-RestMethod -Uri "$SERVER/api/balance/admin/clear" -Method Post -Body $clearBody -ContentType "application/json"
    Write-Host "✅ All balances cleared!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error clearing balances: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💰 Setting balance for ID $TELEGRAM_ID..." -ForegroundColor Yellow

# Set balance for user
$setBody = @{
    adminKey = $ADMIN_KEY
    telegramId = $TELEGRAM_ID
    rubles = $RUBLES
    chips = $CHIPS
} | ConvertTo-Json

try {
    $setResponse = Invoke-RestMethod -Uri "$SERVER/api/balance/admin/set" -Method Post -Body $setBody -ContentType "application/json"
    Write-Host "✅ Balance set: $RUBLES₽ / $CHIPS chips" -ForegroundColor Green
    Write-Host ""
    Write-Host $setResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error setting balance: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Balance reset complete!" -ForegroundColor Green
