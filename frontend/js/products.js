let wishlistProductIds = new Set();
let isWishlistStateLoaded = false;
let wishlistStatePromise = null;
let productsAbortController = null;
let productsRequestId = 0;
let hasLoadedProductsOnce = false;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('products-grid')) {
        loadProducts({}, { showSkeleton: true });
        loadCategories();
        setupFilters();
        if (typeof updateWishlistCount === 'function') {
            updateWishlistCount();
        }
    }
});

async function ensureWishlistStateLoaded(force = false) {
    if (!authToken) {
        wishlistProductIds = new Set();
        isWishlistStateLoaded = true;
        return;
    }

    if (isWishlistStateLoaded && !force) {
        return;
    }

    if (wishlistStatePromise && !force) {
        await wishlistStatePromise;
        return;
    }

    wishlistStatePromise = (async () => {
        try {
            const res = await apiRequest('/wishlist');
            if (!res.ok) {
                wishlistProductIds = new Set();
                return;
            }

            const data = await res.json();
            wishlistProductIds = new Set(
                (data.items || []).map((item) => Number(item.product_id))
            );
        } catch (e) {
            console.error('Failed to preload wishlist state:', e);
            wishlistProductIds = new Set();
        } finally {
            isWishlistStateLoaded = true;
            wishlistStatePromise = null;
        }
    })();

    await wishlistStatePromise;
}

async function loadProducts(params = {}, options = {}) {
    const { showSkeleton = false } = options;
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const requestId = ++productsRequestId;
    if (productsAbortController) productsAbortController.abort();
    productsAbortController = new AbortController();

    if (showSkeleton && !hasLoadedProductsOnce) {
        grid.innerHTML = createProductSkeletons();
    }
    grid.classList.add('is-loading');

    try {
        await ensureWishlistStateLoaded();

        let url = `${API_URL}/products`;
        const qp = new URLSearchParams();

        if (params.category) qp.append('category', params.category);
        if (params.search) qp.append('search', params.search);
        if (params.sort) qp.append('sort', params.sort);
        if (qp.toString()) url += `?${qp.toString()}`;

        const res = await fetch(url, { signal: productsAbortController.signal });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const products = await res.json();
        if (requestId !== productsRequestId) return;

        if (!products.length) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open"></i>
                    <h3>No products found</h3>
                    <p>Try changing your search filters</p>
                </div>
            `;
            hasLoadedProductsOnce = true;
            return;
        }

        grid.innerHTML = products.map((p) => createProductCard(p)).join('');
        hasLoadedProductsOnce = true;
    } catch (e) {
        if (e.name === 'AbortError') return;
        if (requestId !== productsRequestId) return;

        console.error('Failed to load products:', e);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Loading error</h3>
                <p>Could not load products. Please refresh the page.</p>
                <button class="btn btn-primary" onclick="loadProducts()">Retry</button>
            </div>
        `;
        hasLoadedProductsOnce = true;
    } finally {
        if (requestId === productsRequestId) {
            grid.classList.remove('is-loading');
        }
    }
}

function createProductSkeletons(count = 8) {
    return Array.from({ length: count }, () => `
        <article class="product-card skeleton-card" aria-hidden="true">
            <div class="skeleton-media"></div>
            <div class="product-info">
                <div class="skeleton-line skeleton-line--title"></div>
                <div class="skeleton-line skeleton-line--meta"></div>
                <div class="skeleton-line skeleton-line--price"></div>
                <div class="skeleton-line skeleton-line--stock"></div>
                <div class="skeleton-actions">
                    <span class="skeleton-btn"></span>
                    <span class="skeleton-btn"></span>
                </div>
            </div>
        </article>
    `).join('');
}

function createProductCard(p) {
    const stockClass = p.stock === 0 ? 'out' : p.stock < 10 ? 'low' : '';
    const stockText = p.stock === 0 ? 'Нет в наличии' : p.stock < 10 ? `Осталось: ${p.stock}` : 'В наличии';
    const isInWishlist = wishlistProductIds.has(Number(p.id));

    const actionButton = p.stock === 0
        ? `<button class="btn btn-out-of-stock btn-sm" disabled>
                    <i class="fas fa-ban"></i> Нет в наличии
                </button>`
        : `<button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">
                    <i class="fas fa-cart-plus"></i> В корзину
                </button>`;

    return `<div class="product-card product-card--clickable"
        role="link"
        tabindex="0"
        aria-label="Open product ${p.name}"
        onclick="openProductCard(event, ${p.id})"
        onkeydown="handleProductCardKeydown(event, ${p.id})">
        <div style="position: relative;">
            <img src="${getProductImageUrl(p.image)}" alt="${p.name}" class="product-image" 
                 onerror="handleProductImageError(this)">
            <button class="wishlist-btn" onclick="event.preventDefault(); toggleWishlist(${p.id}, this)" 
                    title="${isInWishlist ? 'Удалить из избранного' : 'Добавить в избранное'}"
                    style="position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; 
                           border-radius: 50%; border: none; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                           cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="${isInWishlist ? 'fas' : 'far'} fa-heart" style="color: #e74c3c; font-size: 1.1rem;"></i>
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

function openProductCard(event, productId) {
    if (event.target.closest('.product-actions, .wishlist-btn, a, button')) {
        return;
    }

    window.location.href = `/pages/product.html?id=${productId}`;
}

function handleProductCardKeydown(event, productId) {
    if (event.key !== 'Enter' && event.key !== ' ') {
        return;
    }

    if (event.target.closest('.product-actions, .wishlist-btn, a, button')) {
        return;
    }

    event.preventDefault();
    window.location.href = `/pages/product.html?id=${productId}`;
}

async function loadCategories() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    try {
        const res = await fetch(`${API_URL}/products/meta/categories`);
        const cats = await res.json();

        cats.forEach((c) => {
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

function isAlreadyInWishlistError(message) {
    return typeof message === 'string' && /уже/i.test(message);
}

async function toggleWishlist(productId, btn) {
    if (!authToken) {
        showToast('Войдите, чтобы добавить в избранное', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    if (btn.dataset.loading === 'true') {
        return;
    }

    const icon = btn.querySelector('i');
    if (!icon) {
        return;
    }

    const isInWishlist = icon.classList.contains('fas');

    btn.dataset.loading = 'true';
    btn.disabled = true;

    try {
        if (isInWishlist) {
            const res = await apiRequest(`/wishlist/product/${productId}`, { method: 'DELETE' });
            if (res.ok) {
                icon.classList.remove('fas');
                icon.classList.add('far');
                btn.title = 'Добавить в избранное';
                wishlistProductIds.delete(Number(productId));
                showToast('Удалено из избранного', 'success');
                if (typeof updateWishlistCount === 'function') {
                    updateWishlistCount();
                }
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || 'Ошибка', 'error');
            }
        } else {
            const res = await apiRequest('/wishlist/add', {
                method: 'POST',
                body: JSON.stringify({ productId })
            });

            if (res.ok) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                btn.title = 'Удалить из избранного';
                wishlistProductIds.add(Number(productId));
                showToast('Добавлено в избранное', 'success');
                if (typeof updateWishlistCount === 'function') {
                    updateWishlistCount();
                }
            } else {
                const data = await res.json().catch(() => ({}));
                const message = data.error || 'Ошибка';

                if (res.status === 400 && isAlreadyInWishlistError(message)) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    btn.title = 'Удалить из избранного';
                    wishlistProductIds.add(Number(productId));
                    if (typeof updateWishlistCount === 'function') {
                        updateWishlistCount();
                    }
                }

                showToast(message, 'error');
            }
        }
    } catch (e) {
        console.error('Wishlist toggle error:', e);
        showToast('Ошибка соединения', 'error');
    } finally {
        btn.dataset.loading = 'false';
        btn.disabled = false;
    }
}
