const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const users = [
  { username: process.env.USER_NAME, password: process.env.USER_PASSWORD }
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username: user.username },
    process.env.JWT_SECRET,  // from .env
    { expiresIn: '1h' }
  );

  res.json({ token });
});

module.exports = router;
