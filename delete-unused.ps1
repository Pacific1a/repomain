Write-Host "Deleting unused images..." -ForegroundColor Red
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
            Write-Host "Case $caseId - Deleting $($unused.Count) files:" -ForegroundColor Yellow
            foreach ($file in $unused) {
                Write-Host "  Deleting: $($file.Name)" -ForegroundColor Red
                Remove-Item $file.FullName -Force
                $total++
            }
            Write-Host ""
        }
    }
}

Write-Host "Total deleted: $total files" -ForegroundColor Green

if ($total -gt 0) {
    Write-Host ""
    Write-Host "Now commit the changes:" -ForegroundColor Yellow
    Write-Host "  git add -A" -ForegroundColor Cyan
    Write-Host "  git commit -m 'chore: Remove unused images'" -ForegroundColor Cyan
    Write-Host "  git push origin main" -ForegroundColor Cyan
}
