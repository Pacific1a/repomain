[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "AUTO-FIXING file names for cases 329, 389, 529..." -ForegroundColor Cyan
Write-Host ""

$cases = @{
    "329" = "Rocket"
    "389" = "Book"
    "529" = "Crown"
}

foreach ($caseId in $cases.Keys) {
    $caseName = $cases[$caseId]
    Write-Host "==== Case $caseId ($caseName) ====" -ForegroundColor Yellow
    
    $casePath = "bot/main/content-case/$caseId"
    $configPath = Join-Path $casePath "config.json"
    
    # Get all PNG files except numbered ones
    $allFiles = Get-ChildItem -Path $casePath -Filter "*.png" | Where-Object { 
        $_.Name -notmatch '^\d+\.png$' -and $_.Name -ne "$caseId.png"
    } | Sort-Object LastWriteTime
    
    Write-Host "Found $($allFiles.Count) files to rename" -ForegroundColor Gray
    
    # Rename files
    for ($i = 0; $i -lt $allFiles.Count; $i++) {
        $file = $allFiles[$i]
        $newName = "$($i + 1).png"
        $newPath = Join-Path $casePath $newName
        
        Write-Host "  $($file.Name) -> $newName" -ForegroundColor Green
        Move-Item -Path $file.FullName -Destination $newPath -Force
    }
    
    # Update config.json
    $config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    
    for ($i = 0; $i -lt $config.prizes.Count; $i++) {
        $num = $i + 1
        $config.prizes[$i].image = "main/content-case/$caseId/$num.png"
    }
    
    # Save config
    $configJson = $config | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText((Resolve-Path $configPath).Path, $configJson, [System.Text.Encoding]::UTF8)
    
    Write-Host "  Config updated!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "==== DONE! ====" -ForegroundColor Green
Write-Host ""
Write-Host "Run check-missing.ps1 to verify!" -ForegroundColor Cyan
