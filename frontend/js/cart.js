// Cart Page Logic
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cart-container')) {
        loadCart();
    }
});

// Load Cart
async function loadCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;

    if (!authToken) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sign-in-alt"></i>
                <h3>Войдите в аккаунт</h3>
                <p>Чтобы просмотреть корзину, необходимо авторизоваться</p>
                <a href="/pages/login.html" class="btn btn-primary">Войти</a>
            </div>
        `;
        return;
    }

    try {
        const response = await apiRequest('/cart');
        const data = await response.json();

        if (data.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Корзина пуста</h3>
                    <p>Добавьте товары из каталога</p>
                    <a href="/" class="btn btn-primary">В каталог</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="cart-items">
                <h3>Товары в корзине</h3>
                ${data.items.map(item => createCartItem(item)).join('')}
            </div>
            <div class="cart-summary">
                <h3>Итого</h3>
                <div class="summary-row">
                    <span>Товары (${data.items.reduce((s, i) => s + i.quantity, 0)})</span>
                    <span>${formatPrice(data.total)}</span>
                </div>
                <div class="summary-row">
                    <span>Доставка</span>
                    <span>Бесплатно</span>
                </div>
                <div class="summary-row summary-total">
                    <span>К оплате</span>
                    <span>${formatPrice(data.total)}</span>
                </div>
                <a href="/pages/checkout.html" class="btn btn-primary" style="width: 100%; margin-top: 20px;">
                    <i class="fas fa-credit-card"></i>
                    Оформить заказ
                </a>
            </div>
        `;

    } catch (error) {
        console.error('Failed to load cart:', error);
        container.innerHTML = '<div class="error">Ошибка загрузки корзины</div>';
    }
}

// Create Cart Item HTML
function createCartItem(item) {
    return `
        <div class="cart-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image"
                 onerror="this.src='https://via.placeholder.com/100?text=No+Image'">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1}, ${item.stock})">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${Math.max(1, item.stock)}"
                           onchange="updateQuantity(${item.id}, this.value, ${item.stock}, this)">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1}, ${item.stock})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div class="cart-item-remove" onclick="removeFromCart(${item.id})">
                <i class="fas fa-trash"></i>
            </div>
        </div>
    `;
}

// Update Quantity
function normalizeQuantity(quantity, maxStock) {
    const rawValue = String(quantity).trim();
    if (!rawValue) return null;

    const parsed = Math.trunc(Number(rawValue));
    if (!Number.isFinite(parsed)) return null;
    if (parsed <= 0) return 0;
    if (Number.isFinite(maxStock) && maxStock > 0) {
        return Math.min(parsed, maxStock);
    }
    return parsed;
}

async function updateQuantity(cartItemId, quantity, maxStock = null, inputElement = null) {
    const normalizedQuantity = normalizeQuantity(quantity, maxStock);
    if (normalizedQuantity === null) {
        showToast('Enter a valid quantity', 'error');
        loadCart();
        return;
    }

    if (inputElement && normalizedQuantity > 0) {
        inputElement.value = normalizedQuantity;
    }

    try {
        const response = await apiRequest(`/cart/${cartItemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity: normalizedQuantity })
        });

        if (response.ok) {
            loadCart();
            updateCartCount();
        } else {
            let message = 'Failed to update quantity';
            try {
                const data = await response.json();
                if (data?.error) message = data.error;
            } catch (e) {}
            showToast(message, 'error');
            loadCart();
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Remove from Cart
async function removeFromCart(cartItemId) {
    try {
        const response = await apiRequest(`/cart/${cartItemId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Товар удалён из корзины', 'success');
            loadCart();
            updateCartCount();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения', 'error');
    }
}
