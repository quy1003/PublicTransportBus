const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(404).json({ message: 'Unauthorized' });
  }
  const token = req.header('Authorization').replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Không có token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = await User.findById(decoded._id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }

    next();
  } catch (ex) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

module.exports = authenticateJWT;



