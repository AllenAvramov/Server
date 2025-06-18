const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No valid Authorization header:', authHeader);
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔐 Token received on server:', token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
