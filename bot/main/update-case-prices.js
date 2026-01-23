// Обновление цен по конкретному списку
const fs = require('fs');
const path = require('path');

// КОНКРЕТНЫЕ ЦЕНЫ ДЛЯ КАЖДОГО КЕЙСА (из твоего списка)
const CASE_PRICES = {
  279: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1500],
  329: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 2000],
  389: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 2000],
  419: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2500],
  479: [100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 3000],
  529: [150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000],
  659: [200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  777: [200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  819: [250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  939: [350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  999: [400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000]
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

// Обновление конфига для кейса
function updateCaseConfig(casePrice) {
  const prices = CASE_PRICES[casePrice];
  if (!prices) {
    console.log(`⚠️ Нет цен для кейса ${casePrice}`);
    return null;
  }
  
  const folderPath = path.join(__dirname, `content-case/${casePrice}`);
  
  if (!fs.existsSync(folderPath)) {
    console.log(`⚠️ Папка не найдена: ${folderPath}`);
    return null;
  }
  
  // Читаем все PNG файлы
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));
  
  // Если файлов меньше - обрезаем список цен
  const usePrices = files.length < prices.length 
    ? prices.slice(0, files.length) 
    : prices;
  
  if (files.length < prices.length) {
    console.log(`⚠️ Кейс ${casePrice}: файлов ${files.length}, цен ${prices.length} → используем первые ${files.length} цен`);
  }
  
  const maxPrice = Math.max(...usePrices);
  
  // Создаем призы с КОНКРЕТНЫМИ ценами
  const prizes = usePrices.map((price, index) => {
    const rarityInfo = getRarityByPrice(price, maxPrice);
    
    return {
      id: index + 1,
      image: `main/content-case/${casePrice}/${files[index]}`,
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
  
  const config = {
    caseId: casePrice.toString(),
    caseName: `Кейс ${casePrice}₽`,
    casePrice: casePrice.toString(),
    prizes: prizes,
    totalChance: 100
  };
  
  return config;
}

// Обновляем все конфиги
function updateAllConfigs() {
  const allConfigs = {};
  
  for (const casePrice in CASE_PRICES) {
    console.log(`\n📦 Обновление кейса ${casePrice}₽...`);
    const config = updateCaseConfig(parseInt(casePrice));
    
    if (config) {
      allConfigs[casePrice] = config;
      console.log(`✅ Создано ${config.prizes.length} призов (нужно ${CASE_PRICES[casePrice].length})`);
      
      const avgWin = config.prizes.reduce((sum, p) => sum + (p.price * p.chance / 100), 0);
      const rtp = Math.round((avgWin / casePrice) * 100);
      console.log(`   💰 Средний выигрыш: ${Math.round(avgWin)}₽`);
      console.log(`   📊 RTP: ${rtp}%`);
      
      // Сохраняем в отдельный файл
      const outputPath = path.join(__dirname, `content-case/${casePrice}/config.json`);
      fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`   💾 Сохранен: ${outputPath}`);
    }
  }
  
  // Сохраняем общий файл
  const allConfigsPath = path.join(__dirname, 'all-cases-config.json');
  fs.writeFileSync(allConfigsPath, JSON.stringify(allConfigs, null, 2), 'utf8');
  console.log(`\n✅ Общий конфиг сохранен: ${allConfigsPath}`);
  console.log(`\n📊 Всего кейсов обновлено: ${Object.keys(allConfigs).length}`);
}

// Запуск
if (require.main === module) {
  console.log('🎯 ОБНОВЛЕНИЕ ЦЕН ПО КОНКРЕТНОМУ СПИСКУ\n');
  updateAllConfigs();
}

module.exports = { updateCaseConfig, updateAllConfigs };
