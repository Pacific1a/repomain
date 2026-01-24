# Скрипт для ПРОСМОТРА неиспользуемых изображений (БЕЗ УДАЛЕНИЯ)

$casesPath = "bot/main/content-case"
$totalUnused = 0
$unusedFilesList = @()

Write-Host "🔍 ПРОВЕРКА НЕИСПОЛЬЗУЕМЫХ ФАЙЛОВ..." -ForegroundColor Cyan
Write-Host "⚠️  РЕЖИМ ПРОСМОТРА - НИЧЕГО НЕ УДАЛЯЕТСЯ!" -ForegroundColor Yellow
Write-Host ""

$caseFolders = Get-ChildItem -Path $casesPath -Directory

foreach ($caseFolder in $caseFolders) {
    $caseId = $caseFolder.Name
    $configPath = Join-Path $caseFolder.FullName "config.json"
    
    if (-not (Test-Path $configPath)) {
        Write-Host "⚠️  Кейс $caseId - нет config.json" -ForegroundColor Yellow
        continue
    }
    
    try {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        
        $usedFiles = @()
        foreach ($prize in $config.prizes) {
            $imagePath = $prize.image
            $fileName = Split-Path $imagePath -Leaf
            $usedFiles += $fileName
        }
        
        $allImageFiles = Get-ChildItem -Path $caseFolder.FullName -File | Where-Object {
            $_.Extension -match '\.(png|jpg|jpeg|webp|gif|svg)$'
        }
        
        $unusedFiles = $allImageFiles | Where-Object {
            $usedFiles -notcontains $_.Name
        }
        
        if ($unusedFiles.Count -gt 0) {
            Write-Host "📦 Кейс $caseId" -ForegroundColor Green
            Write-Host "   Используется: $($usedFiles.Count) файлов" -ForegroundColor Gray
            Write-Host "   Неиспользуемых: $($unusedFiles.Count) файлов" -ForegroundColor Yellow
            
            foreach ($file in $unusedFiles) {
                $fileSize = [math]::Round($file.Length / 1KB, 2)
                Write-Host "   🗑️  $($file.Name) ($fileSize KB)" -ForegroundColor Red
                $unusedFilesList += @{
                    Case = $caseId
                    File = $file.Name
                    Size = $fileSize
                    Path = $file.FullName
                }
                $totalUnused++
            }
            Write-Host ""
        } else {
            Write-Host "✅ Кейс $caseId - все чисто" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 ИТОГО НЕИСПОЛЬЗУЕМЫХ ФАЙЛОВ: $totalUnused" -ForegroundColor White
Write-Host ""

if ($totalUnused -gt 0) {
    if ($unusedFilesList.Count -gt 0) {
        $totalSize = ($unusedFilesList | Measure-Object -Property Size -Sum).Sum
        Write-Host "💾 Общий размер: $([math]::Round($totalSize, 2)) KB" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "❓ Хочешь удалить эти файлы?" -ForegroundColor Yellow
    Write-Host "   Запусти: .\clean-unused-images.ps1" -ForegroundColor Cyan
} else {
    Write-Host "✨ Всё чисто! Неиспользуемых файлов нет." -ForegroundColor Green
}
