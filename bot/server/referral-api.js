// ============================================
// REFERRAL API ENDPOINTS
// ============================================
// Добавьте этот код в server.js

const REFERRALS_FILE = path.join(__dirname, 'data', 'referrals.json');

// Создаем файл если его нет
if (!fs.existsSync(REFERRALS_FILE)) {
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify({}));
}

// ============ REFERRAL ENDPOINTS ============

// Получить данные о рефералах пользователя
app.get('/api/referral/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
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
    
    res.json(referrals[telegramId]);
    console.log(`📊 Referral data loaded for ${telegramId}`);
  } catch (error) {
    console.error('❌ Error loading referral data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Зарегистрировать реферала
app.post('/api/referral/register', async (req, res) => {
  try {
    const { userId, referrerId } = req.body;
    
    if (!userId || !referrerId) {
      return res.status(400).json({ error: 'Missing userId or referrerId' });
    }
    
    // Проверяем, не пытается ли пользователь пригласить сам себя
    if (userId === referrerId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }
    
    const referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
    
    // Инициализируем данные реферера если их нет
    if (!referrals[referrerId]) {
      referrals[referrerId] = {
        referralCode: referrerId,
        referralBalance: 0,
        referrals: [],
        totalEarnings: 0
      };
    }
    
    // Проверяем, не зарегистрирован ли уже этот пользователь
    const alreadyReferred = referrals[referrerId].referrals.some(ref => ref.userId === userId);
    
    if (!alreadyReferred) {
      // Добавляем реферала
      referrals[referrerId].referrals.push({
        userId: userId,
        registeredAt: Date.now(),
        totalWinnings: 0,
        totalEarnings: 0
      });
      
      fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
      
      console.log(`✅ User ${userId} registered by referrer ${referrerId}`);
      res.json({ success: true, referrerId: referrerId });
    } else {
      res.json({ success: false, message: 'Already referred' });
    }
  } catch (error) {
    console.error('❌ Error registering referral:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Начислить процент рефереру
app.post('/api/referral/add-earnings', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing userId or amount' });
    }
    
    const referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
    
    // Находим, кто привел этого пользователя
    let referrerId = null;
    for (const [refId, refData] of Object.entries(referrals)) {
      const referral = refData.referrals.find(ref => ref.userId === userId);
      if (referral) {
        referrerId = refId;
        
        // Обновляем статистику реферала
        referral.totalWinnings = (referral.totalWinnings || 0) + amount;
        
        // Начисляем 10% рефереру
        const commission = amount * 0.10;
        refData.referralBalance = (refData.referralBalance || 0) + commission;
        refData.totalEarnings = (refData.totalEarnings || 0) + commission;
        referral.totalEarnings = (referral.totalEarnings || 0) + commission;
        
        fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
        
        console.log(`💰 Added ${commission}₽ to referrer ${referrerId} from ${userId}'s win ${amount}₽`);
        
        // Отправляем через WebSocket
        io.emit(`referral_earnings_${referrerId}`, {
          userId: userId,
          amount: commission,
          totalBalance: refData.referralBalance
        });
        
        res.json({ 
          success: true, 
          referrerId: referrerId,
          commission: commission,
          referralBalance: refData.referralBalance
        });
        return;
      }
    }
    
    // Реферер не найден
    res.json({ success: false, message: 'No referrer found' });
  } catch (error) {
    console.error('❌ Error adding earnings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Вывести средства с реферального баланса
app.post('/api/referral/withdraw', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing userId or amount' });
    }
    
    const referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
    
    if (!referrals[userId]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userRef = referrals[userId];
    
    if (userRef.referralBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Рассчитываем комиссию 5%
    const commission = amount * 0.05;
    const amountToTransfer = amount - commission;
    
    // Списываем с реферального баланса
    userRef.referralBalance -= amount;
    
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
    
    // Добавляем на основной баланс
    const balances = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
    if (!balances[userId]) {
      balances[userId] = { rubles: 0, chips: 0 };
    }
    balances[userId].rubles += amountToTransfer;
    fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
    
    // Создаем транзакцию
    const transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    if (!transactions[userId]) {
      transactions[userId] = [];
    }
    transactions[userId].push({
      id: Date.now().toString(),
      type: 'add',
      amount: amountToTransfer,
      source: 'referral',
      description: `Вывод с реферального баланса (комиссия ${commission.toFixed(2)}₽)`,
      timestamp: Date.now(),
      date: new Date().toISOString()
    });
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    
    console.log(`💸 Withdrawal: ${amount}₽ from referral balance, ${amountToTransfer}₽ to main (commission: ${commission}₽)`);
    
    // Уведомляем через WebSocket
    io.emit(`balance_updated_${userId}`, {
      rubles: balances[userId].rubles,
      chips: balances[userId].chips
    });
    
    res.json({
      success: true,
      withdrawn: amount,
      commission: commission,
      received: amountToTransfer,
      newReferralBalance: userRef.referralBalance,
      newMainBalance: balances[userId].rubles
    });
  } catch (error) {
    console.error('❌ Error withdrawing:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

console.log('✅ Referral API endpoints loaded');
