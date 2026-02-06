const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const swaggerDocument = YAML.load(
  path.join(__dirname, 'docs', 'openapi.yaml')
);

const app = express();
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'qa-training-secret-2024';
const REVOKED_TOKENS = new Set();

// ===== СЕКРЕТНЫЙ КОД ДЛЯ ДОСТУПА К САЙТУ =====
const SITE_ACCESS_CODE = 'PIZDUK';
const ACCESS_COOKIE_NAME = 'site_access';
const ACCESS_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 часа

app.use(cors());
app.use(express.json());

// ===== MIDDLEWARE: ПРОВЕРКА ДОСТУПА К САЙТУ =====
const checkSiteAccess = (req, res, next) => {
    // Пропускаем API и статические ресурсы
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/css/') || 
        req.path.startsWith('/js/') ||
        req.path === '/access' ||
        req.path === '/access.html' ||
        req.path.includes('.ico')) {
        return next();
    }
    
    // Проверяем куку
    const cookies = parseCookies(req.headers.cookie || '');
    const accessToken = cookies[ACCESS_COOKIE_NAME];
    
    if (!accessToken || !verifyAccessToken(accessToken)) {
        // Нет доступа - показываем страницу ввода кода
        return res.sendFile(path.join(__dirname, '../frontend/access.html'));
    }
    
    next();
};

function parseCookies(cookieHeader) {
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            cookies[name] = decodeURIComponent(value);
        }
    });
    return cookies;
}

function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.access === 'granted';
    } catch (e) {
        return false;
    }
}

function generateAccessToken() {
    return jwt.sign({ access: 'granted' }, JWT_SECRET, { expiresIn: '24h' });
}

// Применяем middleware
app.use(checkSiteAccess);

// Статические файлы (после проверки доступа)
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== API: ПРОВЕРКА КОДА ДОСТУПА =====
app.post('/api/access/verify', (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Введите код доступа' });
    }
    
    if (code.toUpperCase() === SITE_ACCESS_CODE) {
        const token = generateAccessToken();
        
        res.setHeader('Set-Cookie', `${ACCESS_COOKIE_NAME}=${token}; Max-Age=${ACCESS_COOKIE_MAX_AGE / 1000}; Path=/; HttpOnly; SameSite=Strict`);
        
        return res.json({ success: true, message: 'Доступ разрешён' });
    }
    
    res.status(401).json({ error: 'Неверный код доступа' });
});

app.get('/api/access/check', (req, res) => {
    const cookies = parseCookies(req.headers.cookie || '');
    const accessToken = cookies[ACCESS_COOKIE_NAME];
    
    if (accessToken && verifyAccessToken(accessToken)) {
        return res.json({ hasAccess: true });
    }
    
    res.json({ hasAccess: false });
});

app.post('/api/access/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${ACCESS_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly`);
    res.json({ success: true });
});

// ============ PERSISTENT DATA STORAGE ============
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

function createDefaultData() {
    return {
        users: [
            { id: 1, email: 'admin@shop.com', password: '', name: 'Admin', role: 'admin', created_at: new Date().toISOString() },
            { id: 2, email: 'user@test.com', password: '', name: 'Test User', role: 'user', created_at: new Date().toISOString() }
        ],
        products: [
            { id: 1, name: 'Wireless Bluetooth Headphones', description: 'High-quality wireless headphones with active noise cancellation. Battery life up to 30 hours. Bluetooth 5.0 connectivity.', price: 79.99, stock: 50, category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 2, name: 'Smart Watch Pro', description: 'Advanced smartwatch with heart rate monitoring, GPS tracking, sleep analysis. Water resistant up to 50m.', price: 199.99, stock: 30, category: 'Electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 3, name: 'Leather Laptop Bag', description: 'Premium genuine leather laptop bag. Fits laptops up to 15.6 inches. Multiple compartments.', price: 89.99, stock: 25, category: 'Accessories', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 4, name: 'Mechanical Gaming Keyboard', description: 'RGB backlit mechanical keyboard with Cherry MX Blue switches. Programmable macro keys.', price: 129.99, stock: 40, category: 'Electronics', image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 5, name: 'Portable Power Bank 20000mAh', description: 'High capacity portable charger. Dual USB output. Fast charging support.', price: 39.99, stock: 100, category: 'Electronics', image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 6, name: 'Cotton T-Shirt Classic', description: '100% organic cotton t-shirt. Pre-shrunk fabric. Available in multiple colors.', price: 24.99, stock: 200, category: 'Clothing', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 7, name: 'Running Shoes Sport Max', description: 'Lightweight running shoes with responsive cushioning. Breathable mesh upper.', price: 119.99, stock: 60, category: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 8, name: 'Stainless Steel Water Bottle', description: 'Double-wall vacuum insulated. Keeps drinks cold 24h or hot 12h. 750ml capacity.', price: 29.99, stock: 150, category: 'Accessories', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 9, name: 'Super Ultra Premium Deluxe Edition Professional Wireless Ergonomic Computer Mouse With RGB Lighting And Extra Buttons For Gaming', description: 'Ergonomic wireless mouse with adjustable DPI. RGB lighting. 8 programmable buttons.', price: 59.99, stock: 45, category: 'Electronics', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 10, name: 'Yoga Mat Premium', description: 'Non-slip yoga mat with alignment lines. 6mm thickness. Eco-friendly TPE material.', price: 34.99, stock: 80, category: 'Sports', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 11, name: 'Wireless Earbuds Pro', description: 'True wireless earbuds with ANC. Touch controls. 8 hours playback.', price: 149.99, stock: 3, category: 'Electronics', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', active: 1, created_at: new Date().toISOString() },
            { id: 12, name: 'LED Desk Lamp', description: 'Adjustable LED desk lamp. 5 brightness levels. USB charging port.', price: 44.99, stock: 0, category: 'Home', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400', active: 1, created_at: new Date().toISOString() }
        ],
        cart: [],
        orders: [],
        orderItems: [],
        promocodes: [
            { id: 1, code: 'SAVE10', discount: 10, type: 'percent', min_order: 0, max_uses: 100, used_count: 5, expires_at: '2025-12-31', active: 1, created_at: new Date().toISOString() },
            { id: 2, code: 'SAVE20', discount: 20, type: 'percent', min_order: 100, max_uses: 50, used_count: 12, expires_at: '2025-06-30', active: 1, created_at: new Date().toISOString() },
            { id: 3, code: 'FLAT500', discount: 500, type: 'fixed', min_order: 2000, max_uses: 30, used_count: 8, expires_at: '2025-03-31', active: 1, created_at: new Date().toISOString() },
            { id: 4, code: 'EXPIRED50', discount: 50, type: 'percent', min_order: 0, max_uses: 100, used_count: 0, expires_at: '2023-01-01', active: 1, created_at: new Date().toISOString() },
            { id: 5, code: 'WELCOME', discount: 15, type: 'percent', min_order: 0, max_uses: 1000, used_count: 234, expires_at: '2025-12-31', active: 0, created_at: new Date().toISOString() },
            { id: 6, code: 'BUGGY150', discount: 150, type: 'percent', min_order: 0, max_uses: 10, used_count: 0, expires_at: '2025-12-31', active: 1, created_at: new Date().toISOString() }
        ],
        nextUserId: 3,
        nextProductId: 13,
        nextCartId: 1,
        nextOrderId: 1,
        nextPromocodeId: 7
    };
}

function nextIdFrom(items) {
    return items.reduce((max, item) => {
        const id = Number(item?.id) || 0;
        return id > max ? id : max;
    }, 0) + 1;
}

function normalizeDataShape(rawData) {
    const defaults = createDefaultData();
    const data = rawData && typeof rawData === 'object' ? rawData : {};

    const normalized = {
        users: Array.isArray(data.users) ? data.users : defaults.users,
        products: Array.isArray(data.products) ? data.products : defaults.products,
        cart: Array.isArray(data.cart) ? data.cart : defaults.cart,
        orders: Array.isArray(data.orders) ? data.orders : defaults.orders,
        orderItems: Array.isArray(data.orderItems) ? data.orderItems : defaults.orderItems,
        promocodes: Array.isArray(data.promocodes) ? data.promocodes : defaults.promocodes,
        nextUserId: Number.isInteger(data.nextUserId) ? data.nextUserId : nextIdFrom(Array.isArray(data.users) ? data.users : defaults.users),
        nextProductId: Number.isInteger(data.nextProductId) ? data.nextProductId : nextIdFrom(Array.isArray(data.products) ? data.products : defaults.products),
        nextCartId: Number.isInteger(data.nextCartId) ? data.nextCartId : nextIdFrom(Array.isArray(data.cart) ? data.cart : defaults.cart),
        nextOrderId: Number.isInteger(data.nextOrderId) ? data.nextOrderId : nextIdFrom(Array.isArray(data.orders) ? data.orders : defaults.orders),
        nextPromocodeId: Number.isInteger(data.nextPromocodeId) ? data.nextPromocodeId : nextIdFrom(Array.isArray(data.promocodes) ? data.promocodes : defaults.promocodes)
    };

    return normalized;
}

function ensureUserPasswords(data) {
    data.users.forEach((user) => {
        if (typeof user.password === 'string' && user.password.startsWith('$2')) {
            return;
        }

        if (!user.password) {
            if (user.email === 'admin@shop.com') {
                user.password = bcrypt.hashSync('admin123', 10);
            } else if (user.email === 'user@test.com') {
                user.password = bcrypt.hashSync('user123', 10);
            } else {
                user.password = bcrypt.hashSync('user123', 10);
            }
            return;
        }

        user.password = bcrypt.hashSync(String(user.password), 10);
    });
}

function writeDataFile(payload) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function saveData(payload = DATA) {
    try {
        writeDataFile(payload);
        return true;
    } catch (error) {
        console.error('Failed to persist data:', error);
        return false;
    }
}

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const defaults = createDefaultData();
            ensureUserPasswords(defaults);
            writeDataFile(defaults);
            return defaults;
        }

        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const normalized = normalizeDataShape(parsed);
        ensureUserPasswords(normalized);
        writeDataFile(normalized);
        return normalized;
    } catch (error) {
        console.error('Failed to load persisted data, reset to defaults:', error);
        const defaults = createDefaultData();
        ensureUserPasswords(defaults);
        writeDataFile(defaults);
        return defaults;
    }
}

function persistOr500(res) {
    if (saveData()) {
        return true;
    }
    res.status(500).json({ error: 'Failed to persist data' });
    return false;
}

const DATA = loadData();

// ============ MIDDLEWARE ============
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (REVOKED_TOKENS.has(token)) {
        return res.status(401).json({ error: 'РўРѕРєРµРЅ РёСЃС‚С‘Рє' });
    }
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

function toPublicProduct(product) {
    const { id, name, description, price, stock, category, image, active } = product;
    return { id, name, description, price, stock, category, image, active };
}

function disableConditionalGet(req, res) {
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
}

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    
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
    if (!persistOr500(res)) return;

    const token = jwt.sign({ id: user.id, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Регистрация успешна', token, user: { id: user.id, email, name: user.name, role: 'user' } });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = DATA.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });
    
    const valid = await bcrypt.compare(password || '', user.password);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/auth/me', auth, (req, res) => {
    const user = DATA.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.post('/api/auth/expire', (req, res) => {
    const { authToken } = req.body || {};
    if (!authToken) {
        return res.status(400).json({ error: 'authToken обязателен' });
    }
    REVOKED_TOKENS.add(authToken);
    res.json({ message: 'Сессия протухла' });
});

// ============ PRODUCTS ROUTES ============
app.get('/api/products', (req, res) => {
    disableConditionalGet(req, res);
    let products = DATA.products.filter(p => p.active === 1);
    
    if (req.query.category) {
        products = products.filter(p => p.category === req.query.category);
    }
    if (req.query.search) {
        const s = req.query.search.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
    }
    if (req.query.sort === 'price_asc') products.sort((a, b) => a.price - b.price);
    else if (req.query.sort === 'price_desc') products.sort((a, b) => b.price - a.price);
    else if (req.query.sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(products.map(toPublicProduct));
});

app.get('/api/products/meta/categories', (req, res) => {
    const cats = [...new Set(DATA.products.filter(p => p.active).map(p => p.category))];
    res.json(cats);
});

app.get('/api/products/:id', (req, res) => {
    disableConditionalGet(req, res);
    const product = DATA.products.find(p => p.id === parseInt(req.params.id) && p.active);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(toPublicProduct(product));
});

// ============ CART ROUTES ============
app.get('/api/cart', auth, (req, res) => {
    const items = DATA.cart
        .filter(c => c.user_id === req.user.id)
        .map(c => {
            const p = DATA.products.find(pr => pr.id === c.product_id);
            if (!p) return null;
            return { id: c.id, quantity: c.quantity, product_id: p.id, name: p.name, price: p.price, image: p.image, stock: p.stock };
        })
        .filter(Boolean);
    
    let total = items.reduce((sum, i) => {
        let t = i.price * i.quantity;
        if (i.quantity > 99) t = i.price * (i.quantity - 200);
        return sum + t;
    }, 0);
    
    res.json({ items, total: Math.round(total * 100) / 100 });
});

app.post('/api/cart/add', auth, (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const product = DATA.products.find(p => p.id === productId && p.active);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    
    const existingItem = DATA.cart.find(c => c.user_id === req.user.id && c.product_id === productId);
    const currentInCart = existingItem ? existingItem.quantity : 0;
    
    if (currentInCart + quantity > product.stock) {
        return res.status(400).json({ error: `Недостаточно товара. Доступно: ${product.stock}, в корзине: ${currentInCart}` });
    }
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        DATA.cart.push({ id: DATA.nextCartId++, user_id: req.user.id, product_id: productId, quantity });
    }
    if (!persistOr500(res)) return;
    res.json({ message: 'Товар добавлен в корзину' });
});

app.put('/api/cart/:id', auth, (req, res) => {
    const item = DATA.cart.find(c => c.id === parseInt(req.params.id) && c.user_id === req.user.id);
    if (!item) return res.status(404).json({ error: 'Товар не найден в корзине' });
    
    const newQuantity = parseInt(req.body.quantity);
    if (newQuantity <= 0) {
        DATA.cart = DATA.cart.filter(c => c.id !== item.id);
        if (!persistOr500(res)) return;
        return res.json({ message: 'Товар удалён из корзины' });
    }
    
    const product = DATA.products.find(p => p.id === item.product_id);
    if (newQuantity > product.stock) {
        return res.status(400).json({ error: `Недостаточно товара. Доступно: ${product.stock}` });
    }
    
    item.quantity = newQuantity;
    if (!persistOr500(res)) return;
    res.json({ message: 'Корзина обновлена' });
});

app.delete('/api/cart/:id', auth, (req, res) => {
    DATA.cart = DATA.cart.filter(c => !(c.id === parseInt(req.params.id) && c.user_id === req.user.id));
    if (!persistOr500(res)) return;
    res.json({ message: 'Товар удалён' });
});

// ============ PROMOCODES ROUTES ============
app.post('/api/promocodes/apply', auth, (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Введите промокод' });
    }
    
    const promo = DATA.promocodes.find(p => p.code === code);
    
    if (!promo) {
        return res.status(400).json({ error: 'Промокод не найден' });
    }
    
    if (!promo.active) {
        return res.status(400).json({ error: 'Промокод неактивен' });
    }
    
    if (promo.used_count >= promo.max_uses) {
        return res.status(400).json({ error: 'Лимит использования промокода исчерпан' });
    }
    
    const cartItems = DATA.cart.filter(c => c.user_id === req.user.id);
    const cartTotal = cartItems.reduce((sum, c) => {
        const p = DATA.products.find(pr => pr.id === c.product_id);
        return sum + (p ? p.price * c.quantity : 0);
    }, 0);
    
    if (cartTotal < promo.min_order) {
        return res.status(400).json({ 
            error: `Минимальная сумма заказа для этого промокода: ${promo.min_order} ₽` 
        });
    }
    
    let discount = 0;
    if (promo.type === 'percent') {
        discount = cartTotal * (promo.discount / 100);
    } else {
        discount = Math.min(promo.discount, cartTotal);
    }
    
    const newTotal = Math.max(0, cartTotal - discount);
    
    res.json({
        message: 'Промокод применён',
        code: promo.code,
        discount: Math.round(discount * 100) / 100,
        discountPercent: promo.type === 'percent' ? promo.discount : null,
        discountType: promo.type,
        originalTotal: Math.round(cartTotal * 100) / 100,
        newTotal: Math.round(newTotal * 100) / 100
    });
});

app.get('/api/promocodes/check/:code', (req, res) => {
    const promo = DATA.promocodes.find(p => p.code.toUpperCase() === req.params.code.toUpperCase() && p.active);
    if (!promo) {
        return res.status(404).json({ error: 'Промокод не найден' });
    }
    res.json({
        code: promo.code,
        discount: promo.discount,
        type: promo.type,
        min_order: promo.min_order,
        expires_at: promo.expires_at
    });
});

// ============ ORDERS ROUTES ============
app.post('/api/orders/checkout', auth, (req, res) => {
    const { shippingAddress, cardNumber, cardExpiry, cardCvc, promocode } = req.body;
    
    if (!shippingAddress || shippingAddress.trim().length < 10) {
        return res.status(400).json({ error: 'Введите полный адрес доставки (минимум 10 символов)' });
    }
    
    const cleanCard = (cardNumber || '').replace(/\s/g, '');
    const testCards = ['4242424242424242', '5555555555554444', '4000000000000002'];
    
    if (!/^\d{16}$/.test(cleanCard)) {
        return res.status(400).json({ error: 'Номер карты должен содержать 16 цифр' });
    }
    if (!testCards.includes(cleanCard)) {
        return res.status(400).json({ error: 'Используйте тестовую карту: 4242 4242 4242 4242' });
    }
    if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        return res.status(400).json({ error: 'Введите срок действия в формате MM/YY' });
    }
    
    const [month, year] = cardExpiry.split('/').map(Number);
    if (month < 1 || month > 12) {
        return res.status(400).json({ error: 'Некорректный месяц' });
    }
    const expDate = new Date(2000 + year, month);
    if (expDate < new Date()) {
        return res.status(400).json({ error: 'Срок действия карты истёк' });
    }
    
    if (!cardCvc || !/^\d{3}$/.test(cardCvc)) {
        return res.status(400).json({ error: 'CVC должен содержать 3 цифры' });
    }
    
    const cartItems = DATA.cart.filter(c => c.user_id === req.user.id);
    if (!cartItems.length) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }
    
    for (const item of cartItems) {
        const product = DATA.products.find(p => p.id === item.product_id);
        if (!product) {
            return res.status(400).json({ error: 'Один из товаров не найден' });
        }
        if (item.quantity > product.stock) {
            return res.status(400).json({ error: `Недостаточно товара "${product.name}". Доступно: ${product.stock}` });
        }
    }
    
    let total = cartItems.reduce((sum, c) => {
        const p = DATA.products.find(pr => pr.id === c.product_id);
        return sum + p.price * c.quantity;
    }, 0);
    
    let discountAmount = 0;
    let appliedPromo = null;
    
    if (promocode) {
        const promo = DATA.promocodes.find(p => p.code === promocode && p.active);
        if (promo && total >= promo.min_order) {
            if (promo.type === 'percent') {
                discountAmount = total * (promo.discount / 100);
            } else {
                discountAmount = Math.min(promo.discount, total);
            }
            total = Math.max(0, total - discountAmount);
            promo.used_count++;
            appliedPromo = promo.code;
        }
    }
    
    const order = {
        id: DATA.nextOrderId++,
        user_id: req.user.id,
        total: Math.round(total * 100) / 100,
        discount: Math.round(discountAmount * 100) / 100,
        promocode: appliedPromo,
        status: 'pending',
        shipping_address: shippingAddress.trim(),
        payment_method: 'card',
        card_last4: cleanCard.slice(-4),
        created_at: new Date().toISOString()
    };
    DATA.orders.push(order);
    
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
    
    DATA.cart = DATA.cart.filter(c => c.user_id !== req.user.id);
    if (!persistOr500(res)) return;
    
    res.json({ 
        message: 'Заказ успешно оформлен', 
        orderId: order.id, 
        total: order.total,
        discount: order.discount,
        promocode: order.promocode
    });
});

app.get('/api/orders', auth, (req, res) => {
    const orders = DATA.orders
        .filter(o => o.user_id === req.user.id)
        .map(o => ({ ...o, items: DATA.orderItems.filter(i => i.order_id === o.id) }))
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
    
    res.json({
        totalProducts: DATA.products.filter(p => p.active).length,
        totalOrders: DATA.orders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalUsers: DATA.users.filter(u => u.role === 'user').length,
        lowStockProducts: DATA.products.filter(p => p.active && p.stock > 0 && p.stock < 10).length,
        outOfStockProducts: DATA.products.filter(p => p.active && p.stock === 0).length,
        activePromocodes: DATA.promocodes.filter(p => p.active).length
    });
});

app.get('/api/admin/products', auth, adminOnly, (req, res) => {
    res.json(DATA.products);
});

app.post('/api/admin/products', auth, adminOnly, (req, res) => {
    const { name, description, price, stock, category, image } = req.body;
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
    if (!persistOr500(res)) return;
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
    if (!persistOr500(res)) return;
    
    res.json({ message: 'Товар обновлён' });
});

app.delete('/api/admin/products/:id', auth, adminOnly, (req, res) => {
    const product = DATA.products.find(p => p.id === parseInt(req.params.id));
    if (product) product.active = 0;
    if (!persistOr500(res)) return;
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
    if (!persistOr500(res)) return;
    res.json({ message: 'Статус заказа обновлён' });
});

app.get('/api/admin/promocodes', auth, adminOnly, (req, res) => {
    res.json(DATA.promocodes);
});

app.post('/api/admin/promocodes', auth, adminOnly, (req, res) => {
    const { code, discount, type, min_order, max_uses, expires_at } = req.body;
    
    if (!code || code.trim().length < 3) {
        return res.status(400).json({ error: 'Код должен содержать минимум 3 символа' });
    }
    
    if (DATA.promocodes.find(p => p.code.toUpperCase() === code.toUpperCase())) {
        return res.status(400).json({ error: 'Промокод уже существует' });
    }
    
    if (!discount || discount <= 0) {
        return res.status(400).json({ error: 'Укажите размер скидки' });
    }
    
    const promo = {
        id: DATA.nextPromocodeId++,
        code: code.trim().toUpperCase(),
        discount: parseFloat(discount),
        type: type === 'fixed' ? 'fixed' : 'percent',
        min_order: parseFloat(min_order) || 0,
        max_uses: parseInt(max_uses) || 100,
        used_count: 0,
        expires_at: expires_at || '2025-12-31',
        active: 1,
        created_at: new Date().toISOString()
    };
    
    DATA.promocodes.push(promo);
    if (!persistOr500(res)) return;
    res.json({ id: promo.id, message: 'Промокод создан' });
});

app.put('/api/admin/promocodes/:id', auth, adminOnly, (req, res) => {
    const promo = DATA.promocodes.find(p => p.id === parseInt(req.params.id));
    if (!promo) return res.status(404).json({ error: 'Промокод не найден' });
    
    const { discount, type, min_order, max_uses, expires_at, active } = req.body;
    
    if (discount !== undefined) promo.discount = parseFloat(discount);
    if (type !== undefined) promo.type = type;
    if (min_order !== undefined) promo.min_order = parseFloat(min_order);
    if (max_uses !== undefined) promo.max_uses = parseInt(max_uses);
    if (expires_at !== undefined) promo.expires_at = expires_at;
    if (active !== undefined) promo.active = active ? 1 : 0;
    if (!persistOr500(res)) return;
    
    res.json({ message: 'Промокод обновлён' });
});

app.delete('/api/admin/promocodes/:id', auth, adminOnly, (req, res) => {
    const index = DATA.promocodes.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Промокод не найден' });
    
    DATA.promocodes.splice(index, 1);
    if (!persistOr500(res)) return;
    res.json({ message: 'Промокод удалён' });
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
    console.log('║  🔐 Access Code: PIZDUK                                   ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  📧 Admin:   admin@shop.com / admin123                    ║');
    console.log('║  📧 User:    user@test.com / user123                      ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  💳 Card:    4242 4242 4242 4242                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
});

