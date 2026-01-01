// Определяем API URL в зависимости от того, откуда открыт сайт
const API_BASE_URL = (() => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Если localhost или пусто (file://) - используем localhost с портом 10000
    if (!host || host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:10000/api';
    }
    
    // Для продакшена (Render) - используем тот же протокол и домен БЕЗ порта
    // Render автоматически проксирует запросы на правильный порт
    return `${protocol}//${host}/api`;
})();

class API {
    static getToken() {
        return localStorage.getItem('authToken');
    }
    
    static setToken(token) {
        localStorage.setItem('authToken', token);
    }
    
    static removeToken() {
        localStorage.removeItem('authToken');
    }
    
    static setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    static getUserFromStorage() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    static async register(email, login, password, telegram, referralCode = null) {
        try {
            const payload = { email, login, password, telegram };
            
            // Добавляем referralCode если он передан (для sub-партнерства)
            if (referralCode) {
                payload.referralCode = referralCode;
                console.log('📎 Регистрация с партнёрским кодом:', referralCode);
            }
            
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.setToken(data.token);
                this.setUser(data.user);
            }
            
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async login(emailOrLogin, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emailOrLogin, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.setToken(data.token);
                this.setUser(data.user);
            }
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async resetPassword(emailOrLogin) {
        try {
            const response = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emailOrLogin })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async confirmPasswordReset(resetToken, newPassword) {
        try {
            const response = await fetch(`${API_BASE_URL}/confirm-reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resetToken, newPassword })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Confirm password reset error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async getUserFromServer() {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const response = await fetch(`${API_BASE_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.setUser(data.user);
            }
            
            return data;
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async updateUser(updates) {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const response = await fetch(`${API_BASE_URL}/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            
            if (data.success && data.user) {
                const currentUser = this.getUserFromStorage();
                this.setUser({ ...currentUser, ...data.user });
            }
            
            return data;
        } catch (error) {
            console.error('Update user error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static logout() {
        this.removeToken();
        localStorage.removeItem('user');
    }
    
    static isAuthenticated() {
        return !!this.getToken();
    }
    
    // ============================================
    // 2FA METHODS
    // ============================================
    
    static async setup2FA() {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const response = await fetch(`${API_BASE_URL}/2fa/setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('2FA setup error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async enable2FA(secret, token) {
        try {
            const authToken = this.getToken();
            if (!authToken) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const payload = { secret, token };
            console.log('API.enable2FA - Sending payload:', payload);
            
            const response = await fetch(`${API_BASE_URL}/2fa/enable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            console.log('API.enable2FA - Response:', result);
            
            return result;
        } catch (error) {
            console.error('2FA enable error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async disable2FA(token) {
        try {
            const authToken = this.getToken();
            if (!authToken) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const response = await fetch(`${API_BASE_URL}/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ token })
            });
            
            return await response.json();
        } catch (error) {
            console.error('2FA disable error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async check2FAStatus() {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const response = await fetch(`${API_BASE_URL}/2fa/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('2FA status error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async reset2FA() {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const response = await fetch(`${API_BASE_URL}/2fa/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('2FA reset error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
    
    static async verify2FACode(code) {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'Токен отсутствует' };
            }
            
            const response = await fetch(`${API_BASE_URL}/2fa/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token: code })
            });
            
            return await response.json();
        } catch (error) {
            console.error('2FA verify error:', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }
}
