// Products Page Logic
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('products-grid')) {
        loadProducts();
        loadCategories();
        setupFilters();
    }
});

// Load Products
async function loadProducts(params = {}) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        let url = `${API_URL}/products`;
        const queryParams = new URLSearchParams();

        if (params.category) queryParams.append('category', params.category);
        if (params.search) queryParams.append('search', params.search);
        if (params.sort) queryParams.append('sort', params.sort);

        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }

        const response = await fetch(url);
        const products = await response.json();

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>Товары не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => createProductCard(product)).join('');

    } catch (error) {
        console.error('Failed to load products:', error);
        grid.innerHTML = '<div class="error">Ошибка загрузки товаров</div>';
    }
}

// Create Product Card HTML
function createProductCard(product) {
    const stockClass = product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : '';
    const stockText = product.stock === 0 ? 'Нет в наличии' : 
                      product.stock < 10 ? `Осталось: ${product.stock}` : 
                      'В наличии';

    return `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image" 
                 onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-category">${product.category}</div>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-stock ${stockClass}">${stockText}</div>
                <div class="product-actions">
                    <a href="/pages/product.html?id=${product.id}" class="btn btn-outline btn-sm">
                        Подробнее
                    </a>
                    <button class="btn btn-primary btn-sm" 
                            onclick="addToCart(${product.id})"
                            ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                        В корзину
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load Categories
async function loadCategories() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    try {
        const response = await fetch(`${API_URL}/products/meta/categories`);
        const categories = await response.json();

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

// Setup Filters
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');

    let searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }
}

// Apply Filters
function applyFilters() {
    const search = document.getElementById('search-input')?.value || '';
    const category = document.getElementById('category-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || '';

    loadProducts({ search, category, sort });
}

// Add to Cart
// BUG #7 (Minor): Нет защиты от двойного клика
async function addToCart(productId) {
    if (!authToken) {
        showToast('Войдите для добавления в корзину', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    // Баг: кнопка не блокируется при клике, можно кликнуть много раз

    try {
        const response = await apiRequest('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity: 1 })
        });

        if (response.ok) {
            showToast('Товар добавлен в корзину', 'success');
            updateCartCount();
        } else {
            const data = await response.json();
            showToast(data.error || 'Ошибка добавления в корзину', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения', 'error');
    }
}