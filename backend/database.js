const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'shop.db'));

const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE,
                    password TEXT,
                    name TEXT,
                    role TEXT DEFAULT 'user',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Products table
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price REAL,
                    stock INTEGER DEFAULT 0,
                    category TEXT,
                    image TEXT,
                    active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Cart table
            db.run(`
                CREATE TABLE IF NOT EXISTS cart (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    product_id INTEGER,
                    quantity INTEGER DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            `);

            // Orders table
            db.run(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    total REAL,
                    status TEXT DEFAULT 'pending',
                    shipping_address TEXT,
                    payment_method TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);

            // Order items table
            db.run(`
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER,
                    product_id INTEGER,
                    quantity INTEGER,
                    price REAL,
                    FOREIGN KEY (order_id) REFERENCES orders(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            `);

            // Seed data
            seedData().then(resolve).catch(reject);
        });
    });
};

const seedData = async () => {
    return new Promise(async (resolve) => {
        // Check if data exists
        db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
            if (row && row.count > 0) {
                resolve();
                return;
            }

            // Create admin user
            const adminPassword = await bcrypt.hash('admin123', 10);
            db.run(
                'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
                ['admin@shop.com', adminPassword, 'Administrator', 'admin']
            );

            // Create test user
            const userPassword = await bcrypt.hash('user123', 10);
            db.run(
                'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
                ['user@test.com', userPassword, 'Test User', 'user']
            );

            // Seed products
            const products = [
                {
                    name: 'Wireless Bluetooth Headphones',
                    description: 'High-quality wireless headphones with noise cancellation. Battery life up to 30 hours. Compatible with all devices.',
                    price: 79.99,
                    stock: 50,
                    category: 'Electronics',
                    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'
                },
                {
                    name: 'Smart Watch Pro',
                    description: 'Advanced smartwatch with health monitoring, GPS tracking, and water resistance up to 50m.',
                    price: 199.99,
                    stock: 30,
                    category: 'Electronics',
                    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'
                },
                {
                    name: 'Leather Laptop Bag',
                    description: 'Premium genuine leather laptop bag. Fits laptops up to 15.6 inches. Multiple compartments for accessories.',
                    price: 89.99,
                    stock: 25,
                    category: 'Accessories',
                    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400'
                },
                {
                    name: 'Mechanical Gaming Keyboard',
                    description: 'RGB backlit mechanical keyboard with Cherry MX switches. Programmable keys and dedicated media controls.',
                    price: 129.99,
                    stock: 40,
                    category: 'Electronics',
                    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400'
                },
                {
                    name: 'Portable Power Bank 20000mAh',
                    description: 'High capacity power bank with fast charging. Dual USB output and LED indicator.',
                    price: 39.99,
                    stock: 100,
                    category: 'Electronics',
                    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400'
                },
                {
                    name: 'Cotton T-Shirt Classic',
                    description: '100% organic cotton t-shirt. Available in multiple colors. Comfortable fit for everyday wear.',
                    price: 24.99,
                    stock: 200,
                    category: 'Clothing',
                    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'
                },
                {
                    name: 'Running Shoes Sport Max',
                    description: 'Lightweight running shoes with advanced cushioning. Breathable mesh upper and durable rubber sole.',
                    price: 119.99,
                    stock: 60,
                    category: 'Footwear',
                    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
                },
                {
                    name: 'Stainless Steel Water Bottle',
                    description: 'Double-wall insulated water bottle. Keeps drinks cold for 24h or hot for 12h. 750ml capacity.',
                    price: 29.99,
                    stock: 150,
                    category: 'Accessories',
                    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'
                },
                // Товар с очень длинным названием - BUG #4 (Minor)
                {
                    name: 'Super Ultra Premium Deluxe Edition Professional Wireless Ergonomic Computer Mouse With RGB Lighting And Extra Buttons For Gaming And Productivity Work',
                    description: 'An ergonomic wireless mouse with many features.',
                    price: 59.99,
                    stock: 45,
                    category: 'Electronics',
                    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'
                },
                {
                    name: 'Yoga Mat Premium',
                    description: 'Non-slip yoga mat with carrying strap. 6mm thickness for comfort. Eco-friendly materials.',
                    price: 34.99,
                    stock: 80,
                    category: 'Sports',
                    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400'
                },
                {
                    name: 'Ceramic Coffee Mug Set',
                    description: 'Set of 4 ceramic mugs. Microwave and dishwasher safe. 350ml capacity each.',
                    price: 28.99,
                    stock: 70,
                    category: 'Home',
                    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400'
                },
                {
                    name: 'Desk Lamp LED',
                    description: 'Adjustable LED desk lamp with 5 brightness levels and 3 color temperatures. USB charging port.',
                    price: 44.99,
                    stock: 55,
                    category: 'Home',
                    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400'
                }
            ];

            products.forEach(product => {
                db.run(
                    'INSERT INTO products (name, description, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?)',
                    [product.name, product.description, product.price, product.stock, product.category, product.image]
                );
            });

            console.log('Database seeded successfully!');
            resolve();
        });
    });
};

module.exports = { db, initDatabase };