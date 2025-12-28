// ============================================
// REFERRAL SERVICE
// All referral system business logic
// ============================================

const { db } = require('../config/database');

class ReferralService {
    
    /**
     * Generate unique referral code for partner
     * Format: {userId}_{timestamp}{random}
     */
    static generateReferralCode(userId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        return `${userId}_${timestamp}${random}`.toUpperCase();
    }
    
    /**
     * Get or create referral stats for partner
     */
    static async getOrCreateReferralStats(userId) {
        try {
            let stats = await db.getAsync(
                'SELECT * FROM referral_stats WHERE user_id = ?',
                [userId]
            );
            
            if (!stats) {
                const referralCode = this.generateReferralCode(userId);
                
                await db.runAsync(
                    'INSERT INTO referral_stats (user_id, referral_code) VALUES (?, ?)',
                    [userId, referralCode]
                );
                
                stats = await db.getAsync(
                    'SELECT * FROM referral_stats WHERE user_id = ?',
                    [userId]
                );
                
                console.log(`✅ Created referral stats for user ${userId}: code=${referralCode}`);
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Error getting/creating referral stats:', error);
            throw error;
        }
    }
    
    /**
     * Find partner by referral code
     */
    static async findPartnerByCode(referralCode) {
        try {
            // Try to find by full code (e.g., "1_MJ3FLZNWEE3U9")
            let stats = await db.getAsync(
                'SELECT user_id FROM referral_stats WHERE referral_code = ?',
                [referralCode]
            );
            
            if (stats) {
                return stats.user_id;
            }
            
            // Try to extract user_id from code format
            if (referralCode.includes('_')) {
                const userId = referralCode.split('_')[0];
                stats = await db.getAsync(
                    'SELECT user_id FROM referral_stats WHERE user_id = ?',
                    [userId]
                );
                
                if (stats) {
                    return stats.user_id;
                }
            }
            
            // Try as direct user_id
            stats = await db.getAsync(
                'SELECT user_id FROM referral_stats WHERE user_id = ?',
                [referralCode]
            );
            
            return stats ? stats.user_id : null;
        } catch (error) {
            console.error('❌ Error finding partner by code:', error);
            return null;
        }
    }
    
    /**
     * Register click on referral link
     * Called when user opens bot via referral link
     */
    static async registerClick(referralCode, userId) {
        try {
            console.log(`🔗 Register click: code=${referralCode}, user=${userId}`);
            
            // Find partner
            const partnerId = await this.findPartnerByCode(referralCode);
            
            if (!partnerId) {
                throw new Error('Partner not found');
            }
            
            // Check if user is trying to refer themselves
            if (partnerId.toString() === userId.toString()) {
                throw new Error('Cannot refer yourself');
            }
            
            // Check if referral already exists
            const existing = await db.getAsync(
                'SELECT id FROM referrals WHERE partner_id = ? AND referral_user_id = ?',
                [partnerId, userId]
            );
            
            // Increment clicks counter
            await db.runAsync(
                'UPDATE referral_stats SET clicks = clicks + 1 WHERE user_id = ?',
                [partnerId]
            );
            
            // Save event for chart
            await db.runAsync(
                'INSERT INTO referral_events (partner_id, referral_user_id, event_type) VALUES (?, ?, ?)',
                [partnerId, userId, 'click']
            );
            
            console.log(`✅ Click registered: partner=${partnerId}, user=${userId}`);
            
            if (existing) {
                return { 
                    success: true, 
                    alreadyExists: true, 
                    partnerId,
                    message: 'Click counted (user already referred)' 
                };
            }
            
            // Create new referral record
            const result = await db.runAsync(
                'INSERT INTO referrals (partner_id, referral_user_id) VALUES (?, ?)',
                [partnerId, userId]
            );
            
            console.log(`✅ New referral created: id=${result.lastID}`);
            
            return { 
                success: true, 
                referralId: result.lastID, 
                partnerId,
                message: 'Referral registered successfully' 
            };
        } catch (error) {
            console.error('❌ Error registering click:', error);
            throw error;
        }
    }
    
    /**
     * Register first deposit
     * Called when referred user makes their first deposit
     */
    static async registerFirstDeposit(referralCode, userId, depositAmount) {
        try {
            console.log(`💰 Register first deposit: code=${referralCode}, user=${userId}, amount=${depositAmount}`);
            
            const partnerId = await this.findPartnerByCode(referralCode);
            
            if (!partnerId) {
                throw new Error('Partner not found');
            }
            
            // Update partner stats
            await db.runAsync(`
                UPDATE referral_stats 
                SET first_deposits = first_deposits + 1,
                    deposits = deposits + 1,
                    total_deposits = total_deposits + ?
                WHERE user_id = ?
            `, [depositAmount, partnerId]);
            
            // Update referral record
            await db.runAsync(`
                UPDATE referrals 
                SET first_deposit_amount = ?,
                    total_deposits = total_deposits + ?,
                    deposits_count = deposits_count + 1
                WHERE partner_id = ? AND referral_user_id = ?
            `, [depositAmount, depositAmount, partnerId, userId]);
            
            // Save event
            await db.runAsync(
                'INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount) VALUES (?, ?, ?, ?)',
                [partnerId, userId, 'first_deposit', depositAmount]
            );
            
            console.log(`✅ First deposit registered: partner=${partnerId}, amount=${depositAmount}`);
            
            return { 
                success: true, 
                partnerId, 
                depositAmount,
                message: 'First deposit registered' 
            };
        } catch (error) {
            console.error('❌ Error registering first deposit:', error);
            throw error;
        }
    }
    
    /**
     * Update deposit (repeated deposit)
     * Called when referred user makes another deposit
     */
    static async updateDeposit(referralCode, userId, depositAmount) {
        try {
            console.log(`💵 Update deposit: code=${referralCode}, user=${userId}, amount=${depositAmount}`);
            
            const partnerId = await this.findPartnerByCode(referralCode);
            
            if (!partnerId) {
                throw new Error('Partner not found');
            }
            
            // Update partner stats
            await db.runAsync(`
                UPDATE referral_stats 
                SET deposits = deposits + 1,
                    total_deposits = total_deposits + ?
                WHERE user_id = ?
            `, [depositAmount, partnerId]);
            
            // Update referral record
            await db.runAsync(`
                UPDATE referrals 
                SET total_deposits = total_deposits + ?,
                    deposits_count = deposits_count + 1
                WHERE partner_id = ? AND referral_user_id = ?
            `, [depositAmount, partnerId, userId]);
            
            // Save event
            await db.runAsync(
                'INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount) VALUES (?, ?, ?, ?)',
                [partnerId, userId, 'deposit', depositAmount]
            );
            
            console.log(`✅ Deposit updated: partner=${partnerId}, amount=${depositAmount}`);
            
            return { 
                success: true, 
                partnerId, 
                depositAmount,
                message: 'Deposit updated' 
            };
        } catch (error) {
            console.error('❌ Error updating deposit:', error);
            throw error;
        }
    }
    
    /**
     * Add earnings to partner
     * Called when referred user loses money in game
     * Partner gets 60% of the loss
     */
    static async addEarnings(referralCode, userId, lossAmount) {
        try {
            console.log(`📈 Add earnings: code=${referralCode}, user=${userId}, loss=${lossAmount}`);
            
            const partnerId = await this.findPartnerByCode(referralCode);
            
            if (!partnerId) {
                throw new Error('Partner not found');
            }
            
            const earnings = lossAmount * 0.6;  // 60% to partner
            
            // Update partner stats
            await db.runAsync(
                'UPDATE referral_stats SET earnings = earnings + ? WHERE user_id = ?',
                [earnings, partnerId]
            );
            
            // Update referral record
            await db.runAsync(
                'UPDATE referrals SET total_earnings = total_earnings + ? WHERE partner_id = ? AND referral_user_id = ?',
                [earnings, partnerId, userId]
            );
            
            // Save event
            await db.runAsync(
                'INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount) VALUES (?, ?, ?, ?)',
                [partnerId, userId, 'earning', earnings]
            );
            
            console.log(`✅ Earnings added: partner=${partnerId}, earnings=${earnings} (60% of ${lossAmount})`);
            
            return { 
                success: true, 
                partnerId, 
                earnings,
                lossAmount,
                message: 'Earnings added' 
            };
        } catch (error) {
            console.error('❌ Error adding earnings:', error);
            throw error;
        }
    }
    
    /**
     * Get partner statistics
     * Used by partner dashboard
     */
    static async getPartnerStats(userId) {
        try {
            const stats = await this.getOrCreateReferralStats(userId);
            
            return {
                referralCode: stats.referral_code,
                clicks: stats.clicks,
                firstDeposits: stats.first_deposits,
                deposits: stats.deposits,
                totalDeposits: parseFloat(stats.total_deposits || 0).toFixed(2),
                earnings: parseFloat(stats.earnings || 0).toFixed(2),
                costPerClick: stats.clicks > 0 ? (stats.earnings / stats.clicks).toFixed(2) : '0.00',
                avgIncomePerPlayer: stats.first_deposits > 0 ? (stats.earnings / stats.first_deposits).toFixed(2) : '0.00'  // Средний доход = earnings / игроки
            };
        } catch (error) {
            console.error('❌ Error getting partner stats:', error);
            throw error;
        }
    }
    
    /**
     * Get timeline data for charts
     */
    static async getTimeline(userId, period = 'week') {
        try {
            // Determine days back
            const daysMap = {
                'week': 7,
                'month': 30,
                '3months': 90,
                '6months': 180,
                'year': 365
            };
            
            const daysBack = daysMap[period] || 7;
            
            // Calculate start date
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const startDate = new Date(now.getTime() - (daysBack - 1) * 24 * 60 * 60 * 1000);
            
            // Get events
            const events = await db.allAsync(`
                SELECT 
                    DATE(created_at) as date,
                    event_type,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM referral_events
                WHERE partner_id = ? AND created_at >= ?
                GROUP BY DATE(created_at), event_type
                ORDER BY date ASC
            `, [userId, startDate.toISOString()]);
            
            // Build timeline
            const timeline = {};
            const dateLabels = [];
            
            for (let i = 0; i < daysBack; i++) {
                const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                const dateKey = date.toISOString().split('T')[0];
                dateLabels.push(dateKey);
                timeline[dateKey] = {
                    clicks: 0,
                    firstDeposits: 0,
                    deposits: 0,
                    depositsAmount: 0,
                    earnings: 0
                };
            }
            
            // Fill with data
            events.forEach(event => {
                if (timeline[event.date]) {
                    switch(event.event_type) {
                        case 'click':
                            timeline[event.date].clicks += event.count;
                            break;
                        case 'first_deposit':
                            timeline[event.date].firstDeposits += event.count;
                            timeline[event.date].deposits += event.count;
                            timeline[event.date].depositsAmount += event.total_amount || 0;
                            break;
                        case 'deposit':
                            timeline[event.date].deposits += event.count;
                            timeline[event.date].depositsAmount += event.total_amount || 0;
                            break;
                        case 'earning':
                            timeline[event.date].earnings += event.total_amount || 0;
                            break;
                    }
                }
            });
            
            // Check if timeline is empty
            const hasData = Object.values(timeline).some(day => 
                day.clicks > 0 || day.firstDeposits > 0 || day.earnings > 0
            );
            
            // If no events, use total stats on last day
            if (!hasData && events.length === 0) {
                const stats = await db.getAsync(
                    'SELECT * FROM referral_stats WHERE user_id = ?',
                    [userId]
                );
                
                if (stats && (stats.clicks > 0 || stats.earnings > 0)) {
                    const lastDate = dateLabels[dateLabels.length - 1];
                    timeline[lastDate] = {
                        clicks: stats.clicks || 0,
                        firstDeposits: stats.first_deposits || 0,
                        deposits: stats.deposits || 0,
                        depositsAmount: stats.total_deposits || 0,
                        earnings: stats.earnings || 0
                    };
                }
            }
            
            return {
                period,
                dates: dateLabels,
                timeline
            };
        } catch (error) {
            console.error('❌ Error getting timeline:', error);
            throw error;
        }
    }
    
    /**
     * Get list of referrals for partner
     */
    static async getReferralsList(userId) {
        try {
            const referrals = await db.allAsync(`
                SELECT 
                    referral_user_id as userId,
                    first_deposit_amount as firstDeposit,
                    total_deposits as totalDeposits,
                    total_earnings as totalEarnings,
                    deposits_count as depositsCount,
                    joined_at as joinedAt
                FROM referrals
                WHERE partner_id = ?
                ORDER BY joined_at DESC
            `, [userId]);
            
            return referrals;
        } catch (error) {
            console.error('❌ Error getting referrals list:', error);
            throw error;
        }
    },
    
    /**
     * Получить referrer_code пользователя из Python БД
     * @param {string} telegramId - Telegram ID пользователя
     * @returns {Promise<string|null>} referrer_code или null
     */
    async getUserReferrer(telegramId) {
        try {
            const sqlite3 = require('sqlite3').verbose();
            const path = require('path');
            const BOT_DB_PATH = path.join(__dirname, '../../bot/autoshop/tgbot/data/database.db');
            
            return new Promise((resolve) => {
                const botDB = new sqlite3.Database(BOT_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
                    if (err) {
                        console.error('❌ Error opening bot DB for referrer lookup:', err);
                        resolve(null);
                        return;
                    }
                    
                    botDB.get(
                        'SELECT user_referrer FROM storage_users WHERE user_id = ?',
                        [telegramId],
                        (err, row) => {
                            botDB.close();
                            
                            if (err) {
                                console.error('❌ Error reading referrer from bot DB:', err);
                                resolve(null);
                                return;
                            }
                            
                            if (row && row.user_referrer) {
                                console.log(`💾 Found referrer for ${telegramId}: ${row.user_referrer}`);
                                resolve(row.user_referrer);
                            } else {
                                resolve(null);
                            }
                        }
                    );
                });
            });
        } catch (error) {
            console.error('❌ Error in getUserReferrer:', error);
            return null;
        }
    }
}

module.exports = ReferralService;
