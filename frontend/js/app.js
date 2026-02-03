// API Configuration
const API_URL = 'http://localhost:3000/api';

// Auth State
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateCartCount();
});

// Check Authentication
async function checkAuth() {
    if (!authToken) {
        updateAuthUI(null);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            updateAuthUI(currentUser);
        } else {
            logout();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
    }
}

// Update Auth UI
function updateAuthUI(user) {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    if (user) {
        authSection.innerHTML = `
            <div class="user-menu">
                <span class="user-name">Привет, ${user.name}!</span>
                ${user.role === 'admin' ? '<a href="/pages/admin/dashboard.html" class="btn btn-sm btn-outline">Админка</a>' : ''}
                <a href="/pages/orders.html" class="btn btn-sm btn-outline">Заказы</a>
                <button onclick="logout()" class="btn btn-sm btn-danger">Выйти</button>
            </div>
        `;
    } else {
        authSection.innerHTML = `
            <a href="/pages/login.html" class="btn btn-outline">Войти</a>
            <a href="/pages/register.html" class="btn btn-primary">Регистрация</a>
        `;
    }
}

// Login
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            showToast('Вход выполнен успешно!', 'success');
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = '/pages/admin/dashboard.html';
            } else {
                window.location.href = '/';
            }
        } else {
            showToast(data.error || 'Ошибка входа', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения с сервером', 'error');
    }
}

// Register
async function register(email, password, name) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, name })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            showToast('Регистрация успешна!', 'success');
            window.location.href = '/';
        } else {
            showToast(data.error || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения с сервером', 'error');
    }
}

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateAuthUI(null);
    window.location.href = '/';
}

// Update Cart Count
async function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (!cartCountEl) return;

    if (!authToken) {
        cartCountEl.textContent = '0';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const count = data.items.reduce((sum, item) => sum + item.quantity, 0);
            cartCountEl.textContent = count;
        }
    } catch (error) {
        console.error('Failed to update cart count:', error);
    }
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Format Price
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(price);
}

// BUG #6: Функция форматирует дату в US формате вместо RU
function formatDate(dateString) {
    const date = new Date(dateString);
    // Баг: используется US формат MM/DD/YYYY вместо DD.MM.YYYY
    return date.toLocaleDateString('en-US'); // Должно быть 'ru-RU'
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    return response;
}