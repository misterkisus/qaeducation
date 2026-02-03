const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply auth to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard stats
router.get('/stats', (req, res) => {
    const stats = {};

    db.get('SELECT COUNT(*) as count FROM products WHERE active = 1', (err, row) => {
        stats.totalProducts = row?.count || 0;

        db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
            stats.totalOrders = row?.count || 0;

            db.get('SELECT SUM(total) as sum FROM orders', (err, row) => {
                stats.totalRevenue = row?.sum || 0;

                db.get('SELECT COUNT(*) as count FROM users WHERE role = "user"', (err, row) => {
                    stats.totalUsers = row?.count || 0;
                    res.json(stats);
                });
            });
        });
    });
});

// Get all products (including inactive)
router.get('/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', (err, products) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
        res.json(products);
    });
});

// Create product
router.post('/products', (req, res) => {
    const { name, description, price, stock, category, image } = req.body;

    // BUG #3 (Major): Нет валидации на отрицательную цену!
    // Правильно было бы: if (price < 0) return res.status(400).json({ error: 'Price cannot be negative' });

    if (!name) {
        return res.status(400).json({ error: 'Product name is required' });
    }

    db.run(
        'INSERT INTO products (name, description, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description, price || 0, stock || 0, category, image],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create product' });
            }
            res.json({ id: this.lastID, message: 'Product created' });
        }
    );
});

// Update product
router.put('/products/:id', (req, res) => {
    const { name, description, price, stock, category, image, active } = req.body;

    // BUG #3 также здесь - отрицательная цена разрешена

    db.run(
        `UPDATE products SET 
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            price = COALESCE(?, price),
            stock = COALESCE(?, stock),
            category = COALESCE(?, category),
            image = COALESCE(?, image),
            active = COALESCE(?, active)
        WHERE id = ?`,
        [name, description, price, stock, category, image, active, req.params.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update product' });
            }
            res.json({ message: 'Product updated' });
        }
    );
});

// Delete product
router.delete('/products/:id', (req, res) => {
    db.run('UPDATE products SET active = 0 WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete product' });
        }
        res.json({ message: 'Product deleted' });
    });
});

// Get all orders
router.get('/orders', (req, res) => {
    const query = `
        SELECT o.*, u.email, u.name as user_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    `;

    db.all(query, (err, orders) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }
        res.json(orders);
    });
});

// Update order status
router.put('/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.run(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, req.params.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update order' });
            }
            res.json({ message: 'Order status updated' });
        }
    );
});

module.exports = router;