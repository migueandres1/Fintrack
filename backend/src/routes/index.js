import { Router }        from 'express';
import multer            from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireFeature, requireLimit } from '../middleware/planGuard.js';
import pool              from '../config/db.js';
import * as auth         from '../controllers/auth.controller.js';
import * as txn          from '../controllers/transactions.controller.js';
import * as debts        from '../controllers/debts.controller.js';
import * as savings      from '../controllers/savings.controller.js';
import * as dash         from '../controllers/dashboard.controller.js';
import * as recurring    from '../controllers/recurring.controller.js';
import * as cards        from '../controllers/credit_cards.controller.js';
import * as budgets      from '../controllers/budgets.controller.js';
import * as accounts     from '../controllers/accounts.controller.js';
import * as ocr          from '../controllers/ocr.controller.js';
import * as cats         from '../controllers/categories.controller.js';
import * as billing      from '../controllers/billing.controller.js';
import * as admin        from '../controllers/admin.controller.js';

// Multer: memoria, solo imágenes y PDF, máx 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    cb(null, ok);
  },
});

// ── Count helpers para límites del plan ────────────────────────────────────
const countAccounts   = (uid) => pool.query('SELECT COUNT(*) c FROM bank_accounts     WHERE user_id=?',[uid]).then(([r])=>r[0].c);
const countCards      = (uid) => pool.query('SELECT COUNT(*) c FROM credit_cards       WHERE user_id=?',[uid]).then(([r])=>r[0].c);
const countGoals      = (uid) => pool.query('SELECT COUNT(*) c FROM savings_goals      WHERE user_id=?',[uid]).then(([r])=>r[0].c);
const countTxMonth    = (uid) => pool.query(
  "SELECT COUNT(*) c FROM transactions WHERE user_id=? AND DATE_FORMAT(date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m')",
  [uid]
).then(([r])=>r[0].c);

const r = Router();

// ── Auth ───────────────────────────────────────────────────────────────────
r.post('/auth/register', auth.register);
r.post('/auth/login',    auth.login);
r.get ('/auth/me',       authenticate, auth.me);
r.put ('/auth/profile',             authenticate, auth.updateProfile);
r.put ('/auth/onboarding/complete', authenticate, auth.completeOnboarding);
r.put ('/auth/password',            authenticate, auth.changePassword);

// ── Billing ────────────────────────────────────────────────────────────────
r.get ('/billing/status',   authenticate, billing.getStatus);
r.post('/billing/checkout', authenticate, billing.createCheckout);
r.post('/billing/sync',     authenticate, billing.syncCheckout);
r.post('/billing/portal',   authenticate, billing.createPortal);
// Nota: /billing/webhook se registra en index.js (necesita raw body)

// ── Dashboard ──────────────────────────────────────────────────────────────
r.get('/dashboard', authenticate, dash.getDashboard);

// ── Transactions ───────────────────────────────────────────────────────────
r.get   ('/transactions',                authenticate, txn.list);
r.post  ('/transactions',                authenticate, requireLimit('tx_month', countTxMonth), txn.create);
r.put   ('/transactions/:id',            authenticate, txn.update);
r.delete('/transactions/:id',            authenticate, txn.remove);
r.get   ('/transactions/summary',        authenticate, txn.summary);
r.get   ('/transactions/export',         authenticate, txn.exportCsv);
r.post  ('/transactions/import-statement', authenticate, requireFeature('ocr'), upload.single('file'), txn.importStatement);

// ── Categories ─────────────────────────────────────────────────────────────
r.get   ('/categories',          authenticate, cats.listVisible);
r.get   ('/categories/manage',   authenticate, cats.listAll);
r.post  ('/categories',          authenticate, cats.create);
r.put   ('/categories/:id',      authenticate, cats.update);
r.delete('/categories/:id',      authenticate, cats.remove);
r.post  ('/categories/:id/hide', authenticate, cats.hide);
r.delete('/categories/:id/hide', authenticate, cats.unhide);

// ── Debts (PRO feature) ────────────────────────────────────────────────────
r.get   ('/debts',                           authenticate, debts.list);
r.post  ('/debts',                           authenticate, requireFeature('debts'), debts.create);
r.get   ('/debts/:id',                       authenticate, debts.getOne);
r.put   ('/debts/:id',                       authenticate, debts.update);
r.delete('/debts/:id',                       authenticate, debts.remove);
r.post  ('/debts/:id/payments',              authenticate, debts.addPayment);
r.get   ('/debts/:id/payments',              authenticate, debts.getPayments);
r.post  ('/debts/:id/planned',               authenticate, debts.addPlanned);
r.delete('/debts/:id/planned/:plannedId',    authenticate, debts.removePlanned);

// ── Savings ────────────────────────────────────────────────────────────────
r.get   ('/savings',                         authenticate, savings.list);
r.post  ('/savings',                         authenticate, requireLimit('goals', countGoals), savings.create);
r.get   ('/savings/:id',                     authenticate, savings.getOne);
r.put   ('/savings/:id',                     authenticate, savings.update);
r.delete('/savings/:id',                     authenticate, savings.remove);
r.post  ('/savings/:id/contributions',       authenticate, savings.addContribution);
r.put   ('/savings/contributions/:contribId',authenticate, savings.updateContribution);
r.delete('/savings/contributions/:contribId',authenticate, savings.deleteContribution);

// ── Recurring ──────────────────────────────────────────────────────────────
r.get   ('/recurring',     authenticate, recurring.list);
r.post  ('/recurring',     authenticate, recurring.create);
r.put   ('/recurring/:id', authenticate, recurring.update);
r.delete('/recurring/:id', authenticate, recurring.remove);

// ── Credit cards ───────────────────────────────────────────────────────────
r.get   ('/credit-cards',                  authenticate, cards.list);
r.post  ('/credit-cards',                  authenticate, requireLimit('cards', countCards), cards.create);
r.put   ('/credit-cards/:id',              authenticate, cards.update);
r.delete('/credit-cards/:id',              authenticate, cards.remove);
r.get   ('/credit-cards/:id/transactions', authenticate, cards.getTransactions);
r.post  ('/credit-cards/:id/payments',     authenticate, cards.addPayment);

// ── OCR (PRO feature) ──────────────────────────────────────────────────────
r.post('/ocr/receipt', authenticate, requireFeature('ocr'), upload.single('receipt'), ocr.processReceipt);

// ── Bank accounts ──────────────────────────────────────────────────────────
r.get   ('/accounts',                  authenticate, accounts.list);
r.post  ('/accounts',                  authenticate, requireLimit('accounts', countAccounts), accounts.create);
r.put   ('/accounts/:id',              authenticate, accounts.update);
r.delete('/accounts/:id',              authenticate, accounts.remove);
r.get   ('/accounts/:id/transactions', authenticate, accounts.getTransactions);

// ── Budgets ────────────────────────────────────────────────────────────────
r.get   ('/budgets',                          authenticate, budgets.list);
r.put   ('/budgets',                          authenticate, budgets.upsert);
r.post  ('/budgets/copy',                     authenticate, budgets.copyFromLastMonth);
r.post  ('/budgets/income',                   authenticate, budgets.addPlannedIncome);
r.delete('/budgets/income/:id',               authenticate, budgets.removePlannedIncome);
r.get   ('/budgets/suggestions',              authenticate, budgets.getSuggestions);
r.get   ('/budgets/:categoryId/transactions', authenticate, budgets.categoryDetail);
r.get   ('/budgets/:categoryId/history',      authenticate, budgets.categoryHistory);
r.delete('/budgets/:id',                      authenticate, budgets.remove);

// ── Admin ───────────────────────────────────────────────────────────────────
r.get('/admin/stats', authenticate, requireAdmin, admin.getStats);

export default r;
