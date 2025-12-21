// Telegram User Data Loader
class TelegramUserData {
    constructor() {
        this.userData = null;
        this.maxNicknameLength = 12; // РњР°РєСЃРёРјР°Р»СЊРЅР°СЏ РґР»РёРЅР° РЅРёРєР° СЃ С‚СЂРѕРµС‚РѕС‡РёРµРј
        // РќРµ РІС‹Р·С‹РІР°РµРј init() Р·РґРµСЃСЊ, СЌС‚Рѕ Р±СѓРґРµС‚ СЃРґРµР»Р°РЅРѕ РїРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ СЌРєР·РµРјРїР»СЏСЂР°
    }

    init() {
        // Р–РґРµРј Р·Р°РіСЂСѓР·РєРё Telegram WebApp API
        if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
            this.loadUserData();
        } else {
            // Р–РґРµРј Р·Р°РіСЂСѓР·РєРё API СЃ Р·Р°РґРµСЂР¶РєРѕР№
            setTimeout(() => {
                if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
                    this.loadUserData();
                } else {
                    this.setTestData();
                }
            }, 1000);
        }
    }

    loadUserData() {
        try {
            const tg = window.Telegram.WebApp;
            
            // РџСЂРѕР±СѓРµРј СЂР°Р·РЅС‹Рµ СЃРїРѕСЃРѕР±С‹ РїРѕР»СѓС‡РµРЅРёСЏ РґР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
            let user = null;
            
            // РЎРїРѕСЃРѕР± 1: initDataUnsafe
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                user = tg.initDataUnsafe.user;
            }
            
            // РЎРїРѕСЃРѕР± 2: initData (РµСЃР»Рё РїРµСЂРІС‹Р№ РЅРµ СЃСЂР°Р±РѕС‚Р°Р»)
            if (!user && tg.initData) {
                try {
                    const initData = new URLSearchParams(tg.initData);
                    const userData = initData.get('user');
                    if (userData) {
                        user = JSON.parse(decodeURIComponent(userData));
                    } else {
                        // РїР°СЂР°РјРµС‚СЂ user РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚, РѕСЃС‚Р°РІР»СЏРµРј user = null
                    }
                } catch (e) {
                    // initData РЅРµ СЃРѕРґРµСЂР¶РёС‚ РєРѕСЂСЂРµРєС‚РЅС‹Р№ JSON РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
                }
            }
            
            // РЎРїРѕСЃРѕР± 3: РџСЂСЏРјРѕР№ РґРѕСЃС‚СѓРї Рє tg.user (РµСЃР»Рё РµСЃС‚СЊ)
            if (!user && tg.user) {
                user = tg.user;
            }
            
            // РЎРїРѕСЃРѕР± 4: РџСЂРѕР±СѓРµРј РїРѕР»СѓС‡РёС‚СЊ РёР· URL РїР°СЂР°РјРµС‚СЂРѕРІ
            if (!user) {
                const urlParams = new URLSearchParams(window.location.search);
                const userParam = urlParams.get('user');
                if (userParam) {
                    try {
                        user = JSON.parse(decodeURIComponent(userParam));
                    } catch (e) {
                        // РЅРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ JSON РІ РїР°СЂР°РјРµС‚СЂРµ user
                    }
                }
            }
            
            // РЎРїРѕСЃРѕР± 5: РџСЂРѕР±СѓРµРј РїРѕР»СѓС‡РёС‚СЊ РёР· hash
            if (!user && window.location.hash) {
                try {
                    const hashData = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
                    if (hashData.user) {
                        user = hashData.user;
                    }
                } catch (e) {
                    // РЅРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ JSON РІ hash
                }
            }
            
            if (user) {
                this.userData = {
                    id: user.id,
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    username: user.username || '',
                    photoUrl: user.photo_url || '',
                    isPremium: user.is_premium || false
                };
                this.updateUI();
            } else {
                this.setTestData();
            }
        } catch (error) {
            this.setTestData();
        }
    }

    setTestData() {
        this.userData = {
            id: 123456789,
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            photoUrl: '',
            isPremium: false
        };
        this.updateUI();
    }

    getDisplayName() {
        if (!this.userData) return 'Loading...';
        
        let displayName = this.userData.firstName;
        if (this.userData.lastName) {
            displayName += ' ' + this.userData.lastName;
        }
        
        // РћР±СЂРµР·Р°РµРј РґР»РёРЅРЅС‹Рµ РёРјРµРЅР°
        if (displayName.length > this.maxNicknameLength) {
            displayName = displayName.substring(0, this.maxNicknameLength - 3) + '...';
        }
        
        return displayName;
    }

    getUserId() {
        return this.userData ? this.userData.id : null;
    }

    getUsername() {
        return this.userData ? this.userData.username : '';
    }

    getPhotoUrl() {
        return this.userData ? this.userData.photoUrl : '';
    }

    updateUI() {
        const displayName = this.getDisplayName();
        
        // РЎРѕР·РґР°РµРј РіР»РѕР±Р°Р»СЊРЅС‹Р№ РѕР±СЉРµРєС‚ РґР»СЏ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё
        window.TelegramUserData = {
            id: this.getUserId(),
            first_name: this.userData?.firstName || '',
            last_name: this.userData?.lastName || '',
            username: this.userData?.username || '',
            photo_url: this.getPhotoUrl(),
            is_premium: this.userData?.isPremium || false
        };
        
        // РћР±РЅРѕРІР»СЏРµРј РІСЃРµ Р±Р»РѕРєРё account-info
        const accountInfoBlocks = document.querySelectorAll('.account-info');
        accountInfoBlocks.forEach(block => {
            const nicknameElement = block.querySelector('.nickname .text-wrapper');
            if (nicknameElement) {
                nicknameElement.textContent = displayName;
            }
            
            const avatarElement = block.querySelector('.avatar');
            if (avatarElement && this.getPhotoUrl()) {
                avatarElement.style.backgroundImage = `url(${this.getPhotoUrl()})`;
                avatarElement.style.backgroundSize = 'cover';
                avatarElement.style.backgroundPosition = 'center';
            }
        });

        // РћР±РЅРѕРІР»СЏРµРј РІСЃРµ Р±Р»РѕРєРё acc-info
        const accInfoBlocks = document.querySelectorAll('.acc-info');
        accInfoBlocks.forEach(block => {
            const nickElement = block.querySelector('.nick .text-wrapper');
            if (nickElement) {
                nickElement.textContent = this.getDisplayName();
            }
            
            const idElement = block.querySelector('.element .div');
            if (idElement) {
                idElement.textContent = `#${this.getUserId()}`;
            }
            
            const avatarElement = block.querySelector('.avatar');
            if (avatarElement && this.getPhotoUrl()) {
                avatarElement.style.backgroundImage = `url(${this.getPhotoUrl()})`;
                avatarElement.style.backgroundSize = 'cover';
                avatarElement.style.backgroundPosition = 'center';
            }
        });

        // РћР±РЅРѕРІР»СЏРµРј РґСЂСѓРіРёРµ РІР°СЂРёР°РЅС‚С‹ Р±Р»РѕРєРѕРІ СЃ РЅРёРєРЅРµР№РјР°РјРё
        const devBlocks = document.querySelectorAll('.dev .text-wrapper');
        devBlocks.forEach(block => {
            block.textContent = this.getDisplayName();
        });

        // РћР±РЅРѕРІР»СЏРµРј Р°РІР°С‚Р°СЂС‹ РІ СЃРїРёСЃРєР°С… РёРіСЂРѕРєРѕРІ
        const playerAvatars = document.querySelectorAll('.acc-inf .avatar-2, .acc-inf .avatar-3, .acc-inf .avatar-4');
        playerAvatars.forEach(avatar => {
            if (this.getPhotoUrl()) {
                avatar.style.backgroundImage = `url(${this.getPhotoUrl()})`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
            }
        });

        // РћР±РЅРѕРІР»СЏРµРј РЅРёРєРЅРµР№РјС‹ РІ СЃРїРёСЃРєР°С… РёРіСЂРѕРєРѕРІ (РјР°СЃРєРёСЂСѓРµРј РґР»СЏ РїСЂРёРІР°С‚РЅРѕСЃС‚Рё)
        const playerNicks = document.querySelectorAll('.acc-inf .text-wrapper-22, .acc-inf .text-wrapper-26, .acc-inf .text-wrapper-37, .acc-inf .text-wrapper-40');
        playerNicks.forEach(nick => {
            const displayName = this.getDisplayName();
            if (displayName.length > 3) {
                const maskedName = displayName.charAt(0) + '***' + displayName.charAt(displayName.length - 1);
                nick.textContent = maskedName;
            }
        });
    }

    refresh() {
        this.loadUserData();
    }
}

// Р–РґРµРј Р·Р°РіСЂСѓР·РєРё Telegram API РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј СЌРєР·РµРјРїР»СЏСЂР°
function initTelegramUser() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        window.TelegramUser = new TelegramUserData();
        window.TelegramUser.init(); // Р’С‹Р·С‹РІР°РµРј init РїРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ
    } else {
        // Р•СЃР»Рё API РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅ, Р¶РґРµРј
        setTimeout(initTelegramUser, 100);
    }
}

// Р—Р°РїСѓСЃРєР°РµРј РёРЅРёС†РёР°Р»РёР·Р°С†РёСЋ
initTelegramUser();

document.addEventListener('DOMContentLoaded', function() {
    // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј Telegram WebApp РµСЃР»Рё РґРѕСЃС‚СѓРїРµРЅ
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
    }
    
    // Р–РґРµРј СЃРѕР·РґР°РЅРёСЏ СЌРєР·РµРјРїР»СЏСЂР° TelegramUser
    const checkTelegramUser = () => {
        if (window.TelegramUser) {
            window.TelegramUser.updateUI();
        } else {
            setTimeout(checkTelegramUser, 100);
        }
    };
    
    checkTelegramUser();
});

// Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° С‡РµСЂРµР· 3 СЃРµРєСѓРЅРґС‹
setTimeout(() => {
    if (window.TelegramUser) {
        if (!window.TelegramUser.getUserId() || window.TelegramUser.getUserId() === 123456789) {
            window.TelegramUser.refresh();
        }
    }
}, 3000);

