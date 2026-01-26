const ROLE_ENUM = ['client', 'guardian', 'merchant', 'gov'];
const ORDER_STATUS = ['placed', 'preparing', 'delivering', 'delivered', 'cancelled'];
const RISK_EVENT_STATUS = ['open', 'handled', 'closed'];
const INTERVENTION_STATUS = ['sent', 'ack', 'done'];

async function ensureColumn(db, table, column, typeDef) {
  const info = await db.all(`PRAGMA table_info(${table})`);
  const exists = info.some((c) => c.name === column);
  if (!exists) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`);
  }
}

async function initSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS communities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      region TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN (${ROLE_ENUM.map(r => `'${r}'`).join(',')})),
      email TEXT,
      phone TEXT,
      id_card TEXT,
      id_verified INTEGER DEFAULT 1,
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      community_code TEXT,
      avatar TEXT,
      locale TEXT DEFAULT 'zh-CN',
      preferences TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gov_scopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gov_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      role_in_scope TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(gov_user_id, community_id)
    );

    CREATE TABLE IF NOT EXISTS client_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      age INTEGER,
      gender TEXT,
      address TEXT,
      chronic_conditions TEXT,
      taste_preferences TEXT,
      restrictions TEXT,
      elder_mode INTEGER DEFAULT 0,
      guardian_contact TEXT,
      risk_flags TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guardian_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      relationship TEXT,
      notification_channel TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guardian_client_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guardian_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relation TEXT,
      bind_id_card TEXT,
      bind_phone TEXT,
      status TEXT DEFAULT 'active',
      verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guardian_id, client_id)
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      location TEXT,
      description TEXT,
      distance TEXT,
      tags TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS merchant_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      merchant_name TEXT NOT NULL,
      community TEXT,
      contact TEXT,
      current_store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gov_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      region TEXT,
      department TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      category TEXT,
      price REAL NOT NULL,
      cost REAL DEFAULT 0,
      status TEXT DEFAULT 'available',
      stock INTEGER DEFAULT 0,
      image TEXT,
      tags TEXT,
      nutrition TEXT,
      description TEXT,
      seasonal_tip TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      guardian_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      merchant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      community_code TEXT,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'placed' CHECK (status IN (${ORDER_STATUS.map(s => `'${s}'`).join(',')})),
      payment_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      scheduled_at TEXT,
      delivered_at TEXT,
      address TEXT,
      contact TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      dish_id INTEGER REFERENCES dishes(id) ON DELETE SET NULL,
      dish_name TEXT,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      nutrition TEXT
    );

    CREATE TABLE IF NOT EXISTS nutrition_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      period_start TEXT,
      period_end TEXT,
      summary TEXT,
      recommendations TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nutrition_intake_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      totals TEXT,
      source TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, date)
    );

    CREATE TABLE IF NOT EXISTS risk_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      condition_json TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      rule_id INTEGER REFERENCES risk_rules(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'open' CHECK (status IN (${RISK_EVENT_STATUS.map(s => `'${s}'`).join(',')})),
      triggered_at TEXT NOT NULL,
      data_snapshot TEXT,
      assigned_gov_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      handled_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      risk_event_id INTEGER NOT NULL REFERENCES risk_events(id) ON DELETE CASCADE,
      gov_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      suggestion TEXT,
      action_plan TEXT,
      status TEXT DEFAULT 'sent' CHECK (status IN (${INTERVENTION_STATUS.map(s => `'${s}'`).join(',')})),
      notified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      event_type TEXT,
      related_id INTEGER,
      severity TEXT,
      channel TEXT DEFAULT 'in_app',
      status TEXT DEFAULT 'unread',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS solar_terms_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      tip TEXT NOT NULL,
      actions TEXT,
      applicable_roles TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      plan_date TEXT NOT NULL,
      items TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      conversation_id TEXT,
      role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
      content TEXT NOT NULL,
      context TEXT,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dietary_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      food_name TEXT NOT NULL,
      meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      record_date TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit TEXT DEFAULT '份',
      nutrition TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_diet_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      nutrition_data TEXT NOT NULL,
      ai_analysis TEXT NOT NULL,
      model_used TEXT,
      tokens_used INTEGER,
      generated_by_role TEXT DEFAULT 'client' CHECK (generated_by_role IN ('client', 'guardian')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn(db, 'orders', 'community_name', 'TEXT');
  await ensureColumn(db, 'orders', 'window_name', 'TEXT');
  await ensureColumn(db, 'orders', 'store_id', 'INTEGER');
  await ensureColumn(db, 'orders', 'community_id', 'INTEGER');
  await ensureColumn(db, 'orders', 'community_code', 'TEXT');
  await ensureColumn(db, 'client_profiles', 'risk_flags', 'TEXT');
  await ensureColumn(db, 'client_profiles', 'guardian_contact', 'TEXT');
  await ensureColumn(db, 'ai_diet_reports', 'generated_by_role', "TEXT DEFAULT 'client'");
  await ensureColumn(db, 'client_profiles', 'is_member', 'INTEGER DEFAULT 0');
  await ensureColumn(db, 'client_profiles', 'health_conditions', 'TEXT');
  await ensureColumn(db, 'client_profiles', 'diet_preferences', 'TEXT');
  await ensureColumn(db, 'client_profiles', 'notification_settings', 'TEXT');
  
  // 添加菜品会员价格字段
  await ensureColumn(db, 'dishes', 'member_price', 'REAL');
  // 添加菜品月销字段
  await ensureColumn(db, 'dishes', 'monthly_sales', 'INTEGER DEFAULT 0');
  
  // 添加身份证相关字段
  await ensureColumn(db, 'users', 'id_card', 'TEXT');
  await ensureColumn(db, 'users', 'id_verified', 'INTEGER DEFAULT 1');
  await ensureColumn(db, 'users', 'community_id', 'INTEGER');
  await ensureColumn(db, 'users', 'community_code', 'TEXT');
  
  // 添加店面相关字段
  await ensureColumn(db, 'merchant_profiles', 'current_store_id', 'INTEGER');
  await ensureColumn(db, 'dishes', 'store_id', 'INTEGER');
  await ensureColumn(db, 'stores', 'community_id', 'INTEGER');
  await ensureColumn(db, 'guardian_client_links', 'bind_id_card', 'TEXT');
  await ensureColumn(db, 'guardian_client_links', 'bind_phone', 'TEXT');
  await ensureColumn(db, 'guardian_client_links', 'verified_at', 'TEXT');
  await ensureColumn(db, 'guardian_profiles', 'address', 'TEXT');
  await ensureColumn(db, 'ai_chat_messages', 'target_client_id', 'INTEGER');
  await ensureColumn(db, 'ai_chat_messages', 'context', 'TEXT');
  await ensureColumn(db, 'notifications', 'event_type', 'TEXT');
  await ensureColumn(db, 'notifications', 'related_id', 'INTEGER');
  await ensureColumn(db, 'notifications', 'severity', 'TEXT');
  
  // 添加采购计划状态字段
  await ensureColumn(db, 'purchase_plans', 'status', 'TEXT DEFAULT "pending"');
  
  // 创建索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_target_client_id ON ai_chat_messages(target_client_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_conversation_id ON ai_chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_timestamp ON ai_chat_messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_dietary_records_client_id ON dietary_records(client_id);
    CREATE INDEX IF NOT EXISTS idx_dietary_records_date ON dietary_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_users_community_id ON users(community_id);
    CREATE INDEX IF NOT EXISTS idx_gov_scopes_gov_user_id ON gov_scopes(gov_user_id);
    CREATE INDEX IF NOT EXISTS idx_gov_scopes_community_id ON gov_scopes(community_id);
    CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_orders_community_id ON orders(community_id);
    CREATE INDEX IF NOT EXISTS idx_risk_events_client_id ON risk_events(client_id);
    CREATE INDEX IF NOT EXISTS idx_risk_events_community_id ON risk_events(community_id);
    CREATE INDEX IF NOT EXISTS idx_nutrition_intake_daily_client_date ON nutrition_intake_daily(client_id, date);
    CREATE INDEX IF NOT EXISTS idx_stores_merchant_id ON stores(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_dishes_store_id ON dishes(store_id);
    CREATE INDEX IF NOT EXISTS idx_ai_diet_reports_client_id ON ai_diet_reports(client_id);
    CREATE INDEX IF NOT EXISTS idx_ai_diet_reports_type_date ON ai_diet_reports(report_type, created_at);
  `);
}

module.exports = {
  initSchema
};
