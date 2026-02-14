// Admin Functions
let editingProductId = null;
let adminProductsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    loadAdminProducts();
    
    document.getElementById('product-form')?.addEventListener('submit', saveProduct);
});

// Load Products for Admin
async function loadAdminProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    try {
        const response = await apiRequest('/admin/products', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load products (${response.status})`);
        }
        const products = await response.json();
        adminProductsCache = products;

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>
                    <img src="${getProductImageUrl(product.image)}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                         onerror="handleProductImageError(this)">
                </td>
                <td>${product.name}</td>
                <td>${formatPrice(product.price)}</td>
                <td>${product.stock}</td>
                <td>${product.category || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        return products;
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// Open Product Modal
function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    
    if (product) {
        title.textContent = 'Редактировать товар';
        editingProductId = product.id;
        const idInput = document.getElementById('product-id');
        if (idInput) idInput.value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-image').value = product.image || '';
    } else {
        title.textContent = 'Добавить товар';
        editingProductId = null;
        document.getElementById('product-form').reset();
    }

    modal.classList.add('active');
}

// Close Product Modal
function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
    editingProductId = null;
}

// Edit Product
async function editProduct(id) {
    try {
        let product = adminProductsCache.find(p => p.id === id);

        if (!product) {
            const products = await loadAdminProducts();
            product = products ? products.find(p => p.id === id) : null;
        }

        if (product) {
            openProductModal(product);
        } else {
            showToast('Product not found', 'error');
        }
    } catch (error) {
        console.error('Failed to load product:', error);
        showToast('Failed to load product', 'error');
    }
}

// Save Product
async function saveProduct(e) {
    e.preventDefault();

    const productData = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value) || 0,
        category: document.getElementById('product-category').value,
        image: document.getElementById('product-image').value
    };

    try {
        let response;
        if (editingProductId) {
            response = await apiRequest(`/admin/products/${editingProductId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
        } else {
            response = await apiRequest('/admin/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
        }

        if (response.ok) {
            showToast('Товар сохранён', 'success');
            closeProductModal();
            loadAdminProducts();
        } else {
            const data = await response.json();
            showToast(data.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения', 'error');
    }
}

// Delete Product
async function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;

    try {
        const response = await apiRequest(`/admin/products/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Товар удалён', 'success');
            loadAdminProducts();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения', 'error');
    }
}
