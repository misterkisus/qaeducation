const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    // BUG #2 (Major): Пароль не валидируется - можно зарегистрироваться с пустым паролем
    // Правильная валидация была бы: if (!password || password.length < 6)
    
    // BUG #5 (Minor): Email не проверяется на корректный формат
    // Правильная валидация: if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Хешируем пароль (даже пустой - это баг)
        const hashedPassword = await bcrypt.hash(password || '', 10);
        
        db.run(
            'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
            [email, hashedPassword, name || 'User'],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }

                const token = jwt.sign(
                    { id: this.lastID, email, role: 'user' },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({ 
                    message: 'Registration successful',
                    token,
                    user: { id: this.lastID, email, name: name || 'User', role: 'user' }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password || '', user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    });
});

// Get current user
router.get('/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        db.get('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id], (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        });
    });
});

module.exports = router;