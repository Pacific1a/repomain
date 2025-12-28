// ============================================
// REFERRAL TRACKER
// Отслеживание событий в боте и отправка на сайт
// ============================================

const fs = require('fs');
const path = require('path');
const PartnerWebhook = require('./partner-webhook');

class ReferralTracker {
  constructor() {
    // Инициализация webhook
    this.webhook = new PartnerWebhook();
    
    // Локальное хранилище реферальных связей
    this.dataDir = path.join(__dirname, 'data');
    this.referralLinksFile = path.join(this.dataDir, 'referral-links.json');
    this.depositHistoryFile = path.join(this.dataDir, 'deposit-history.json');
    
    // Создаем папку если нет
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Загружаем данные
    this.referralLinks = this.loadJSON(this.referralLinksFile, {});
    this.depositHistory = this.loadJSON(this.depositHistoryFile, {});
    
    console.log('✅ ReferralTracker initialized');
    console.log(`📊 Tracked users: ${Object.keys(this.referralLinks).length}`);
  }
  
  // Загрузка JSON файла
  loadJSON(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (error) {
      console.error(`❌ Error loading ${filePath}:`, error);
    }
    return defaultValue;
  }
  
  // Сохранение JSON файла
  saveJSON(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`❌ Error saving ${filePath}:`, error);
    }
  }
  
  // ============================================
  // ОСНОВНЫЕ МЕТОДЫ
  // ============================================
  
  /**
   * Обработка старта бота с реферальной ссылкой
   * Вызывается когда пользователь открывает бот по ссылке t.me/bot?start=ref_PARTNER123
   */
  async handleStart(userId, startParam) {
    console.log(`🚀 Bot start: user=${userId}, param=${startParam}`);
    
    // Проверяем что это реферальная ссылка
    if (!startParam || !startParam.startsWith('ref_')) {
      console.log('⏭️ Not a referral link');
      return { success: false, reason: 'not_referral' };
    }
    
    // Извлекаем код партнера
    const referralCode = startParam.replace('ref_', '');
    
    // Проверяем что пользователь не переходит по своей ссылке
    if (referralCode === userId.toString()) {
      console.log('⚠️ User tried to use own referral link');
      return { success: false, reason: 'self_referral' };
    }
    
    // 🔒 ОГРАНИЧЕНИЕ: Проверяем что пользователь еще не привязан к ЛЮБОМУ партнеру
    // Один telegram_id может использовать ТОЛЬКО ОДНУ реферальную ссылку
    const existingReferralCode = this.referralLinks[userId];
    if (existingReferralCode) {
      console.log(`🚫 User ${userId} already linked to partner: ${existingReferralCode} (tried to use: ${referralCode})`);
      return { success: false, reason: 'already_linked', existingPartner: existingReferralCode };
    }
    
    // Сохраняем связь
    this.referralLinks[userId] = referralCode;
    this.saveJSON(this.referralLinksFile, this.referralLinks);
    
    console.log(`✅ User ${userId} linked to partner ${referralCode}`);
    
    // Отправляем webhook на сайт
    if (this.webhook.isEnabled()) {
      await this.webhook.trackClick(referralCode, userId);
    }
    
    return { success: true, referralCode: referralCode };
  }
  
  /**
   * Обработка пополнения баланса
   * Вызывается когда пользователь пополняет баланс
   */
  async handleDeposit(userId, amount) {
    console.log(`💰 Deposit: user=${userId}, amount=${amount}`);
    
    // Проверяем есть ли партнер у этого пользователя
    const referralCode = this.referralLinks[userId];
    if (!referralCode) {
      console.log('⏭️ User has no referral link');
      return { success: false, reason: 'no_referral' };
    }
    
    // Проверяем это первый депозит или нет
    if (!this.depositHistory[userId]) {
      this.depositHistory[userId] = {
        firstDeposit: amount,
        firstDepositTime: Date.now(),
        totalDeposits: amount,
        depositCount: 1
      };
      this.saveJSON(this.depositHistoryFile, this.depositHistory);
      
      console.log(`🎉 First deposit for user ${userId}: ${amount}`);
      
      // Отправляем webhook о первом депозите
      if (this.webhook.isEnabled()) {
        await this.webhook.trackFirstDeposit(referralCode, userId, amount);
      }
      
      return { success: true, isFirst: true, referralCode: referralCode };
    } else {
      // Обновляем историю депозитов
      this.depositHistory[userId].totalDeposits += amount;
      this.depositHistory[userId].depositCount += 1;
      this.saveJSON(this.depositHistoryFile, this.depositHistory);
      
      console.log(`💵 Repeat deposit for user ${userId}: ${amount} (total: ${this.depositHistory[userId].depositCount})`);
      
      // Отправляем webhook об обновлении депозита
      if (this.webhook.isEnabled()) {
        await this.webhook.trackDeposit(referralCode, userId, amount);
      }
      
      return { success: true, isFirst: false, referralCode: referralCode };
    }
  }
  
  /**
   * Обработка проигрыша в игре
   * Вызывается когда пользователь проигрывает деньги (партнер получает процент)
   */
  async handleLoss(userId, lossAmount, gameType = 'unknown') {
    console.log(`📉 Loss: user=${userId}, amount=${lossAmount}, game=${gameType}`);
    
    // Проверяем есть ли партнер у этого пользователя
    const referralCode = this.referralLinks[userId];
    if (!referralCode) {
      console.log('⏭️ User has no referral link');
      return { success: false, reason: 'no_referral' };
    }
    
    // Отправляем webhook о начислении дохода партнеру
    if (this.webhook.isEnabled()) {
      await this.webhook.trackEarnings(referralCode, userId, lossAmount, gameType);
    }
    
    return { success: true, referralCode: referralCode };
  }
  
  /**
   * Обработка выигрыша в игре (только для статистики)
   */
  async handleWin(userId, winAmount, gameType = 'unknown') {
    console.log(`📈 Win: user=${userId}, amount=${winAmount}, game=${gameType}`);
    
    const referralCode = this.referralLinks[userId];
    if (!referralCode) {
      return { success: false, reason: 'no_referral' };
    }
    
    // Отправляем статистику (можно расширить API на сайте)
    return { success: true, referralCode: referralCode };
  }
  
  /**
   * Получить реферального партнера пользователя
   */
  getReferralCode(userId) {
    return this.referralLinks[userId] || null;
  }
  
  /**
   * Проверить есть ли у пользователя партнер
   */
  hasReferral(userId) {
    return !!this.referralLinks[userId];
  }
  
  /**
   * Получить статистику пользователя
   */
  getUserStats(userId) {
    return {
      referralCode: this.referralLinks[userId] || null,
      depositHistory: this.depositHistory[userId] || null
    };
  }
}

// Экспорт синглтона
let instance = null;

function getReferralTracker() {
  if (!instance) {
    instance = new ReferralTracker();
  }
  return instance;
}

module.exports = getReferralTracker;

// Использование в server.js:
// const getReferralTracker = require('./referral-tracker');
// const tracker = getReferralTracker();
// 
// // При старте бота:
// await tracker.handleStart(userId, startParam);
// 
// // При пополнении:
// await tracker.handleDeposit(userId, amount);
// 
// // При проигрыше:
// await tracker.handleLoss(userId, lossAmount, 'crash');
