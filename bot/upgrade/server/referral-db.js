// ============ РЕФЕРАЛЬНАЯ СИСТЕМА С MONGODB ============
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Модель Referral
let Referral;
try {
  Referral = require('./models/Referral');
} catch (err) {
  console.log('⚠️ Referral model not loaded');
}

// Fallback JSON файл
const DATA_DIR = path.join(__dirname, 'data');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(REFERRALS_FILE)) {
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify({}));
}

// Проверка доступности MongoDB
function isMongoAvailable() {
  return Referral && mongoose.connection.readyState === 1;
}

// ============ CRUD ОПЕРАЦИИ ============

// Получить данные о рефералах пользователя
async function getReferralData(telegramId) {
  if (isMongoAvailable()) {
    let user = await Referral.findOne({ userId: telegramId });
    if (!user) {
      user = new Referral({
        userId: telegramId,
        referralCode: telegramId,
        referralBalance: 0,
        referrals: [],
        totalEarnings: 0
      });
      await user.save();
      console.log(`✅ Created new referral record in MongoDB for ${telegramId}`);
    }
    return user.toObject();
  }
  
  // Fallback JSON
  const referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
  if (!referrals[telegramId]) {
    referrals[telegramId] = {
      referralCode: telegramId,
      referralBalance: 0,
      referrals: [],
      totalEarnings: 0
    };
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
  }
  return referrals[telegramId];
}

// Зарегистрировать реферала
async function registerReferral(userId, referrerId) {
  if (isMongoAvailable()) {
    // Проверяем, не зареган ли уже
    let user = await Referral.findOne({ userId });
    if (user && user.referredBy) {
      return { success: false, message: 'Already referred' };
    }
    
    // Создаем или обновляем пользователя
    if (!user) {
      user = new Referral({
        userId,
        referralCode: userId,
        referredBy: referrerId
      });
    } else {
      user.referredBy = referrerId;
    }
    await user.save();
    
    // Инициализируем рефералку для referrer если нет
    let referrer = await Referral.findOne({ userId: referrerId });
    if (!referrer) {
      referrer = new Referral({
        userId: referrerId,
        referralCode: referrerId,
        referralBalance: 0,
        referrals: [],
        totalEarnings: 0
      });
    }
    
    // Добавляем в список рефералов
    const existingRef = referrer.referrals.find(r => r.userId === userId);
    if (!existingRef) {
      referrer.referrals.push({
        userId,
        registeredAt: new Date(),
        totalEarnings: 0
      });
      await referrer.save();
      console.log(`✅ MongoDB: User ${userId} registered by ${referrerId}`);
    }
    
    return { success: true, referrerId };
  }
  
  // Fallback JSON
  const referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
  
  if (!referrals[referrerId]) {
    referrals[referrerId] = {
      referralCode: referrerId,
      referralBalance: 0,
      referrals: [],
      totalEarnings: 0
    };
  }
  
  const alreadyReferred = referrals[referrerId].referrals.some(ref => ref.userId === userId);
  
  if (!alreadyReferred) {
    referrals[referrerId].referrals.push({
      userId,
      registeredAt: Date.now(),
      totalWinnings: 0,
      totalEarnings: 0
    });
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
    console.log(`✅ JSON: User ${userId} registered by ${referrerId}`);
    return { success: true, referrerId };
  }
  
  return { success: false, message: 'Already referred' };
}

// Начислить процент рефереру
async function addReferralEarnings(userId, amount) {
  const commission = amount * 0.10; // 10%
  
  if (isMongoAvailable()) {
    // Находим кто пригласил этого пользователя
    const user = await Referral.findOne({ userId });
    if (!user || !user.referredBy) {
      return { success: false, message: 'No referrer found' };
    }
    
    // Находим реферера
    const referrer = await Referral.findOne({ userId: user.referredBy });
    if (!referrer) {
      return { success: false, message: 'Referrer not found' };
    }
    
    // Начисляем баланс рефереру
    referrer.referralBalance += commission;
    referrer.totalEarnings += commission;
    
    // Обновляем earnings в списке рефералов
    const refIndex = referrer.referrals.findIndex(r => r.userId === userId);
    if (refIndex !== -1) {
      referrer.referrals[refIndex].totalEarnings += commission;
    }
    
    await referrer.save();
    console.log(`✅ MongoDB: Added ${commission}₽ to referrer ${user.referredBy}`);
    
    return {
      success: true,
      commission,
      referrerId: user.referredBy,
      newBalance: referrer.referralBalance
    };
  }
  
  // Fallback JSON
  const referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
  
  // Находим кто пригласил этого пользователя
  let referrerId = null;
  for (const [refId, refData] of Object.entries(referrals)) {
    if (refData.referrals && refData.referrals.some(r => r.userId === userId)) {
      referrerId = refId;
      break;
    }
  }
  
  if (!referrerId) {
    return { success: false, message: 'No referrer found' };
  }
  
  // Начисляем баланс
  referrals[referrerId].referralBalance += commission;
  referrals[referrerId].totalEarnings += commission;
  
  // Обновляем earnings в списке
  const refIndex = referrals[referrerId].referrals.findIndex(r => r.userId === userId);
  if (refIndex !== -1) {
    referrals[referrerId].referrals[refIndex].totalEarnings += commission;
  }
  
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
  console.log(`✅ JSON: Added ${commission}₽ to referrer ${referrerId}`);
  
  return {
    success: true,
    commission,
    referrerId,
    newBalance: referrals[referrerId].referralBalance
  };
}

// Вывести средства
async function withdrawReferralBalance(userId, amount) {
  if (amount < 1500) {
    return { success: false, error: 'Minimum withdrawal amount is 1500₽' };
  }
  
  if (isMongoAvailable()) {
    const user = await Referral.findOne({ userId });
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    if (user.referralBalance < amount) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    const commission = amount * 0.05; // 5%
    const amountToTransfer = amount - commission;
    
    user.referralBalance -= amount;
    await user.save();
    
    console.log(`✅ MongoDB: Withdrawn ${amount}₽ (${amountToTransfer}₽ after commission) from ${userId}`);
    
    return {
      success: true,
      withdrawn: amount,
      commission,
      transferred: amountToTransfer,
      newBalance: user.referralBalance
    };
  }
  
  // Fallback JSON
  const referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
  
  if (!referrals[userId]) {
    return { success: false, error: 'User not found' };
  }
  
  if (referrals[userId].referralBalance < amount) {
    return { success: false, error: 'Insufficient balance' };
  }
  
  const commission = amount * 0.05;
  const amountToTransfer = amount - commission;
  
  referrals[userId].referralBalance -= amount;
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
  
  console.log(`✅ JSON: Withdrawn ${amount}₽ from ${userId}`);
  
  return {
    success: true,
    withdrawn: amount,
    commission,
    transferred: amountToTransfer,
    newBalance: referrals[userId].referralBalance
  };
}

module.exports = {
  getReferralData,
  registerReferral,
  addReferralEarnings,
  withdrawReferralBalance,
  isMongoAvailable
};
