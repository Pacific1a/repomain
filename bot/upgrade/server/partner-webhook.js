// ============================================
// PARTNER WEBHOOK SYSTEM
// Отправка данных от бота на партнерский сайт
// ============================================

const https = require('https');
const http = require('http');
const { URL } = require('url');

class PartnerWebhook {
  constructor(partnerSiteUrl, apiSecret) {
    this.partnerSiteUrl = partnerSiteUrl || process.env.PARTNER_SITE_URL;
    this.apiSecret = apiSecret || process.env.PARTNER_API_SECRET || 'default-secret-key';
    this.enabled = !!this.partnerSiteUrl;
    
    if (this.enabled) {
      console.log('✅ Partner Webhook enabled:', this.partnerSiteUrl);
    } else {
      console.warn('⚠️ Partner Webhook disabled: PARTNER_SITE_URL not set');
    }
  }
  
  // Проверка что webhook включен
  isEnabled() {
    return this.enabled;
  }
  
  // Базовая функция отправки HTTP запроса
  async sendRequest(endpoint, data) {
    if (!this.enabled) {
      console.log('⏭️ Webhook disabled, skipping:', endpoint);
      return { success: false, reason: 'disabled' };
    }
    
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(endpoint, this.partnerSiteUrl);
        const postData = JSON.stringify(data);
        
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'X-API-Secret': this.apiSecret
          },
          timeout: 10000 // 10 секунд таймаут
        };
        
        const protocol = url.protocol === 'https:' ? https : http;
        
        const req = protocol.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              console.log(`✅ Webhook success [${endpoint}]:`, parsed);
              resolve({ success: true, data: parsed, statusCode: res.statusCode });
            } catch (e) {
              console.log(`✅ Webhook sent [${endpoint}] (status: ${res.statusCode})`);
              resolve({ success: true, statusCode: res.statusCode });
            }
          });
        });
        
        req.on('error', (error) => {
          console.error(`❌ Webhook error [${endpoint}]:`, error.message);
          resolve({ success: false, error: error.message });
        });
        
        req.on('timeout', () => {
          req.destroy();
          console.error(`⏱️ Webhook timeout [${endpoint}]`);
          resolve({ success: false, error: 'timeout' });
        });
        
        req.write(postData);
        req.end();
      } catch (error) {
        console.error(`❌ Webhook exception [${endpoint}]:`, error.message);
        resolve({ success: false, error: error.message });
      }
    });
  }
  
  // ============================================
  // WEBHOOK МЕТОДЫ
  // ============================================
  
  /**
   * Регистрация клика по реферальной ссылке
   * Вызывается когда пользователь переходит по ссылке t.me/bot?start=ref_PARTNER123
   */
  async trackClick(referralCode, userId) {
    console.log(`🔗 Tracking click: ref=${referralCode}, user=${userId}`);
    
    return await this.sendRequest('/api/referral/click', {
      referralCode: referralCode,
      userId: userId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Регистрация первого депозита реферала
   * Вызывается при первом пополнении баланса
   */
  async trackFirstDeposit(referralCode, userId, depositAmount) {
    console.log(`💰 Tracking first deposit: ref=${referralCode}, user=${userId}, amount=${depositAmount}`);
    
    return await this.sendRequest('/api/referral/register-referral', {
      referralCode: referralCode,
      referralUserId: userId,
      depositAmount: depositAmount,
      timestamp: Date.now()
    });
  }
  
  /**
   * Обновление депозита реферала (повторное пополнение)
   */
  async trackDeposit(referralCode, userId, depositAmount) {
    console.log(`💵 Tracking deposit: ref=${referralCode}, user=${userId}, amount=${depositAmount}`);
    
    return await this.sendRequest('/api/referral/update-deposit', {
      referralCode: referralCode,
      referralUserId: userId,
      depositAmount: depositAmount,
      timestamp: Date.now()
    });
  }
  
  /**
   * Начисление дохода партнеру (когда реферал проигрывает)
   * Вызывается после игры когда пользователь проиграл деньги
   */
  async trackEarnings(referralCode, userId, lossAmount, gameType = 'unknown') {
    console.log(`📈 Tracking earnings: ref=${referralCode}, user=${userId}, loss=${lossAmount}, game=${gameType}`);
    
    return await this.sendRequest('/api/referral/add-earnings', {
      referralCode: referralCode,
      referralUserId: userId,
      lossAmount: lossAmount,
      gameType: gameType,
      timestamp: Date.now()
    });
  }
  
  /**
   * Отправка статистики игр реферала
   */
  async trackGameStats(referralCode, userId, stats) {
    console.log(`📊 Tracking game stats: ref=${referralCode}, user=${userId}`);
    
    return await this.sendRequest('/api/referral/game-stats', {
      referralCode: referralCode,
      referralUserId: userId,
      stats: stats,
      timestamp: Date.now()
    });
  }
}

// Экспорт
module.exports = PartnerWebhook;

// Использование в server.js:
// const PartnerWebhook = require('./partner-webhook');
// const partnerWebhook = new PartnerWebhook(process.env.PARTNER_SITE_URL, process.env.PARTNER_API_SECRET);
// 
// // При переходе по ссылке:
// await partnerWebhook.trackClick(referralCode, userId);
// 
// // При первом пополнении:
// await partnerWebhook.trackFirstDeposit(referralCode, userId, amount);
// 
// // При проигрыше:
// await partnerWebhook.trackEarnings(referralCode, userId, lossAmount, 'crash');
