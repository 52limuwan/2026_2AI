# Mongo 数据说明（已用于迁移）

- 本目录用于存放历史 Mongo 导出信息，现已映射到本地 SQLite。
- 迁移后的核心实体：users、client_profiles、guardian_profiles、merchant_profiles、gov_profiles、guardian_client_links、dishes、orders、order_items、nutrition_reports、notifications、purchase_plans、solar_terms_tips。
- `schema.json` 提供字段和示例数据结构，迁移脚本 `src/scripts/migrateFromMongo.js` 会读取这里的信息并写入 SQLite。
- 若需要重新迁移或验证字段，可更新 `schema.json` 后执行 `npm run migrate`（或 `pnpm run migrate`）。***
