Write-Host "Checking for missing image files..." -ForegroundColor Cyan
Write-Host ""

$casesPath = "bot/main/content-case"
$missingTotal = 0

Get-ChildItem -Path $casesPath -Directory | ForEach-Object {
    $caseId = $_.Name
    $configFile = Join-Path $_.FullName "config.json"
    
    if (Test-Path $configFile) {
        $config = Get-Content $configFile -Raw | ConvertFrom-Json
        
        $missing = @()
        foreach ($prize in $config.prizes) {
            $fileName = Split-Path $prize.image -Leaf
            $filePath = Join-Path $_.FullName $fileName
            
            if (-not (Test-Path $filePath)) {
                $missing += $fileName
            }
        }
        
        if ($missing.Count -gt 0) {
            Write-Host "Case $caseId - MISSING $($missing.Count) files:" -ForegroundColor Red
            foreach ($file in $missing) {
                Write-Host "  X $file" -ForegroundColor Red
                $missingTotal++
            }
            Write-Host ""
        } else {
            Write-Host "Case $caseId - OK (all $($config.prizes.Count) files present)" -ForegroundColor Green
        }
    }
}

Write-Host ""
if ($missingTotal -eq 0) {
    Write-Host "All cases are complete!" -ForegroundColor Green
} else {
    Write-Host "Total missing files: $missingTotal" -ForegroundColor Red
}
