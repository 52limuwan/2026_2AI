const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');

const router = express.Router();

router.use(authRequired);

router.get('/client/:id', async (req, res) => {
  const { type = 'week' } = req.query;
  const rows = (await db.all('SELECT * FROM nutrition_reports WHERE client_id = :client_id AND type = :type ORDER BY created_at DESC LIMIT 6', {
    client_id: req.params.id,
    type
  })).map((r) => ({ ...r, summary: r.summary ? JSON.parse(r.summary) : {} }));
  return success(res, { reports: rows });
});

router.post('/generate', async (req, res) => {
  const { clientId, type = 'week', summary = {}, recommendations = '' } = req.body;
  if (!clientId) return failure(res, '缺少用户');
  const result = await db.run(
    `INSERT INTO nutrition_reports (client_id, type, period_start, period_end, summary, recommendations)
     VALUES (:client_id, :type, :period_start, :period_end, :summary, :recommendations)`,
    {
      client_id: clientId,
      type,
      period_start: req.body.period_start || null,
      period_end: req.body.period_end || null,
      summary: JSON.stringify(summary || {}),
      recommendations
    }
  );
  const report = await db.get('SELECT * FROM nutrition_reports WHERE id = :id', { id: result.lastInsertRowid });
  return success(res, { report }, '报告已生成');
});

module.exports = router;
