-- 为不同用户设置不同疾病和菜品标签

-- 1. 查看现有客户用户
SELECT '=== 现有客户用户 ===' as info;
SELECT id, username, name FROM users WHERE role = 'client' ORDER BY id;

-- 2. 为不同客户设置不同的疾病
-- 假设有 client01, client02, client03 等用户

-- client01 或第1个客户 → 高血糖/糖尿病
UPDATE client_profiles 
SET chronic_conditions = '["高血糖", "糖尿病"]' 
WHERE user_id = (SELECT id FROM users WHERE role = 'client' ORDER BY id LIMIT 1 OFFSET 0);

-- client02 或第2个客户 → 高血压
UPDATE client_profiles 
SET chronic_conditions = '["高血压"]' 
WHERE user_id = (SELECT id FROM users WHERE role = 'client' ORDER BY id LIMIT 1 OFFSET 1);

-- client03 或第3个客户 → 高血脂
UPDATE client_profiles 
SET chronic_conditions = '["高血脂"]' 
WHERE user_id = (SELECT id FROM users WHERE role = 'client' ORDER BY id LIMIT 1 OFFSET 2);

-- 第4个客户 → 痛风
UPDATE client_profiles 
SET chronic_conditions = '["痛风"]' 
WHERE user_id = (SELECT id FROM users WHERE role = 'client' ORDER BY id LIMIT 1 OFFSET 3);

-- 第5个客户 → 贫血
UPDATE client_profiles 
SET chronic_conditions = '["贫血"]' 
WHERE user_id = (SELECT id FROM users WHERE role = 'client' ORDER BY id LIMIT 1 OFFSET 4);

-- 3. 查看菜品
SELECT '=== 现有菜品 ===' as info;
SELECT id, name FROM dishes ORDER BY id LIMIT 20;

-- 4. 为菜品添加有针对性的标签（根据上面查到的菜品ID调整）

-- 适合糖尿病的菜品
UPDATE dishes SET tags = '低糖,无糖,粗粮,全谷物,控糖' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 0);
UPDATE dishes SET tags = '低糖,苦瓜,燕麦,荞麦' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 1);
UPDATE dishes SET tags = '粗粮,全谷物,膳食纤维' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 2);

-- 适合高血压的菜品
UPDATE dishes SET tags = '低盐,低钠,降压,芹菜' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 3);
UPDATE dishes SET tags = '低盐,木耳,菌菇,海带' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 4);
UPDATE dishes SET tags = '低钠,紫菜,降压' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 5);

-- 适合高血脂的菜品
UPDATE dishes SET tags = '低脂,鱼类,深海鱼' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 6);
UPDATE dishes SET tags = '低脂,豆制品,燕麦' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 7);
UPDATE dishes SET tags = '坚果,橄榄油,低脂' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 8);

-- 适合痛风的菜品
UPDATE dishes SET tags = '低嘌呤,碱性,蔬菜' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 9);
UPDATE dishes SET tags = '低嘌呤,水果,碱性食物' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 10);

-- 适合贫血的菜品
UPDATE dishes SET tags = '补铁,补血,红肉' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 11);
UPDATE dishes SET tags = '补铁,动物肝脏,红枣' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 12);
UPDATE dishes SET tags = '补血,菠菜,补铁' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 13);

-- 通用健康菜品
UPDATE dishes SET tags = '清淡,易消化,软烂' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 14);
UPDATE dishes SET tags = '高纤维,蔬菜,粗粮' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 15);
UPDATE dishes SET tags = '高钙,补钙,奶制品' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 16);
UPDATE dishes SET tags = '豆制品,虾皮,芝麻' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 17);
UPDATE dishes SET tags = '优质蛋白,低盐,低蛋白' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 18);
UPDATE dishes SET tags = '低磷,低钾,优质蛋白' WHERE id = (SELECT id FROM dishes ORDER BY id LIMIT 1 OFFSET 19);

-- 5. 验证设置
SELECT '=== 验证用户健康信息 ===' as info;
SELECT u.username, cp.chronic_conditions 
FROM users u 
JOIN client_profiles cp ON cp.user_id = u.id 
WHERE u.role = 'client'
ORDER BY u.id;

SELECT '=== 验证菜品标签 ===' as info;
SELECT id, name, tags FROM dishes WHERE tags IS NOT NULL AND tags != '' ORDER BY id LIMIT 10;
