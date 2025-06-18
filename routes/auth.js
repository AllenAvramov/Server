const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const ADMIN_USERNAME = process.env.USER_NAME;
const ADMIN_PASSWORD = process.env.USER_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`✅ Login success: Token issued to ${username}`);
  res.json({ token });
});


module.exports = router;
