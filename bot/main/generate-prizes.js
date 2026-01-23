// Генератор призов для всех кейсов
// Сканирует папки content-case и создает конфиги с рандомными ценами

const fs = require('fs');
const path = require('path');

// Конфигурация кейсов (цена кейса и диапазон призов)
const CASES = {
  279: { min: 100, max: 500, count: 8 },
  329: { min: 150, max: 600, count: 9 },
  389: { min: 150, max: 700, count: 9 },
  419: { min: 200, max: 800, count: 9 },
  479: { min: 200, max: 1000, count: 9 },
  529: { min: 250, max: 1200, count: 9 },
  659: { min: 300, max: 1500, count: 9 },
  777: { min: 350, max: 1800, count: 9 },
  819: { min: 400, max: 2000, count: 9 },
  939: { min: 400, max: 2500, count: 9 },
  999: { min: 500, max: 3000, count: 9 }
};

// Редкость по цене
function getRarityByPrice(price, maxPrice) {
  const ratio = price / maxPrice;
  
  if (ratio >= 0.9) return { rarity: 'divine', color: '#da8f4a', name: 'Божественный', chance: 1 };
  if (ratio >= 0.75) return { rarity: 'mythical', color: '#be3a41', name: 'Мифический', chance: 3 };
  if (ratio >= 0.6) return { rarity: 'mythical', color: '#be3a41', name: 'Мифический', chance: 5 };
  if (ratio >= 0.5) return { rarity: 'legendary', color: '#c32f80', name: 'Легендарный', chance: 8 };
  if (ratio >= 0.4) return { rarity: 'legendary', color: '#c32f80', name: 'Легендарный', chance: 12 };
  if (ratio >= 0.3) return { rarity: 'epic', color: '#8e4dde', name: 'Эпический', chance: 18 };
  if (ratio >= 0.2) return { rarity: 'rare', color: '#4f66e3', name: 'Рарный', chance: 25 };
  return { rarity: 'common', color: '#7c94ae', name: 'Обычный', chance: 28 };
}

// Генерация цен
function generatePrices(min, max, count) {
  const prices = [];
  const step = (max - min) / (count - 1);
  
  for (let i = 0; i < count; i++) {
    const price = Math.round(min + (step * i));
    prices.push(price);
  }
  
  return prices;
}

// Генерация конфига для кейса
function generateCaseConfig(casePrice) {
  const config = CASES[casePrice];
  if (!config) return null;
  
  const folderPath = path.join(__dirname, `content-case/${casePrice}`);
  
  // Проверяем существует ли папка
  if (!fs.existsSync(folderPath)) {
    console.log(`⚠️ Папка не найдена: ${folderPath}`);
    return null;
  }
  
  // Читаем все PNG файлы
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));
  
  if (files.length === 0) {
    console.log(`⚠️ Нет PNG файлов в: ${folderPath}`);
    return null;
  }
  
  // Генерируем цены
  const prices = generatePrices(config.min, config.max, files.length);
  
  // Создаем призы
  const prizes = files.map((file, index) => {
    const price = prices[index];
    const rarityInfo = getRarityByPrice(price, config.max);
    
    return {
      id: index + 1,
      image: `main/content-case/${casePrice}/${file}`,
      price: price,
      rarity: rarityInfo.rarity,
      rarityColor: rarityInfo.color,
      rarityName: rarityInfo.name,
      chance: rarityInfo.chance
    };
  });
  
  // Нормализуем шансы (чтобы сумма = 100)
  const totalChance = prizes.reduce((sum, p) => sum + p.chance, 0);
  prizes.forEach(p => {
    p.chance = Math.round((p.chance / totalChance) * 100);
  });
  
  return {
    caseId: casePrice,
    caseName: `Кейс ${casePrice}₽`,
    casePrice: casePrice,
    prizes: prizes,
    totalChance: 100
  };
}

// Генерируем все конфиги
function generateAllConfigs() {
  const allConfigs = {};
  
  for (const casePrice in CASES) {
    console.log(`\n📦 Генерация кейса ${casePrice}₽...`);
    const config = generateCaseConfig(casePrice);
    
    if (config) {
      allConfigs[casePrice] = config;
      console.log(`✅ Создано ${config.prizes.length} призов`);
      console.log(`   RTP: ~${Math.round((config.prizes.reduce((sum, p) => sum + (p.price * p.chance / 100), 0) / casePrice) * 100)}%`);
      
      // Сохраняем в отдельный файл
      const outputPath = path.join(__dirname, `content-case/${casePrice}/config.json`);
      fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`   Сохранен: ${outputPath}`);
    }
  }
  
  // Сохраняем общий файл
  const allConfigsPath = path.join(__dirname, 'all-cases-config.json');
  fs.writeFileSync(allConfigsPath, JSON.stringify(allConfigs, null, 2), 'utf8');
  console.log(`\n✅ Общий конфиг сохранен: ${allConfigsPath}`);
  console.log(`\n📊 Всего кейсов: ${Object.keys(allConfigs).length}`);
}

// Запуск
if (require.main === module) {
  generateAllConfigs();
}

module.exports = { generateCaseConfig, generateAllConfigs };
