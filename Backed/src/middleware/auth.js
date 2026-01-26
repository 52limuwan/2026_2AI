const { verifyToken } = require('../utils/security');
const db = require('../db');
const { failure } = require('../utils/respond');

async function authRequired(req, res, next) {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return failure(res, '未授权，请先登录', 401);
  }
  try {
    const decoded = verifyToken(token);
    const user = await db.get(
      'SELECT id, username, name, role, email, phone, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :id',
      { id: decoded.id }
    );
    if (!user) {
      return failure(res, '用户不存在或已被移除', 401);
    }
    req.user = user;
    next();
  } catch (err) {
    return failure(res, 'Token 无效或已过期', 401);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return failure(res, '无权限访问', 403);
    }
    next();
  };
}

module.exports = {
  authRequired,
  requireRole
};
