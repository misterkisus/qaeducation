// ============ API CONFIGURATION ============
// Автоматически определяем URL API на основе текущего хоста.
const API_URL = window.location.origin + '/api';

// Или можно использовать относительный путь:
// const API_URL = '/api';

let currentUser = null;
let authToken = localStorage.getItem('authToken');

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    ensureWishlistNav();
    checkAuth();
    updateCartCount();
    updateWishlistCount();
});

// ============ AUTH FUNCTIONS ============
async function checkAuth() {
    if (!authToken) {
        updateAuthUI(null);
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
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

// ============ HEADER HELPERS ============
function ensureWishlistNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    let wishlistLink = nav.querySelector('a[href="/pages/wishlist.html"]');

    if (wishlistLink) {
        if (!wishlistLink.querySelector('#wishlist-count')) {
            const count = document.createElement('span');
            count.className = 'cart-count';
            count.id = 'wishlist-count';
            count.textContent = '0';
            wishlistLink.appendChild(count);
        }
        return;
    }

    wishlistLink = document.createElement('a');
    wishlistLink.href = '/pages/wishlist.html';
    wishlistLink.className = 'nav-link';

    if (window.location.pathname.endsWith('/pages/wishlist.html')) {
        wishlistLink.classList.add('active');
    }

    wishlistLink.innerHTML = '<i class="fas fa-heart"></i> Избранное <span class="cart-count" id="wishlist-count">0</span>';

    const cartLink = nav.querySelector('a[href="/pages/cart.html"]');
    if (cartLink) {
        nav.insertBefore(wishlistLink, cartLink);
    } else {
        nav.appendChild(wishlistLink);
    }
}

// ============ COUNTERS ============
async function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;

    if (!authToken) {
        el.textContent = '0';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/cart`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (res.ok) {
            const data = await res.json();
            el.textContent = data.items.reduce((sum, item) => sum + item.quantity, 0);
        }
    } catch (e) {
        console.error('Cart count error:', e);
    }
}

async function updateWishlistCount() {
    ensureWishlistNav();

    const els = document.querySelectorAll('#wishlist-count');
    if (!els.length) return;

    if (!authToken) {
        els.forEach((el) => {
            el.textContent = '0';
        });
        return;
    }

    try {
        const res = await fetch(`${API_URL}/wishlist/count`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (!res.ok) {
            els.forEach((el) => {
                el.textContent = '0';
            });
            return;
        }

        const data = await res.json();
        const safeCount = Number.isFinite(data?.count) ? data.count : 0;

        els.forEach((el) => {
            el.textContent = String(safeCount);
        });
    } catch (e) {
        console.error('Wishlist count error:', e);
    }
}

// ============ UI HELPERS ============
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success'
        ? 'check-circle'
        : type === 'error'
            ? 'exclamation-circle'
            : type === 'warning'
                ? 'exclamation-triangle'
                : 'info-circle';

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

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU');
}

// ============ API HELPER ============
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    return response;
}

console.log('API URL:', API_URL);
