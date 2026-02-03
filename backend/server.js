const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'qa-training-secret-2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============ IN-MEMORY DATABASE ============
const DATA = {
    users: [
        { id: 1, email: 'admin@shop.com', password: '', name: 'Admin', role: 'admin', created_at: new Date().toISOString() },
        { id: 2, email: 'user@test.com', password: '', name: 'Test User', role: 'user', created_at: new Date().toISOString() }
    ],
    products: [
        { id: 1, name: 'Wireless Bluetooth Headphones', description: 'High-quality wireless headphones with active noise cancellation. Battery life up to 30 hours. Bluetooth 5.0 connectivity. Foldable design for easy portability.', price: 79.99, stock: 50, category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 2, name: 'Smart Watch Pro', description: 'Advanced smartwatch with heart rate monitoring, GPS tracking, sleep analysis, and water resistance up to 50m. Compatible with iOS and Android.', price: 199.99, stock: 30, category: 'Electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 3, name: 'Leather Laptop Bag', description: 'Premium genuine leather laptop bag. Fits laptops up to 15.6 inches. Multiple compartments for accessories. Adjustable shoulder strap.', price: 89.99, stock: 25, category: 'Accessories', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 4, name: 'Mechanical Gaming Keyboard', description: 'RGB backlit mechanical keyboard with Cherry MX Blue switches. Programmable macro keys. Dedicated media controls. Aircraft-grade aluminum frame.', price: 129.99, stock: 40, category: 'Electronics', image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 5, name: 'Portable Power Bank 20000mAh', description: 'High capacity portable charger with 20000mAh battery. Dual USB output ports. Fast charging support. LED power indicator.', price: 39.99, stock: 100, category: 'Electronics', image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 6, name: 'Cotton T-Shirt Classic', description: '100% organic cotton t-shirt. Pre-shrunk fabric. Reinforced shoulder seams. Available in multiple colors. Machine washable.', price: 24.99, stock: 200, category: 'Clothing', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 7, name: 'Running Shoes Sport Max', description: 'Lightweight running shoes with responsive cushioning. Breathable mesh upper. Durable rubber outsole. Reflective details for visibility.', price: 119.99, stock: 60, category: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 8, name: 'Stainless Steel Water Bottle', description: 'Double-wall vacuum insulated water bottle. Keeps drinks cold 24h or hot 12h. BPA-free. Leak-proof lid. 750ml capacity.', price: 29.99, stock: 150, category: 'Accessories', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 9, name: 'Super Ultra Premium Deluxe Edition Professional Wireless Ergonomic Computer Mouse With RGB Lighting And Extra Buttons For Gaming And Productivity', description: 'Ergonomic wireless mouse with adjustable DPI up to 16000. RGB lighting with 16.8 million colors. 8 programmable buttons.', price: 59.99, stock: 45, category: 'Electronics', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 10, name: 'Yoga Mat Premium', description: 'Non-slip yoga mat with alignment lines. 6mm thickness for joint protection. Eco-friendly TPE material. Includes carrying strap.', price: 34.99, stock: 80, category: 'Sports', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 11, name: 'Wireless Earbuds Pro', description: 'True wireless earbuds with active noise cancellation. Touch controls. 8 hours playback. Wireless charging case included.', price: 149.99, stock: 3, category: 'Electronics', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', active: 1, created_at: new Date().toISOString() },
        { id: 12, name: 'Desk Lamp LED', description: 'Adjustable LED desk lamp with 5 brightness levels and 3 color temperatures. USB charging port. Touch control. Memory function.', price: 44.99, stock: 0, category: 'Home', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400', active: 1, created_at: new Date().toISOString() }
    ],
    cart: [],
    orders: [],
    orderItems: [],
    nextUserId: 3,
    nextProductId: 13,
    nextCartId: 1,
    nextOrderId: 1
};

// Hash passwords on startup
(async () => {
    DATA.users[0].password = await bcrypt.hash('admin123', 10);
    DATA.users[1].password = await bcrypt.hash('user123', 10);
    console.log('Passwords hashed');
})();

// ============ MIDDLEWARE ============
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(403).json({ error: 'Недействительный токен' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ только для администратора' });
    next();
};

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    
    // BUG #2 & #5: Намеренно слабая валидация - нет проверки пароля и формата email
    if (!email) return res.status(400).json({ error: 'Email обязателен' });
    if (DATA.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    const user = {
        id: DATA.nextUserId++,
        email,
        password: await bcrypt.hash(password || '', 10),
        name: name || 'Пользователь',
        role: 'user',
        created_at: new Date().toISOString()
    };
    DATA.users.push(user);
    
    const token = jwt.sign({ id: user.id, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
        message: 'Регистрация успешна',
        token, 
        user: { id: user.id, email, name: user.name, role: 'user' } 
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = DATA.users.find(u => u.email === email);
    
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });
    
    const valid = await bcrypt.compare(password || '', user.password);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name, role: user.role } 
    });
});

app.get('/api/auth/me', auth, (req, res) => {
    const user = DATA.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// ============ PRODUCTS ROUTES ============
app.get('/api/products', (req, res) => {
    let products = DATA.products.filter(p => p.active === 1);
    
    if (req.query.category) {
        products = products.filter(p => p.category === req.query.category);
    }
    if (req.query.search) {
        const s = req.query.search.toLowerCase();
        products = products.filter(p => 
            p.name.toLowerCase().includes(s) || 
            p.description.toLowerCase().includes(s)
        );
    }
    if (req.query.sort === 'price_asc') {
        products.sort((a, b) => a.price - b.price);
    } else if (req.query.sort === 'price_desc') {
        products.sort((a, b) => b.price - a.price);
    } else if (req.query.sort === 'name') {
        products.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    res.json(products);
});

app.get('/api/products/meta/categories', (req, res) => {
    const cats = [...new Set(DATA.products.filter(p => p.active).map(p => p.category))];
    res.json(cats);
});

app.get('/api/products/:id', (req, res) => {
    const product = DATA.products.find(p => p.id === parseInt(req.params.id) && p.active);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(product);
});

// ============ CART ROUTES ============
app.get('/api/cart', auth, (req, res) => {
    const items = DATA.cart
        .filter(c => c.user_id === req.user.id)
        .map(c => {
            const p = DATA.products.find(pr => pr.id === c.product_id);
            if (!p) return null;
            return { 
                id: c.id, 
                quantity: c.quantity, 
                product_id: p.id, 
                name: p.name, 
                price: p.price, 
                image: p.image, 
                stock: p.stock 
            };
        })
        .filter(Boolean);
    
    // BUG #1: Неправильный расчёт при quantity > 99
    const total = items.reduce((sum, i) => {
        let t = i.price * i.quantity;
        if (i.quantity > 99) t = i.price * (i.quantity - 200); // БАГ!
        return sum + t;
    }, 0);
    
    res.json({ items, total: Math.round(total * 100) / 100 });
});

app.post('/api/cart/add', auth, (req, res) => {
    const { productId, quantity = 1 } = req.body;
    
    const product = DATA.products.find(p => p.id === productId && p.active);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    // Проверка наличия на складе
    const existingItem = DATA.cart.find(c => c.user_id === req.user.id && c.product_id === productId);
    const currentInCart = existingItem ? existingItem.quantity : 0;
    const requestedTotal = currentInCart + quantity;
    
    if (requestedTotal > product.stock) {
        return res.status(400).json({ 
            error: `Недостаточно товара на складе. Доступно: ${product.stock}, в корзине: ${currentInCart}` 
        });
    }
    
    // BUG #7: Нет защиты от двойного клика на фронте (но бэкенд работает корректно)
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        DATA.cart.push({ 
            id: DATA.nextCartId++, 
            user_id: req.user.id, 
            product_id: productId, 
            quantity 
        });
    }
    
    res.json({ message: 'Товар добавлен в корзину' });
});

app.put('/api/cart/:id', auth, (req, res) => {
    const item = DATA.cart.find(c => c.id === parseInt(req.params.id) && c.user_id === req.user.id);
    if (!item) return res.status(404).json({ error: 'Товар не найден в корзине' });
    
    const newQuantity = parseInt(req.body.quantity);
    
    if (newQuantity <= 0) {
        DATA.cart = DATA.cart.filter(c => c.id !== item.id);
        return res.json({ message: 'Товар удалён из корзины' });
    }
    
    // Проверка наличия на складе
    const product = DATA.products.find(p => p.id === item.product_id);
    if (newQuantity > product.stock) {
        return res.status(400).json({ 
            error: `Недостаточно товара на складе. Доступно: ${product.stock}` 
        });
    }
    
    item.quantity = newQuantity;
    res.json({ message: 'Корзина обновлена' });
});

app.delete('/api/cart/:id', auth, (req, res) => {
    const initialLength = DATA.cart.length;
    DATA.cart = DATA.cart.filter(c => !(c.id === parseInt(req.params.id) && c.user_id === req.user.id));
    
    if (DATA.cart.length === initialLength) {
        return res.status(404).json({ error: 'Товар не найден в корзине' });
    }
    
    res.json({ message: 'Товар удалён из корзины' });
});

app.delete('/api/cart', auth, (req, res) => {
    DATA.cart = DATA.cart.filter(c => c.user_id !== req.user.id);
    res.json({ message: 'Корзина очищена' });
});

// ============ ORDERS ROUTES ============
app.post('/api/orders/checkout', auth, (req, res) => {
    const { shippingAddress, cardNumber, cardExpiry, cardCvc } = req.body;
    
    // Валидация адреса
    if (!shippingAddress || shippingAddress.trim().length < 10) {
        return res.status(400).json({ error: 'Введите полный адрес доставки (минимум 10 символов)' });
    }
    
    // Валидация карты
    const cleanCard = (cardNumber || '').replace(/\s/g, '');
    const testCards = ['4242424242424242', '5555555555554444', '4000000000000002'];
    
    if (!/^\d{16}$/.test(cleanCard)) {
        return res.status(400).json({ error: 'Номер карты должен содержать 16 цифр' });
    }
    
    if (!testCards.includes(cleanCard)) {
        return res.status(400).json({ error: 'Используйте тестовую карту: 4242 4242 4242 4242' });
    }
    
    // Валидация срока действия
    if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        return res.status(400).json({ error: 'Введите срок действия в формате MM/YY' });
    }
    
    const [month, year] = cardExpiry.split('/').map(Number);
    const now = new Date();
    const expiry = new Date(2000 + year, month - 1);
    
    if (month < 1 || month > 12) {
        return res.status(400).json({ error: 'Некорректный месяц (01-12)' });
    }
    
    if (expiry < now) {
        return res.status(400).json({ error: 'Срок действия карты истёк' });
    }
    
    // Валидация CVC
    if (!cardCvc || !/^\d{3}$/.test(cardCvc)) {
        return res.status(400).json({ error: 'CVC должен содержать 3 цифры' });
    }
    
    // Получаем корзину
    const cartItems = DATA.cart.filter(c => c.user_id === req.user.id);
    if (!cartItems.length) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }
    
    // Проверяем наличие всех товаров
    const stockErrors = [];
    for (const item of cartItems) {
        const product = DATA.products.find(p => p.id === item.product_id);
        if (!product) {
            stockErrors.push(`Товар ID ${item.product_id} не найден`);
        } else if (item.quantity > product.stock) {
            stockErrors.push(`"${product.name}": запрошено ${item.quantity}, доступно ${product.stock}`);
        }
    }
    
    if (stockErrors.length > 0) {
        return res.status(400).json({ 
            error: 'Недостаточно товара на складе',
            details: stockErrors
        });
    }
    
    // Рассчитываем сумму
    const total = cartItems.reduce((sum, c) => {
        const p = DATA.products.find(pr => pr.id === c.product_id);
        return sum + p.price * c.quantity;
    }, 0);
    
    // Создаём заказ
    const order = {
        id: DATA.nextOrderId++,
        user_id: req.user.id,
        total: Math.round(total * 100) / 100,
        status: 'pending',
        shipping_address: shippingAddress.trim(),
        payment_method: 'card',
        card_last4: cleanCard.slice(-4),
        created_at: new Date().toISOString()
    };
    DATA.orders.push(order);
    
    // Сохраняем позиции заказа и обновляем остатки
    cartItems.forEach(c => {
        const p = DATA.products.find(pr => pr.id === c.product_id);
        DATA.orderItems.push({ 
            order_id: order.id, 
            product_id: c.product_id, 
            product_name: p.name,
            quantity: c.quantity, 
            price: p.price 
        });
        p.stock -= c.quantity;
    });
    
    // Очищаем корзину
    DATA.cart = DATA.cart.filter(c => c.user_id !== req.user.id);
    
    res.json({ 
        message: 'Заказ успешно оформлен',
        orderId: order.id, 
        total: order.total 
    });
});

app.get('/api/orders', auth, (req, res) => {
    const orders = DATA.orders
        .filter(o => o.user_id === req.user.id)
        .map(o => ({
            ...o,
            items: DATA.orderItems.filter(i => i.order_id === o.id)
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(orders);
});

app.get('/api/orders/:id', auth, (req, res) => {
    const order = DATA.orders.find(o => o.id === parseInt(req.params.id) && o.user_id === req.user.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    
    const items = DATA.orderItems.filter(i => i.order_id === order.id);
    res.json({ ...order, items });
});

// ============ ADMIN ROUTES ============
app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
    const totalRevenue = DATA.orders.reduce((s, o) => s + o.total, 0);
    const ordersByStatus = DATA.orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
    }, {});
    
    res.json({
        totalProducts: DATA.products.filter(p => p.active).length,
        totalOrders: DATA.orders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalUsers: DATA.users.filter(u => u.role === 'user').length,
        lowStockProducts: DATA.products.filter(p => p.active && p.stock > 0 && p.stock < 10).length,
        outOfStockProducts: DATA.products.filter(p => p.active && p.stock === 0).length,
        ordersByStatus
    });
});

app.get('/api/admin/products', auth, adminOnly, (req, res) => {
    res.json(DATA.products);
});

app.post('/api/admin/products', auth, adminOnly, (req, res) => {
    const { name, description, price, stock, category, image } = req.body;
    
    // BUG #3: Нет проверки на отрицательную цену
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Название товара обязательно' });
    }
    
    const product = {
        id: DATA.nextProductId++,
        name: name.trim(),
        description: description?.trim() || '',
        price: parseFloat(price) || 0,
        stock: parseInt(stock) || 0,
        category: category?.trim() || 'Другое',
        image: image?.trim() || 'https://via.placeholder.com/400',
        active: 1,
        created_at: new Date().toISOString()
    };
    DATA.products.push(product);
    
    res.json({ id: product.id, message: 'Товар создан' });
});

app.put('/api/admin/products/:id', auth, adminOnly, (req, res) => {
    const product = DATA.products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    
    const { name, description, price, stock, category, image, active } = req.body;
    
    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (category !== undefined) product.category = category.trim();
    if (image !== undefined) product.image = image.trim();
    if (active !== undefined) product.active = active ? 1 : 0;
    
    res.json({ message: 'Товар обновлён' });
});

app.delete('/api/admin/products/:id', auth, adminOnly, (req, res) => {
    const product = DATA.products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    
    product.active = 0;
    res.json({ message: 'Товар удалён' });
});

app.get('/api/admin/orders', auth, adminOnly, (req, res) => {
    const orders = DATA.orders.map(o => {
        const user = DATA.users.find(u => u.id === o.user_id);
        const items = DATA.orderItems.filter(i => i.order_id === o.id);
        return { 
            ...o, 
            email: user?.email, 
            user_name: user?.name,
            items_count: items.length,
            items
        };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(orders);
});

app.put('/api/admin/orders/:id/status', auth, adminOnly, (req, res) => {
    const order = DATA.orders.find(o => o.id === parseInt(req.params.id));
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Некорректный статус' });
    }
    
    order.status = status;
    res.json({ message: 'Статус заказа обновлён' });
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
    const users = DATA.users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        created_at: u.created_at,
        orders_count: DATA.orders.filter(o => o.user_id === u.id).length
    }));
    res.json(users);
});

// ============ SPA FALLBACK ============
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  QA Training Shop                         ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  🌐 Server:  http://localhost:${PORT}                        ║`);
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  📧 Admin:   admin@shop.com / admin123                    ║');
    console.log('║  📧 User:    user@test.com / user123                      ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  💳 Test Card: 4242 4242 4242 4242                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
});