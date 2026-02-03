const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create order (checkout)
router.post('/checkout', authenticateToken, (req, res) => {
    const { shippingAddress, paymentMethod, cardNumber, cardExpiry, cardCvc } = req.body;

    // Имитация валидации карты (тестовая песочница)
    // Тестовые карты: 4242424242424242, 5555555555554444
    const testCards = ['4242424242424242', '5555555555554444', '4000000000000002'];
    const cleanCardNumber = (cardNumber || '').replace(/\s/g, '');
    
    if (!testCards.includes(cleanCardNumber)) {
        return res.status(400).json({ error: 'Invalid test card. Use: 4242 4242 4242 4242' });
    }

    // Get cart items
    const cartQuery = `
        SELECT c.quantity, p.id as product_id, p.name, p.price, p.stock
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;

    db.all(cartQuery, [req.user.id], (err, items) => {
        if (err || !items.length) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Check stock
        for (const item of items) {
            if (item.quantity > item.stock) {
                return res.status(400).json({ 
                    error: `Not enough stock for ${item.name}` 
                });
            }
        }

        // Calculate total (с тем же багом что и в корзине)
        const total = items.reduce((sum, item) => {
            let itemTotal = item.price * item.quantity;
            if (item.quantity > 99) {
                itemTotal = item.price * (item.quantity - 200);
            }
            return sum + itemTotal;
        }, 0);

        // Create order
        db.run(
            'INSERT INTO orders (user_id, total, shipping_address, payment_method) VALUES (?, ?, ?, ?)',
            [req.user.id, total, shippingAddress, paymentMethod || 'card'],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create order' });
                }

                const orderId = this.lastID;

                // Add order items
                items.forEach(item => {
                    db.run(
                        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                        [orderId, item.product_id, item.quantity, item.price]
                    );

                    // Update stock
                    db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ?',
                        [item.quantity, item.product_id]
                    );
                });

                // Clear cart
                db.run('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

                res.json({ 
                    message: 'Order placed successfully',
                    orderId,
                    total
                });
            }
        );
    });
});

// Get user orders
router.get('/', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id],
        (err, orders) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch orders' });
            }

            // BUG #6 (Minor): Дата в неправильном формате (US вместо RU)
            // Отдаём сырую дату, на фронте форматируется неправильно
            res.json(orders);
        }
    );
});

// Get order details
router.get('/:id', authenticateToken, (req, res) => {
    db.get(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, order) => {
            if (err || !order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            db.all(
                `SELECT oi.*, p.name, p.image 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = ?`,
                [order.id],
                (err, items) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to fetch order items' });
                    }
                    res.json({ ...order, items });
                }
            );
        }
    );
});

module.exports = router;