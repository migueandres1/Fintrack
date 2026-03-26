import pool from '../config/db.js';

export async function getStats(req, res) {
  try {
    const [[users]] = await pool.query(`
      SELECT
        COUNT(*)                                                                                  AS total,
        SUM(plan = 'free')                                                                       AS plan_free,
        SUM(plan = 'beta')                                                                       AS plan_beta,
        SUM(plan = 'pro')                                                                        AS plan_pro,
        SUM(plan = 'familia')                                                                    AS plan_familia,
        SUM(MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()))        AS new_this_month,
        SUM(MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)) AS new_last_month
      FROM users
      WHERE is_admin = 0
    `);

    const [[txns]] = await pool.query(`
      SELECT
        COUNT(*)                                                                                              AS total,
        SUM(MONTH(txn_date) = MONTH(CURDATE()) AND YEAR(txn_date) = YEAR(CURDATE()))                        AS this_month,
        SUM(MONTH(txn_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(txn_date) = YEAR(CURDATE() - INTERVAL 1 MONTH)) AS last_month
      FROM transactions
    `);

    const [recentUsers] = await pool.query(`
      SELECT id, name, email, plan, created_at
      FROM users
      WHERE is_admin = 0
      ORDER BY created_at DESC
      LIMIT 25
    `);

    const [monthlyGrowth] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS count
      FROM users
      WHERE is_admin = 0 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month
    `);

    const mrr = (Number(users.plan_pro) * 4.99) + (Number(users.plan_familia) * 7.99);

    res.json({
      users: {
        total:          Number(users.total),
        plan_free:      Number(users.plan_free),
        plan_beta:      Number(users.plan_beta),
        plan_pro:       Number(users.plan_pro),
        plan_familia:   Number(users.plan_familia),
        new_this_month: Number(users.new_this_month),
        new_last_month: Number(users.new_last_month),
      },
      transactions: {
        total:      Number(txns.total),
        this_month: Number(txns.this_month),
        last_month: Number(txns.last_month),
      },
      mrr: +mrr.toFixed(2),
      recent_users:   recentUsers,
      monthly_growth: monthlyGrowth,
    });
  } catch (err) {
    console.error('admin.getStats:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}
