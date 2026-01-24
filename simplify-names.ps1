[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Simplifying file names to 1.png, 2.png format..." -ForegroundColor Cyan
Write-Host ""

$cases = @("329", "389", "529")

foreach ($caseId in $cases) {
    Write-Host "Case $caseId..." -ForegroundColor Yellow
    
    $casePath = "bot/main/content-case/$caseId"
    $configPath = Join-Path $casePath "config.json"
    
    # Read config
    $config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    
    # Update image paths to simple numbers
    for ($i = 0; $i -lt $config.prizes.Count; $i++) {
        $prize = $config.prizes[$i]
        $num = $i + 1
        
        if ($num -lt $config.prizes.Count) {
            $newImage = "main/content-case/$caseId/$num.png"
        } else {
            # Last one without number
            $newImage = "main/content-case/$caseId/$caseId.png"
        }
        
        $prize.image = $newImage
        Write-Host "  Prize $($prize.id): $($prize.image)" -ForegroundColor Gray
    }
    
    # Save config
    $configJson = $config | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText((Resolve-Path $configPath), $configJson, [System.Text.Encoding]::UTF8)
    
    Write-Host "  Config updated!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Now you need to RENAME THE FILES manually:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Case 329 (Rocket):" -ForegroundColor Cyan
Write-Host "  Rename 'Rocket голубой...' -> '1.png'" -ForegroundColor Gray
Write-Host "  Rename 'Rocket жёлтый' -> '2.png'" -ForegroundColor Gray
Write-Host "  ... etc" -ForegroundColor Gray
Write-Host ""
Write-Host "Case 389 (Book):" -ForegroundColor Cyan
Write-Host "  Rename 'Book браун' -> '1.png'" -ForegroundColor Gray
Write-Host "  ... etc" -ForegroundColor Gray
Write-Host ""
Write-Host "Case 529 (корона):" -ForegroundColor Cyan
Write-Host "  Rename 'корона 1.png' -> '1.png'" -ForegroundColor Gray
Write-Host "  ... etc" -ForegroundColor Gray
Write-Host ""
Write-Host "Or run: .\auto-rename.ps1 (will try to rename automatically)" -ForegroundColor Cyan
