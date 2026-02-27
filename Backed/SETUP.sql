-- 个性化菜单设置SQL
-- 直接在SQLite中执行这些命令

-- 1. 查看现有用户
SELECT '=== 现有用户 ===' as info;
SELECT username, role FROM users;

-- 2. 为所有客户用户设置健康信息
UPDATE client_profiles 
SET chronic_conditions = '["高血压", "糖尿病"]' 
WHERE user_id IN (SELECT id FROM users WHERE role = 'client');

-- 3. 查看菜品
SELECT '=== 现有菜品（前10个）===' as info;
SELECT id, name FROM dishes LIMIT 10;

-- 4. 为菜品添加健康标签（根据上面查到的菜品ID调整）
UPDATE dishes SET tags = '低盐,低脂,清淡,鱼类' WHERE id = 1;
UPDATE dishes SET tags = '低糖,粗粮,全谷物,控糖' WHERE id = 2;
UPDATE dishes SET tags = '低盐,降压,芹菜,木耳' WHERE id = 3;
UPDATE dishes SET tags = '高纤维,蔬菜,粗粮' WHERE id = 4;
UPDATE dishes SET tags = '低脂,豆制品,清淡' WHERE id = 5;
UPDATE dishes SET tags = '补钙,高钙,奶制品' WHERE id = 6;
UPDATE dishes SET tags = '补铁,补血,红肉' WHERE id = 7;
UPDATE dishes SET tags = '低嘌呤,碱性,蔬菜' WHERE id = 8;
UPDATE dishes SET tags = '低盐,低蛋白,优质蛋白' WHERE id = 9;
UPDATE dishes SET tags = '清淡,易消化,软烂' WHERE id = 10;

-- 5. 验证设置
SELECT '=== 验证用户健康信息 ===' as info;
SELECT u.username, cp.chronic_conditions 
FROM users u 
JOIN client_profiles cp ON cp.user_id = u.id 
WHERE u.role = 'client';

SELECT '=== 验证菜品标签 ===' as info;
SELECT name, tags FROM dishes WHERE tags IS NOT NULL AND tags != '' LIMIT 5;
