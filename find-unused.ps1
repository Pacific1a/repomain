Write-Host "Checking for unused images..." -ForegroundColor Cyan
Write-Host ""

$casesPath = "bot/main/content-case"
$total = 0

Get-ChildItem -Path $casesPath -Directory | ForEach-Object {
    $caseId = $_.Name
    $configFile = Join-Path $_.FullName "config.json"
    
    if (Test-Path $configFile) {
        $config = Get-Content $configFile -Raw | ConvertFrom-Json
        
        $usedImages = @()
        foreach ($prize in $config.prizes) {
            $fileName = Split-Path $prize.image -Leaf
            $usedImages += $fileName
        }
        
        $allImages = Get-ChildItem -Path $_.FullName -File -Include *.png,*.jpg,*.jpeg,*.webp,*.gif,*.svg
        
        $unused = $allImages | Where-Object { $usedImages -notcontains $_.Name }
        
        if ($unused) {
            Write-Host "Case $caseId - Found $($unused.Count) unused files:" -ForegroundColor Yellow
            foreach ($file in $unused) {
                Write-Host "  - $($file.Name)" -ForegroundColor Red
                $total++
            }
            Write-Host ""
        }
    }
}

Write-Host "Total unused files: $total" -ForegroundColor White

if ($total -gt 0) {
    Write-Host ""
    Write-Host "To delete them, run: .\clean-unused-images.ps1" -ForegroundColor Cyan
}
