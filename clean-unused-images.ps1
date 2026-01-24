# Скрипт для удаления неиспользуемых изображений из кейсов

$casesPath = "bot/main/content-case"
$totalDeleted = 0
$deletedFiles = @()

Write-Host "🔍 ПОИСК НЕИСПОЛЬЗУЕМЫХ ФАЙЛОВ..." -ForegroundColor Cyan
Write-Host ""

# Получаем все папки кейсов
$caseFolders = Get-ChildItem -Path $casesPath -Directory

foreach ($caseFolder in $caseFolders) {
    $caseId = $caseFolder.Name
    $configPath = Join-Path $caseFolder.FullName "config.json"
    
    # Проверяем что config.json существует
    if (-not (Test-Path $configPath)) {
        Write-Host "⚠️  Кейс $caseId - нет config.json, пропускаем" -ForegroundColor Yellow
        continue
    }
    
    try {
        # Читаем config.json
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        
        # Получаем список используемых файлов
        $usedFiles = @()
        foreach ($prize in $config.prizes) {
            $imagePath = $prize.image
            # Извлекаем только имя файла из пути
            $fileName = Split-Path $imagePath -Leaf
            $usedFiles += $fileName
        }
        
        # Получаем все файлы изображений в папке
        $allImageFiles = Get-ChildItem -Path $caseFolder.FullName -File | Where-Object {
            $_.Extension -match '\.(png|jpg|jpeg|webp|gif|svg)$'
        }
        
        # Находим неиспользуемые файлы
        $unusedFiles = $allImageFiles | Where-Object {
            $usedFiles -notcontains $_.Name
        }
        
        if ($unusedFiles.Count -gt 0) {
            Write-Host "📦 Кейс $caseId" -ForegroundColor Green
            Write-Host "   Используется: $($usedFiles.Count) файлов" -ForegroundColor Gray
            Write-Host "   Найдено неиспользуемых: $($unusedFiles.Count) файлов" -ForegroundColor Yellow
            
            foreach ($file in $unusedFiles) {
                Write-Host "   🗑️  Удаляем: $($file.Name)" -ForegroundColor Red
                $deletedFiles += "bot/main/content-case/$caseId/$($file.Name)"
                Remove-Item $file.FullName -Force
                $totalDeleted++
            }
            Write-Host ""
        } else {
            Write-Host "✅ Кейс $caseId - все файлы используются" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ Ошибка при обработке кейса $caseId`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ ЗАВЕРШЕНО!" -ForegroundColor Green
Write-Host "📊 Всего удалено файлов: $totalDeleted" -ForegroundColor White
Write-Host ""

if ($totalDeleted -gt 0) {
    Write-Host "📋 Список удалённых файлов:" -ForegroundColor Yellow
    foreach ($file in $deletedFiles) {
        Write-Host "   - $file" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "⚠️  ВАЖНО: Теперь нужно закоммитить удаление:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   git add -A" -ForegroundColor Cyan
    Write-Host "   git commit -m 'chore: Remove unused image files from cases'" -ForegroundColor Cyan
    Write-Host "   git push origin main" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "✨ Неиспользуемых файлов не найдено!" -ForegroundColor Green
}
