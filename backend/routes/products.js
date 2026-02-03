const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Get all products
router.get('/', (req, res) => {
    const { category, search, sort } = req.query;
    
    let query = 'SELECT * FROM products WHERE active = 1';
    const params = [];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'price_asc') {
        query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
        query += ' ORDER BY price DESC';
    } else if (sort === 'name') {
        query += ' ORDER BY name ASC';
    } else {
        query += ' ORDER BY created_at DESC';
    }

    db.all(query, params, (err, products) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
        res.json(products);
    });
});

// Get single product
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ? AND active = 1', [req.params.id], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch product' });
        }
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    });
});

// Get categories
router.get('/meta/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM products WHERE active = 1', (err, categories) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch categories' });
        }
        res.json(categories.map(c => c.category));
    });
});

module.exports = router;