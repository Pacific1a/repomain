# UTF-8 encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Fixing Russian file names..." -ForegroundColor Cyan
Write-Host ""

# Mapping for renaming
$renames = @{
    "329" = @{
        "old" = "Rocket"
        "new" = "Rocket"
    }
    "389" = @{
        "old" = "Book"
        "new" = "Book"
    }
    "529" = @{
        "old" = "корона"
        "new" = "Crown"
    }
}

foreach ($caseId in $renames.Keys) {
    $casePath = "bot/main/content-case/$caseId"
    $configPath = Join-Path $casePath "config.json"
    $oldName = $renames[$caseId]["old"]
    $newName = $renames[$caseId]["new"]
    
    Write-Host "Processing Case $caseId ($oldName -> $newName)..." -ForegroundColor Yellow
    
    # Read config
    $config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    
    # Update config
    foreach ($prize in $config.prizes) {
        $prize.image = $prize.image -replace [regex]::Escape($oldName), $newName
    }
    
    # Save config
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
    
    Write-Host "  Config updated for Case $caseId" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Done! Now run check-missing.ps1 to verify" -ForegroundColor Green
