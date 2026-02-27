-- 设置个性化菜单测试数据

-- 1. 为 client01 用户添加健康信息（高血压、糖尿病）
UPDATE client_profiles 
SET chronic_conditions = '["高血压", "糖尿病"]', 
    updated_at = CURRENT_TIMESTAMP 
WHERE user_id = (SELECT id FROM users WHERE username = 'client01');

-- 2. 为菜品添加健康标签（根据实际菜品ID调整）
-- 低盐低脂菜品（适合高血压、高血脂）
UPDATE dishes 
SET tags = '低盐,低脂,清淡,鱼类', 
    updated_at = CURRENT_TIMESTAMP 
WHERE id IN (SELECT id FROM dishes LIMIT 1);

-- 低糖粗粮菜品（适合糖尿病）
UPDATE dishes 
SET tags = '低糖,粗粮,全谷物,控糖', 
    updated_at = CURRENT_TIMESTAMP 
WHERE id IN (SELECT id FROM dishes LIMIT 1 OFFSET 1);

-- 降压菜品（适合高血压）
UPDATE dishes 
SET tags = '低盐,降压,芹菜,木耳', 
    updated_at = CURRENT_TIMESTAMP 
WHERE id IN (SELECT id FROM dishes LIMIT 1 OFFSET 2);

-- 高纤维菜品（适合糖尿病、便秘）
UPDATE dishes 
SET tags = '高纤维,蔬菜,粗粮', 
    updated_at = CURRENT_TIMESTAMP 
WHERE id IN (SELECT id FROM dishes LIMIT 1 OFFSET 3);

-- 低脂豆制品（适合高血脂）
UPDATE dishes 
SET tags = '低脂,豆制品,清淡', 
    updated_at = CURRENT_TIMESTAMP 
WHERE id IN (SELECT id FROM dishes LIMIT 1 OFFSET 4);

-- 查看设置结果
SELECT 
    u.username,
    cp.chronic_conditions
FROM users u
JOIN client_profiles cp ON cp.user_id = u.id
WHERE u.username = 'client01';

SELECT 
    id,
    name,
    tags,
    category
FROM dishes 
WHERE tags IS NOT NULL AND tags != ''
LIMIT 5;
