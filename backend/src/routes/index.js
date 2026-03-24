import { Router }        from 'express';
import { authenticate }  from '../middleware/auth.js';
import * as auth         from '../controllers/auth.controller.js';
import * as txn          from '../controllers/transactions.controller.js';
import * as debts        from '../controllers/debts.controller.js';
import * as savings      from '../controllers/savings.controller.js';
import * as dash         from '../controllers/dashboard.controller.js';
import * as recurring    from '../controllers/recurring.controller.js';
import * as cards        from '../controllers/credit_cards.controller.js';

const r = Router();

// Auth
r.post('/auth/register', auth.register);
r.post('/auth/login',    auth.login);
r.get ('/auth/me',       authenticate, auth.me);
r.put ('/auth/profile',             authenticate, auth.updateProfile);
r.put ('/auth/onboarding/complete', authenticate, auth.completeOnboarding);
r.put ('/auth/password',            authenticate, auth.changePassword);

// Dashboard
r.get('/dashboard', authenticate, dash.getDashboard);

// Transactions
r.get ('/transactions',          authenticate, txn.list);
r.post('/transactions',          authenticate, txn.create);
r.put ('/transactions/:id',      authenticate, txn.update);
r.delete('/transactions/:id',    authenticate, txn.remove);
r.get ('/transactions/summary',  authenticate, txn.summary);
r.get ('/transactions/export',   authenticate, txn.exportCsv);
r.get ('/categories',            authenticate, txn.getCategories);

// Debts
r.get   ('/debts',                authenticate, debts.list);
r.post  ('/debts',                authenticate, debts.create);
r.get   ('/debts/:id',            authenticate, debts.getOne);
r.put   ('/debts/:id',            authenticate, debts.update);
r.delete('/debts/:id',            authenticate, debts.remove);
r.post  ('/debts/:id/payments',              authenticate, debts.addPayment);
r.get   ('/debts/:id/payments',              authenticate, debts.getPayments);
r.post  ('/debts/:id/planned',               authenticate, debts.addPlanned);
r.delete('/debts/:id/planned/:plannedId',    authenticate, debts.removePlanned);

// Savings
r.get   ('/savings',                        authenticate, savings.list);
r.post  ('/savings',                        authenticate, savings.create);
r.get   ('/savings/:id',                    authenticate, savings.getOne);
r.put   ('/savings/:id',                    authenticate, savings.update);
r.delete('/savings/:id',                    authenticate, savings.remove);
r.post  ('/savings/:id/contributions',      authenticate, savings.addContribution);

// Recurring transactions
r.get   ('/recurring',     authenticate, recurring.list);
r.post  ('/recurring',     authenticate, recurring.create);
r.put   ('/recurring/:id', authenticate, recurring.update);
r.delete('/recurring/:id', authenticate, recurring.remove);

// Credit cards
r.get   ('/credit-cards',                   authenticate, cards.list);
r.post  ('/credit-cards',                   authenticate, cards.create);
r.put   ('/credit-cards/:id',               authenticate, cards.update);
r.delete('/credit-cards/:id',               authenticate, cards.remove);
r.get   ('/credit-cards/:id/transactions',  authenticate, cards.getTransactions);
r.post  ('/credit-cards/:id/payments',      authenticate, cards.addPayment);

export default r;
