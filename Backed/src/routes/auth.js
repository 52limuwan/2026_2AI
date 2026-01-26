const express = require('express');
const db = require('../db');
const { hashPassword, comparePassword, generateToken } = require('../utils/security');
const { success, failure } = require('../utils/respond');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const ALLOWED_ROLES = ['client', 'guardian', 'merchant', 'gov'];

async function resolveCommunity({ communityId, communityCode }) {
  if (!communityId && !communityCode) return { community_id: null, community_code: null };
  if (communityId && !communityCode) {
    const community = await db.get('SELECT id, code FROM communities WHERE id = :id', { id: communityId });
    return { community_id: community?.id || null, community_code: community?.code || null };
  }
  if (!communityId && communityCode) {
    const community = await db.get('SELECT id, code FROM communities WHERE code = :code', { code: communityCode });
    return { community_id: community?.id || null, community_code: community?.code || communityCode || null };
  }
  return { community_id: communityId, community_code: communityCode };
}

async function loadProfileByRole(role, userId) {
  switch (role) {
    case 'client':
      return db.get('SELECT * FROM client_profiles WHERE user_id = :user_id', { user_id: userId });
    case 'guardian':
      return db.get('SELECT * FROM guardian_profiles WHERE user_id = :user_id', { user_id: userId });
    case 'merchant':
      return db.get('SELECT * FROM merchant_profiles WHERE user_id = :user_id', { user_id: userId });
    case 'gov':
      return db.get('SELECT * FROM gov_profiles WHERE user_id = :user_id', { user_id: userId });
    default:
      return null;
  }
}

router.post('/register', async (req, res) => {
  const { identifier, password, role = 'client', idCard, communityId = null, communityCode = null } = req.body;
  if (!identifier || !password) return failure(res, '请输入账号和密码');
  if (!ALLOWED_ROLES.includes(role)) return failure(res, '角色不合法', 400);
  const username = identifier;
  const phone = identifier;
  const name = identifier;
  const exists = await db.get('SELECT id FROM users WHERE username = :username OR phone = :phone', { username, phone });
  if (exists) return failure(res, '账号已存在', 409);
  
  // 默认认证状态为已认证（id_verified = 1）
  const idVerified = 1;
  
  const community = await resolveCommunity({ communityId, communityCode });

  const result = await db.run(
    `INSERT INTO users (username, password, name, role, phone, preferences, id_card, id_verified, community_id, community_code)
     VALUES (:username, :password, :name, :role, :phone, :preferences, :id_card, :id_verified, :community_id, :community_code)`,
    {
      username,
      password: hashPassword(password),
      name,
      role,
      phone,
      preferences: JSON.stringify({ elderMode: false }),
      id_card: idCard || null,
      id_verified: idVerified,
      community_id: community.community_id,
      community_code: community.community_code
    }
  );
  const userId = result.lastInsertRowid;
  
  // 根据角色创建对应的profile
  if (role === 'client') {
    await db.run(
      `INSERT INTO client_profiles (user_id, address, elder_mode)
       VALUES (:user_id, '', 0)`,
      { user_id: userId }
    );
  } else if (role === 'guardian') {
    await db.run(
      `INSERT INTO guardian_profiles (user_id, relationship)
       VALUES (:user_id, '')`,
      { user_id: userId }
    );
  } else if (role === 'merchant') {
    await db.run(
      `INSERT INTO merchant_profiles (user_id, merchant_name, community, contact)
       VALUES (:user_id, '未命名商户', '', '')`,
      { user_id: userId }
    );
  }
  
  const token = generateToken({ id: userId, role });
  const newUser = await db.get(
    'SELECT id, username, name, role, phone, id_card, id_verified, community_id, community_code FROM users WHERE id = :id',
    { id: userId }
  );
  return success(res, { token, user: { ...newUser, id_verified: !!newUser.id_verified } }, '注册成功');
});

router.post('/login', async (req, res) => {
  const { identifier, password, rememberMe = true } = req.body;
  if (!identifier || !password) return failure(res, '请输入账号和密码');
  const user = await db.get('SELECT * FROM users WHERE username = :identifier OR phone = :identifier', { identifier });
  if (!user || !comparePassword(password, user.password)) {
    return failure(res, '用户名或密码错误', 401);
  }
  const token = generateToken({ id: user.id, role: user.role, remember: !!rememberMe });
  
  // 加载 profile 信息（包含地址）
  const profile = await loadProfileByRole(user.role, user.id);
  
  // 构建用户数据，合并地址信息
  const userData = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone,
    email: user.email,
    id_card: user.id_card || null,
    id_verified: !!user.id_verified,
    community_id: user.community_id || null,
    community_code: user.community_code || null,
    preferences: user.preferences ? JSON.parse(user.preferences) : {}
  };
  
  // 将地址合并到 user 对象中（适用于 client 和 guardian 角色）
  if ((user.role === 'guardian' || user.role === 'client')) {
    userData.address = profile?.address ?? null;
  }
  
  // 如果是client角色，添加会员状态
  if (user.role === 'client') {
    userData.is_member = profile?.is_member ? !!profile.is_member : false;
    userData.health_conditions = profile?.health_conditions ?? null;
    userData.diet_preferences = profile?.diet_preferences ? JSON.parse(profile.diet_preferences) : [];
    userData.notification_settings = profile?.notification_settings ? JSON.parse(profile.notification_settings) : [];
  }
  
  return success(
    res,
    {
      token,
      user: userData,
      profile
    },
    '登录成功'
  );
});

router.get('/me', authRequired, async (req, res) => {
  // 重新查询用户信息，包含身份证字段
  const user = await db.get(
    'SELECT id, username, name, role, phone, email, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :id',
    { id: req.user.id }
  );
  const profile = await loadProfileByRole(req.user.role, req.user.id);
  
  // 将地址合并到 user 对象中（适用于 client 和 guardian 角色）
  const userData = {
    ...user,
    id_verified: !!user.id_verified,
    preferences: user.preferences ? JSON.parse(user.preferences) : {}
  };
  
  // 确保地址（包括 null）都被正确设置
  if (req.user.role === 'guardian' || req.user.role === 'client') {
    userData.address = profile?.address ?? null;
  }
  
  // 如果是client角色，添加会员状态
  if (req.user.role === 'client') {
    userData.is_member = profile?.is_member ? !!profile.is_member : false;
    userData.health_conditions = profile?.health_conditions ?? null;
    userData.diet_preferences = profile?.diet_preferences ? JSON.parse(profile.diet_preferences) : [];
    userData.notification_settings = profile?.notification_settings ? JSON.parse(profile.notification_settings) : [];
  }
  
  return success(res, {
    user: userData,
    profile
  });
});

module.exports = router;
