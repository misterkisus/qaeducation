// Admin Functions
let editingProductId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadAdminProducts();
    
    document.getElementById('product-form')?.addEventListener('submit', saveProduct);
});

// Load Products for Admin
async function loadAdminProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    try {
        const response = await apiRequest('/admin/products');
        const products = await response.json();

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>
                    <img src="${product.image}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                         onerror="this.src='https://via.placeholder.com/50'">
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
        document.getElementById('product-id').value = product.id;
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
        const response = await apiRequest(`/admin/products`);
        const products = await response.json();
        const product = products.find(p => p.id === id);
        
        if (product) {
            openProductModal(product);
        }
    } catch (error) {
        showToast('Ошибка загрузки товара', 'error');
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