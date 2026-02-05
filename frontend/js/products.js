document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('products-grid')) { 
        loadProducts(); 
        loadCategories(); 
        setupFilters(); 
    }
});

async function loadProducts(params = {}) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Загрузка...</p></div>';
    
    try {
        let url = `${API_URL}/products`;
        const qp = new URLSearchParams();
        
        if (params.category) qp.append('category', params.category);
        if (params.search) qp.append('search', params.search);
        if (params.sort) qp.append('sort', params.sort);
        if (qp.toString()) url += `?${qp.toString()}`;
        
        console.log('Fetching products from:', url); // Для отладки
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        const products = await res.json();
        
        if (!products.length) { 
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open"></i>
                    <h3>Товары не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `; 
            return; 
        }
        
        grid.innerHTML = products.map(p => createProductCard(p)).join('');
        
    } catch (e) { 
        console.error('Failed to load products:', e);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>Не удалось загрузить товары. Попробуйте обновить страницу.</p>
                <button class="btn btn-primary" onclick="loadProducts()">Повторить</button>
            </div>
        `; 
    }
}

function createProductCard(p) {
    const stockClass = p.stock === 0 ? 'out' : p.stock < 10 ? 'low' : '';
    const stockText = p.stock === 0 ? 'Нет в наличии' : p.stock < 10 ? `Осталось: ${p.stock}` : 'В наличии';
    const actionButton = p.stock === 0
        ? `<button class="btn btn-out-of-stock btn-sm" disabled>
                    <i class="fas fa-ban"></i> Нет в наличии
                </button>`
        : `<button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">
                    <i class="fas fa-cart-plus"></i> В корзину
                </button>`;
    
    return `<div class="product-card">
        <div style="position: relative;">
            <img src="${p.image}" alt="${p.name}" class="product-image" 
                 onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            <button class="wishlist-btn" onclick="event.preventDefault(); toggleWishlist(${p.id}, this)" 
                    title="Добавить в избранное"
                    style="position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; 
                           border-radius: 50%; border: none; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                           cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="far fa-heart" style="color: #e74c3c; font-size: 1.1rem;"></i>
            </button>
        </div>
        <div class="product-info">
            <div class="product-name" data-tooltip="${p.name}">
                <span class="product-name__text">${p.name}</span>
            </div>
            <div class="product-category">${p.category}</div>
            <div class="product-price">${formatPrice(p.price)}</div>
            <div class="product-stock ${stockClass}">${stockText}</div>
            <div class="product-actions">
                <a href="/pages/product.html?id=${p.id}" class="btn btn-outline btn-sm">Подробнее</a>
                ${actionButton}
            </div>
        </div>
    </div>`;
}

async function loadCategories() {
    const select = document.getElementById('category-filter');
    if (!select) return;
    
    try {
        const res = await fetch(`${API_URL}/products/meta/categories`);
        const cats = await res.json();
        
        cats.forEach(c => { 
            const opt = document.createElement('option'); 
            opt.value = c; 
            opt.textContent = c; 
            select.appendChild(opt); 
        });
    } catch (e) {
        console.error('Failed to load categories:', e);
    }
}

function setupFilters() {
    const search = document.getElementById('search-input');
    const cat = document.getElementById('category-filter');
    const sort = document.getElementById('sort-filter');
    let timeout;
    
    if (search) {
        search.addEventListener('input', () => { 
            clearTimeout(timeout); 
            timeout = setTimeout(applyFilters, 300); 
        });
    }
    if (cat) cat.addEventListener('change', applyFilters);
    if (sort) sort.addEventListener('change', applyFilters);
}

function applyFilters() {
    loadProducts({
        search: document.getElementById('search-input')?.value || '',
        category: document.getElementById('category-filter')?.value || '',
        sort: document.getElementById('sort-filter')?.value || ''
    });
}

// BUG #7: Нет защиты от двойного клика
async function addToCart(productId) {
    if (!authToken) { 
        showToast('Войдите для добавления в корзину', 'warning'); 
        window.location.href = '/pages/login.html'; 
        return; 
    }
    
    try {
        const res = await apiRequest('/cart/add', { 
            method: 'POST', 
            body: JSON.stringify({ productId, quantity: 1 }) 
        });
        
        if (res.ok) { 
            showToast('Товар добавлен в корзину', 'success'); 
            updateCartCount(); 
        } else { 
            const d = await res.json(); 
            showToast(d.error || 'Ошибка', 'error'); 
        }
    } catch (e) { 
        console.error('Add to cart error:', e);
        showToast('Ошибка соединения', 'error'); 
    }
}

// BUG #16 & #18: Нет защиты от двойного клика и счётчик не обновляется автоматически
async function toggleWishlist(productId, btn) {
    if (!authToken) {
        showToast('Войдите, чтобы добавить в избранное', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }
    
    const icon = btn.querySelector('i');
    const isInWishlist = icon.classList.contains('fas');
    
    try {
        if (isInWishlist) {
            // Удаляем из избранного
            const res = await apiRequest(`/wishlist/product/${productId}`, { method: 'DELETE' });
            if (res.ok) {
                icon.classList.remove('fas');
                icon.classList.add('far');
                showToast('Удалено из избранного', 'success');
            }
        } else {
            // Добавляем в избранное (БАГ: нет защиты от двойного клика)
            const res = await apiRequest('/wishlist/add', {
                method: 'POST',
                body: JSON.stringify({ productId })
            });
            if (res.ok) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                showToast('Добавлено в избранное', 'success');
            } else {
                const data = await res.json();
                showToast(data.error || 'Ошибка', 'error');
            }
        }
        // BUG #18: Счётчик в шапке не обновляется!
        // Правильно было бы: updateWishlistCount();
    } catch (e) {
        showToast('Ошибка соединения', 'error');
    }
}
