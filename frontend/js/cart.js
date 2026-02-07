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
        bindCartItemNavigation(container);

    } catch (error) {
        console.error('Failed to load cart:', error);
        container.innerHTML = '<div class="error">Ошибка загрузки корзины</div>';
    }
}

// Create Cart Item HTML
function createCartItem(item) {
    return `
        <div class="cart-item cart-item-clickable" data-id="${item.id}" data-product-id="${item.product_id}" role="link" tabindex="0">
            <img src="${getProductImageUrl(item.image)}" alt="${item.name}" class="cart-item-image"
                 onerror="handleProductImageError(this)">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="999"
                           inputmode="numeric" onchange="updateQuantity(${item.id}, this.value, ${item.quantity})">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">
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

function bindCartItemNavigation(container) {
    const interactiveSelector = '.quantity-btn, .quantity-input, .cart-item-remove';
    const itemElements = container.querySelectorAll('.cart-item-clickable');

    itemElements.forEach((itemElement) => {
        const openProductPage = () => {
            const productId = itemElement.dataset.productId;
            if (!productId) return;
            window.location.href = `/pages/product.html?id=${encodeURIComponent(productId)}`;
        };

        itemElement.addEventListener('click', (event) => {
            if (event.target.closest(interactiveSelector)) {
                return;
            }
            openProductPage();
        });

        itemElement.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            if (event.target.closest(interactiveSelector)) {
                return;
            }
            event.preventDefault();
            openProductPage();
        });
    });
}

function parseQuantityValue(rawValue) {
    const normalized = String(rawValue ?? '').trim();
    if (!normalized) return null;
    if (!/^-?\d+$/.test(normalized)) return null;

    const quantity = Number.parseInt(normalized, 10);
    if (!Number.isInteger(quantity)) return null;

    return quantity;
}

// Update Quantity
async function updateQuantity(cartItemId, rawQuantity, previousQuantity = null) {
    const parsedQuantity = parseQuantityValue(rawQuantity);

    if (parsedQuantity === null) {
        showToast('Введите корректное целое число', 'warning');
        loadCart();
        return;
    }

    const quantity = Math.min(parsedQuantity, 999);
    if (quantity < 0) {
        showToast('Количество не может быть отрицательным', 'warning');
        loadCart();
        return;
    }

    if (quantity === previousQuantity) return;

    try {
        const response = await apiRequest(`/cart/${cartItemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        });

        if (response.ok) {
            loadCart();
            updateCartCount();
        } else {
            showToast('Ошибка обновления количества', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения', 'error');
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
