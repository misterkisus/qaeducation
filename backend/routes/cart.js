const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get cart
router.get('/', authenticateToken, (req, res) => {
    const query = `
        SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.image, p.stock
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;

    db.all(query, [req.user.id], (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch cart' });
        }

        // BUG #1 (Major): Неправильный расчёт при quantity > 99
        // При большом количестве происходит "переполнение" (имитация)
        const total = items.reduce((sum, item) => {
            let itemTotal = item.price * item.quantity;
            // Баг: если quantity > 99, применяется неправильная формула
            if (item.quantity > 99) {
                itemTotal = item.price * (item.quantity - 200); // Может стать отрицательным!
            }
            return sum + itemTotal;
        }, 0);

        res.json({ items, total: Math.round(total * 100) / 100 });
    });
});

// Add to cart
router.post('/add', authenticateToken, (req, res) => {
    const { productId, quantity = 1 } = req.body;

    // BUG #7 (Minor): Нет защиты от двойного клика - дубликаты создаются
    // Правильно было бы сначала проверить и обновить существующий элемент

    db.get(
        'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
        [req.user.id, productId],
        (err, existing) => {
            if (existing) {
                db.run(
                    'UPDATE cart SET quantity = quantity + ? WHERE id = ?',
                    [quantity, existing.id],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to update cart' });
                        }
                        res.json({ message: 'Cart updated' });
                    }
                );
            } else {
                db.run(
                    'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    [req.user.id, productId, quantity],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to add to cart' });
                        }
                        res.json({ message: 'Added to cart' });
                    }
                );
            }
        }
    );
});

// Update cart item
router.put('/:id', authenticateToken, (req, res) => {
    const { quantity } = req.body;

    if (quantity <= 0) {
        db.run(
            'DELETE FROM cart WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to remove item' });
                }
                res.json({ message: 'Item removed' });
            }
        );
    } else {
        db.run(
            'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
            [quantity, req.params.id, req.user.id],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update cart' });
                }
                res.json({ message: 'Cart updated' });
            }
        );
    }
});

// Remove from cart
router.delete('/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM cart WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to remove item' });
            }
            res.json({ message: 'Item removed' });
        }
    );
});

// Clear cart
router.delete('/', authenticateToken, (req, res) => {
    db.run('DELETE FROM cart WHERE user_id = ?', [req.user.id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to clear cart' });
        }
        res.json({ message: 'Cart cleared' });
    });
});

module.exports = router;