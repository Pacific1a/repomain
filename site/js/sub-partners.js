// ============================================
// SUB-PARTNERS MANAGER
// Handles sub-partner data loading and display
// ============================================

class SubPartnersManager {
    constructor() {
        this.stats = {
            totalEarnings: 0,
            partnersCount: 0
        };
        this.partners = [];
    }
    
    /**
     * Load sub-partner stats and list
     */
    async loadData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('⚠️ No token - user not logged in');
                return;
            }
            
            // Load stats
            const statsResponse = await fetch('/api/referral/sub-partners/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                this.stats = {
                    totalEarnings: statsData.totalEarnings || 0,
                    partnersCount: statsData.partnersCount || 0
                };
                console.log('📊 Sub-partner stats loaded:', this.stats);
            }
            
            // Load partners list
            const listResponse = await fetch('/api/referral/sub-partners/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (listResponse.ok) {
                const listData = await listResponse.json();
                this.partners = listData.partners || [];
                console.log('📊 Sub-partners list loaded:', this.partners.length);
            }
            
            this.updateUI();
        } catch (error) {
            console.error('❌ Error loading sub-partner data:', error);
        }
    }
    
    /**
     * Update modal UI with loaded data
     */
    updateUI() {
        // Update stats
        const earningsEl = document.querySelector('.sub_partner .sp-earnings');
        const countEl = document.querySelector('.sub_partner .sp-count');
        
        if (earningsEl) {
            earningsEl.textContent = `${this.stats.totalEarnings.toFixed(2)}₽`;
        }
        
        if (countEl) {
            countEl.textContent = this.stats.partnersCount;
        }
        
        // Update partners list
        const listContainer = document.querySelector('.sub_partner .sp-list-container');
        
        if (listContainer) {
            if (this.partners.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; opacity: 0.5;">
                        Вы ещё не привлекли партнёров
                    </div>
                `;
            } else {
                listContainer.innerHTML = this.partners.map(partner => `
                    <div style="padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; border-left: 3px solid #b00000;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: bold;">${this.escapeHtml(partner.partner_login || partner.partner_email || 'Партнёр')}</div>
                                <div style="font-size: 11px; opacity: 0.6;">
                                    Присоединился: ${this.formatDate(partner.joined_at)}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #b00000; font-weight: bold;">+${(partner.sub_partner_cut || 0).toFixed(2)}₽</div>
                                <div style="font-size: 11px; opacity: 0.6;">
                                    из ${(partner.total_earnings || 0).toFixed(2)}₽
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }
    
    /**
     * Format date for display
     */
    formatDate(dateStr) {
        if (!dateStr) return 'Неизвестно';
        
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Сегодня';
        if (diffDays === 1) return 'Вчера';
        if (diffDays < 7) return `${diffDays} дн. назад`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} мес. назад`;
        return `${Math.floor(diffDays / 365)} лет назад`;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Global instance
const subPartnersManager = new SubPartnersManager();

// Load data when modal opens
document.addEventListener('DOMContentLoaded', () => {
    // Listen for modal open events
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('sub_partner')) {
                    // Sub-partner modal was opened
                    subPartnersManager.loadData();
                }
            });
        });
    });
    
    // Watch for modal changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
