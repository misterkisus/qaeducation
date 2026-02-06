// ============ API CONFIGURATION ============
// Автоматически определяем URL API на основе текущего хоста
const API_URL = window.location.origin + '/api';

// Или просто используй относительный путь (тоже работает):
// const API_URL = '/api';

let currentUser = null;
let authToken = localStorage.getItem('authToken');
const THEME_STORAGE_KEY = 'techshop-theme';
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

initializeTheme();

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    ensureThemeToggle();
    updateThemeToggleButton();
    checkAuth(); 
    updateCartCount(); 
});

// ============ THEME ============
function initializeTheme() {
    applyTheme(getSavedTheme());
}

function getSavedTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return savedTheme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    } catch (e) {
        return THEMES.LIGHT;
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
        console.warn('Failed to save theme:', e);
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function isDarkThemeEnabled() {
    return document.documentElement.getAttribute('data-theme') === THEMES.DARK;
}

function ensureThemeToggle() {
    if (document.getElementById('theme-toggle-btn')) {
        return;
    }

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.id = 'theme-toggle-btn';
    toggleButton.className = 'theme-toggle-btn';
    toggleButton.addEventListener('click', toggleTheme);
    document.body.appendChild(toggleButton);
}

function updateThemeToggleButton() {
    const toggleButton = document.getElementById('theme-toggle-btn');
    if (!toggleButton) return;

    if (isDarkThemeEnabled()) {
        toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
        toggleButton.setAttribute('aria-label', 'Switch to light theme');
        toggleButton.title = 'Switch to light theme';
    } else {
        toggleButton.innerHTML = '<i class="fas fa-moon"></i>';
        toggleButton.setAttribute('aria-label', 'Switch to dark theme');
        toggleButton.title = 'Switch to dark theme';
    }
}

function toggleTheme() {
    const nextTheme = isDarkThemeEnabled() ? THEMES.LIGHT : THEMES.DARK;
    applyTheme(nextTheme);
    saveTheme(nextTheme);
    updateThemeToggleButton();
}

// ============ AUTH FUNCTIONS ============
async function checkAuth() {
    if (!authToken) { 
        updateAuthUI(null); 
        return; 
    }
    try {
        const res = await fetch(`${API_URL}/auth/me`, { 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        });
        if (res.ok) { 
            currentUser = await res.json(); 
            updateAuthUI(currentUser); 
        } else {
            logout();
        }
    } catch (e) { 
        console.error('Auth check failed:', e);
        logout(); 
    }
}

function updateAuthUI(user) {
    const el = document.getElementById('auth-section');
    if (!el) return;
    if (user) {
        el.innerHTML = `<div class="user-menu">
            <span class="user-name" title="${user.name}">Привет, ${user.name}!</span>
            ${user.role === 'admin' ? '<a href="/pages/admin/dashboard.html" class="btn btn-sm btn-outline">Админка</a>' : ''}
            <a href="/pages/orders.html" class="btn btn-sm btn-outline">Заказы</a>
            <button onclick="logout()" class="btn btn-sm btn-danger">Выйти</button>
        </div>`;
    } else {
        el.innerHTML = '<a href="/pages/login.html" class="btn btn-outline">Войти</a><a href="/pages/register.html" class="btn btn-primary">Регистрация</a>';
    }
    updateThemeToggleButton();
}

async function login(email, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email, password }) 
        });
        const data = await res.json();
        if (res.ok) {
            authToken = data.token; 
            localStorage.setItem('authToken', authToken); 
            currentUser = data.user;
            showToast('Вход выполнен!', 'success');
            window.location.href = data.user.role === 'admin' ? '/pages/admin/dashboard.html' : '/';
        } else {
            showToast(data.error || 'Ошибка входа', 'error');
        }
    } catch (e) { 
        console.error('Login error:', e);
        showToast('Ошибка соединения с сервером', 'error'); 
    }
}

async function register(email, password, name) {
    try {
        const res = await fetch(`${API_URL}/auth/register`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email, password, name }) 
        });
        const data = await res.json();
        if (res.ok) {
            authToken = data.token; 
            localStorage.setItem('authToken', authToken);
            showToast('Регистрация успешна!', 'success'); 
            window.location.href = '/';
        } else {
            showToast(data.error || 'Ошибка регистрации', 'error');
        }
    } catch (e) { 
        console.error('Register error:', e);
        showToast('Ошибка соединения с сервером', 'error'); 
    }
}

function logout() { 
    authToken = null; 
    currentUser = null; 
    localStorage.removeItem('authToken'); 
    updateAuthUI(null); 
    window.location.href = '/'; 
}

// ============ CART FUNCTIONS ============
async function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    
    if (!authToken) { 
        el.textContent = '0'; 
        return; 
    }
    
    try {
        const res = await fetch(`${API_URL}/cart`, { 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        });
        if (res.ok) { 
            const data = await res.json(); 
            el.textContent = data.items.reduce((s, i) => s + i.quantity, 0); 
        }
    } catch (e) {
        console.error('Cart count error:', e);
    }
}

// ============ UI HELPERS ============
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function formatPrice(price) { 
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', 
        currency: 'RUB' 
    }).format(price); 
}

// BUG #6: Дата в американском формате вместо русского
function formatDate(dateString) { 
    return new Date(dateString).toLocaleDateString('en-US'); // Должно быть 'ru-RU'
}

// ============ API HELPER ============
async function apiRequest(endpoint, options = {}) {
    const headers = { 
        'Content-Type': 'application/json', 
        ...options.headers 
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, { 
        ...options, 
        headers 
    });
    
    return response;
}

// Для отладки - показать текущий API URL в консоли
console.log('API URL:', API_URL);


