const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { success } = require('../utils/respond');

const router = express.Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  const rows = await db.all('SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 100', { user_id: req.user.id });
  return success(res, { notifications: rows });
});

router.post('/:id/read', async (req, res) => {
  await db.run('UPDATE notifications SET status = "read" WHERE id = :id AND user_id = :user_id', { id: req.params.id, user_id: req.user.id });
  return success(res, { id: req.params.id, status: 'read' });
});

module.exports = router;
