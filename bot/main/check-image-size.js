// Скрипт для проверки реального размера загруженных изображений
// Вставьте этот код в консоль браузера на странице мини-аппа

(function checkImageSizes() {
  console.log('🔍 Проверка размеров изображений...\n');
  
  const images = document.querySelectorAll('.content-window-item img, .item-preview-item img');
  
  if (images.length === 0) {
    console.log('❌ Изображения не найдены. Откройте кейс для проверки.');
    return;
  }
  
  const results = [];
  
  images.forEach((img, index) => {
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const displayWidth = img.width;
    const displayHeight = img.height;
    const src = img.src;
    const fileName = src.split('/').pop();
    
    const ratio = naturalWidth / displayWidth;
    let quality = '✅ Отлично (3x Retina)';
    
    if (ratio < 1.5) {
      quality = '❌ ПЛОХО - нужно минимум 2x';
    } else if (ratio < 2.5) {
      quality = '⚠️ Нормально (2x Retina)';
    }
    
    results.push({
      index: index + 1,
      fileName,
      natural: `${naturalWidth}x${naturalHeight}`,
      display: `${displayWidth}x${displayHeight}`,
      ratio: `${ratio.toFixed(1)}x`,
      quality
    });
  });
  
  console.table(results);
  
  console.log('\n📊 Рекомендации:');
  console.log('• Для четких картинок на iPhone нужно минимум 220x220px (2x)');
  console.log('• Идеально: 330x330px (3x для iPhone 14 Pro и новее)');
  console.log('• Текущие картинки отображаются как 110x110px\n');
  
  const badImages = results.filter(r => r.quality.includes('ПЛОХО'));
  if (badImages.length > 0) {
    console.log(`⚠️ Найдено ${badImages.length} картинок с низким разрешением!`);
    console.log('Загрузите PNG в 2-3 раза больше для устранения размытия.');
  }
})();
