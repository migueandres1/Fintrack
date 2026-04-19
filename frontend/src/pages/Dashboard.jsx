import { useEffect, useState, useRef } from 'react';
import {
  Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, ScanLine, Loader2,
  ArrowRight, Sparkles, Wallet, Landmark, CreditCard, Calendar, FileText,
  Bell, Search, MoreHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore }  from '../store/index.js';
import { Capacitor } from '@capacitor/core';
import { captureReceiptPhoto } from '../utils/captureReceipt.js';
import { fmt, localDate } from '../utils/format.js';
import { Spinner, Modal } from '../components/ui/index.jsx';
import api  from '../services/api.js';
import clsx from 'clsx';

const SCORE_ADVICE = {
  liquidez: 'Aumenta tu fondo de emergencia para cubrir al menos 3 meses de gastos.',
  ahorro:   'Intenta ahorrar al menos el 20% de tus ingresos cada mes.',
  deuda:    'Reduce los pagos de deuda por debajo del 30% de tus ingresos.',
  metas:    'Crea o avanza en tus metas de ahorro para mejorar este indicador.',
};

const EMPTY_QUICK = {
  type: 'expense', category_id: '', amount: '', description: '',
  txn_date: localDate(), debt_id: '', savings_goal_id: '', credit_card_id: '', account_id: '',
  extra_principal: '0', payment_method: 'cash',
};

export default function Dashboard() {
  const {
    dashboard, dashLoading, fetchDashboard, user,
    accounts, fetchAccounts,
    creditCards, fetchCreditCards,
    categories, fetchCategories, createTransaction,
    billingStatus,
  } = useStore();

  const [quickModal, setQuickModal] = useState(false);
  const [quickForm,  setQuickForm]  = useState(EMPTY_QUICK);
  const [quickBusy,  setQuickBusy]  = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const cameraInputRef = useRef(null);
  const effectivePlan  = billingStatus?.plan ?? user?.plan ?? 'free';

  useEffect(() => {
    fetchDashboard();
    fetchAccounts();
    fetchCreditCards();
    fetchCategories();
  }, []);

  if (dashLoading && !dashboard) return <div style={{ padding: 40 }}><Spinner /></div>;

  const d        = dashboard;
  const currency = user?.currency || 'USD';
  const firstName = user?.name?.split(' ')[0] || '';

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buen día';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();
  const dateLabel = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const monthLabel = new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' });

  const balance  = d?.balance?.total || 0;
  const income   = d?.this_month?.income   || 0;
  const expenses = d?.this_month?.expenses || 0;
  const trendPct = income > 0 ? ((income - expenses) / income * 100) : 0;
  const trendAbs = income - expenses;

  const score      = d?.score;
  const scoreTotal = score?.total ?? null;
  const scoreColor = scoreTotal == null ? 'var(--c500)' : scoreTotal >= 75 ? 'var(--c500)' : scoreTotal >= 50 ? '#f0a500' : '#e53e3e';
  const scoreLabel = scoreTotal == null ? '—' : scoreTotal >= 75 ? 'Excelente' : scoreTotal >= 50 ? 'Regular' : 'Por mejorar';

  const worstKey = score?.dimensions
    ? Object.entries(score.dimensions).sort((a, b) => a[1] - b[1])[0]?.[0]
    : null;
  const advice = worstKey ? SCORE_ADVICE[worstKey] : null;

  const trendData  = (d?.monthly_trend || []).map(r => ({
    month: r.month,
    income: Number(r.income) || 0,
    expenses: Number(r.expenses) || 0,
  }));
  const trendMax   = Math.max(1, ...trendData.flatMap(r => [r.income, r.expenses]));
  const monthShort = (m) => {
    const d = new Date(m + '-01T12:00:00');
    return d.toLocaleDateString('es', { month: 'short' }).replace('.', '');
  };

  const catBreakdown = d?.top_categories || [];
  const catMax       = Math.max(1, ...catBreakdown.map(c => Number(c.total)));
  const recentTxns   = d?.recent_transactions || [];

  const savingPct  = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const expensePct = income > 0 ? Math.round((expenses / income) * 100) : 0;
  const debtTotal  = d?.debts?.reduce((s, db) => s + Number(db.monthly_payment || 0), 0) || 0;
  const debtPct    = income > 0 ? Math.round((debtTotal / income) * 100) : 0;

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  const balanceParts = fmt.currency(Math.abs(balance), currency).replace(/[^0-9,.]/g, '').split('.');
  const balanceInt   = balanceParts[0] || '0';
  const balanceDec   = balanceParts[1] || '00';

  const openQuick = (type) => {
    setQuickForm({ ...EMPTY_QUICK, txn_date: localDate(), ...(type && type !== 'scan' ? { type } : {}) });
    setQuickModal(true);
  };

  const saveQuick = async (e) => {
    e.preventDefault();
    setQuickBusy(true);
    try {
      await createTransaction({
        ...quickForm,
        debt_id:         quickForm.debt_id         || null,
        savings_goal_id: quickForm.savings_goal_id || null,
        credit_card_id:  quickForm.credit_card_id  || null,
        account_id:      quickForm.account_id      || null,
        extra_principal: 0,
      });
      setQuickModal(false);
      fetchDashboard();
    } finally { setQuickBusy(false); }
  };

  const setQuickMethod = (m) => setQuickForm(f => ({
    ...f,
    payment_method: m,
    credit_card_id: m === 'card'  ? f.credit_card_id : '',
    account_id:     m === 'debit' ? f.account_id     : '',
  }));
  const quickCats      = categories.filter(c => !quickForm.type || c.type === quickForm.type);
  const quickPayMethod = quickForm.payment_method || 'cash';

  const handleCameraOcr = async (file) => {
    if (!file) return;
    setOcrScanning(true);
    let uploadFile = file;
    if (file.type.startsWith('image/') && file.size > 1.2 * 1024 * 1024) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const ratio  = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(bitmap.width  * ratio);
        canvas.height = Math.round(bitmap.height * ratio);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        uploadFile = await new Promise(res =>
          canvas.toBlob(b => res(new File([b], 'receipt.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.82)
        );
      } catch { /* use original */ }
    }
    const form = new FormData();
    form.append('receipt', uploadFile);
    try {
      const { data } = await api.post('/ocr/receipt', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
      const expCats  = categories.filter(c => c.type === 'expense');
      const merchant = (data.merchant || '').toLowerCase();
      let suggestedCat = '';
      if (/super|walmart|market|tienda|colonia|precio|mall/.test(merchant))
        suggestedCat = expCats.find(c => /alimenta|comida|food/i.test(c.name))?.id || '';
      else if (/gas|shell|texaco|petro|combustible/.test(merchant))
        suggestedCat = expCats.find(c => /transport/i.test(c.name))?.id || '';
      else if (/restaur|pizza|burger|sushi|cafe|coffee|mcdonalds|kfc/.test(merchant))
        suggestedCat = expCats.find(c => /alimenta|comida|food/i.test(c.name))?.id || '';
      else if (/farmacia|medic|clinica|hospital|doctor/.test(merchant))
        suggestedCat = expCats.find(c => /salud/i.test(c.name))?.id || '';
      setQuickForm(f => ({
        ...f, type: 'expense',
        description: data.merchant || f.description,
        amount:      data.amount   ? String(data.amount) : f.amount,
        txn_date:    data.date     || f.txn_date,
        category_id: suggestedCat  || f.category_id,
      }));
    } catch { /* fail silently */ }
    finally { setOcrScanning(false); }
  };

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── Greeting ────────────────────────────────────────────── */}
      <div className="wd-greet">
        <div>
          <h1>{greet}, <em>{firstName || 'hola'}</em>.</h1>
          <div className="wd-greet-sub" style={{ textTransform: 'capitalize' }}>
            Esto es lo que está fluyendo hoy · {dateLabel}
          </div>
        </div>
        {scoreTotal != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
              Puntaje de salud
            </div>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 400, fontSize: 28, color: 'var(--text)', lineHeight: 1, marginTop: 2 }}>
              {scoreTotal} <span style={{ fontSize: 14, color: scoreColor }}>/ 100</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Hero balance card ───────────────────────────────────── */}
      <div className="wd-hero">
        <div className="wd-hero-accent" />
        <div>
          <div className="wd-hero-label">
            Balance total · {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
          </div>
          <div className="wd-hero-amount">
            <span className="cur">{currency}</span>
            <span>{balanceInt}</span>
            <span className="cents">.{balanceDec}</span>
          </div>
          {income > 0 && (
            <div className="wd-hero-trend">
              <span className="up">
                <ArrowUpCircle size={13} />
                {trendAbs >= 0 ? '+' : '−'}{fmt.currency(Math.abs(trendAbs), currency)} ({Math.abs(trendPct).toFixed(1)}%)
              </span>
              <span className="muted">vs. mes anterior</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button
              onClick={() => openQuick('income')}
              className="btn-primary"
              style={{ fontSize: 12, padding: '8px 14px' }}
            >
              <Plus size={13} /> Ingreso
            </button>
            <button
              onClick={() => openQuick('expense')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: '#1e3d2a', color: '#f0f5f3',
              }}
            >
              <ArrowDownCircle size={13} /> Gasto
            </button>
            <Link
              to="/app/transactions"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 10, border: '1px solid #2e5c3e', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: 'transparent', color: 'var(--c400)', textDecoration: 'none',
              }}
            >
              <ArrowLeftRight size={13} /> Transferir
            </Link>
            {effectivePlan !== 'free' && (
              <button
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    const file = await captureReceiptPhoto();
                    if (file) { openQuick('expense'); handleCameraOcr(file); }
                  } else {
                    cameraInputRef.current?.click();
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  borderRadius: 10, border: '1px solid #2e5c3e', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: 'transparent', color: 'var(--c400)',
                }}
              >
                {ocrScanning ? <Loader2 size={13} className="animate-spin" /> : <ScanLine size={13} />}
                {ocrScanning ? 'Analizando…' : 'Escanear recibo'}
              </button>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { openQuick('expense'); handleCameraOcr(e.target.files[0]); e.target.value = ''; }}
            />
          </div>
        </div>

        {accounts.length > 0 && (
          <div className="wd-hero-accts">
            <div className="wd-hero-accts-label">Tus cuentas</div>
            {accounts.slice(0, 4).map(a => (
              <div key={a.id} className="wd-hero-acct">
                <div className="name">
                  <span className="sw" style={{ background: a.color || 'var(--c500)' }} />
                  <span>{a.name}</span>
                </div>
                <div className="amt">{fmt.currency(a.balance, a.currency || currency)}</div>
              </div>
            ))}
            {accounts.length > 4 && (
              <Link to="/app/accounts" style={{ fontSize: 11, color: 'var(--c400)', textDecoration: 'none', marginTop: 4 }}>
                +{accounts.length - 4} más →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── 2-col grid ──────────────────────────────────────────── */}
      <div className="wd-grid">

        {/* Left: chart + recent txns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Chart (CSS bars, like handoff) */}
          {trendData.length > 0 && (
            <div className="wd-tile">
              <div className="wd-tile-head">
                <div>
                  <div className="wd-tile-title">Ingresos vs. Gastos</div>
                  <div className="wd-tile-sub">Últimos 6 meses</div>
                </div>
                <div className="chart-legend">
                  <span className="lg"><span className="sw" style={{ background: 'var(--c500)' }} />Ingreso</span>
                  <span className="lg"><span className="sw" style={{ background: 'var(--g700)' }} />Gasto</span>
                </div>
              </div>
              <div className="chart-bars">
                {trendData.map((x) => (
                  <div className="month" key={x.month}>
                    <div className="bars">
                      <div className="b income"  style={{ height: `${(x.income   / trendMax) * 100}%` }} />
                      <div className="b expense" style={{ height: `${(x.expenses / trendMax) * 100}%` }} />
                    </div>
                    <div className="m-label">{monthShort(x.month)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="wd-tile">
            <div className="wd-tile-head">
              <div>
                <div className="wd-tile-title">Movimientos recientes</div>
                <div className="wd-tile-sub">Últimas 48 horas</div>
              </div>
              <Link to="/app/transactions" className="wd-tile-link">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>

            {recentTxns.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                Sin transacciones recientes
              </div>
            ) : (
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th className="hidden sm:table-cell">Categoría</th>
                    <th className="hidden lg:table-cell">Cuenta</th>
                    <th className="hidden sm:table-cell">Fecha</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxns.map(t => {
                    const acct = accounts.find(a => a.id === t.account_id);
                    const card = creditCards.find(c => c.id === t.credit_card_id);
                    const accName = card?.name || acct?.name || '';
                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="tx-merch">
                            <div className="tx-icon" style={{
                              background: `${t.color || '#6a8880'}18`,
                              color: t.color || '#6a8880',
                            }}>
                              {t.category_name?.[0] || '?'}
                            </div>
                            <span style={{ fontWeight: 500 }}>
                              {t.description || t.category_name}
                            </span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 999, fontSize: 11,
                            background: `${t.color || '#6a8880'}14`, color: t.color || '#6a8880',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.color || '#6a8880', display: 'inline-block' }} />
                            {t.category_name}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                          {accName}
                        </td>
                        <td className="hidden sm:table-cell date">{fmt.date(t.txn_date)}</td>
                        <td className={clsx('amt', t.type === 'income' && 'pos')}>
                          {t.type === 'income' ? '+' : '−'}{fmt.currency(t.amount, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: health + categories + goals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Health ring */}
          {score != null && (
            <div className="wd-tile">
              <div className="wd-tile-head">
                <div>
                  <div className="wd-tile-title">Salud financiera</div>
                  <div className="wd-tile-sub" style={{ textTransform: 'capitalize' }}>{monthLabel}</div>
                </div>
              </div>
              <div className="health-ring">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={scoreColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${52 * 2 * Math.PI * (scoreTotal / 100)} ${52 * 2 * Math.PI}`}
                  />
                </svg>
                <div className="inner">
                  <div className="val">{scoreTotal}</div>
                  <div className="lbl" style={{ color: scoreColor }}>{scoreLabel}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Ahorro mensual</span>
                  <span style={{ color: savingPct >= 20 ? 'var(--c500)' : '#f0a500', fontWeight: 600 }}>
                    {savingPct}% {savingPct >= 20 ? '↑' : '→'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Gastos fijos</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{expensePct}% ingresos</span>
                </div>
                {debtPct > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Deuda/ingreso</span>
                    <span style={{ color: debtPct > 30 ? '#e53e3e' : '#f0a500', fontWeight: 600 }}>{debtPct}%</span>
                  </div>
                )}
              </div>
              {advice && (
                <p style={{ fontSize: 11, paddingTop: 12, borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                  <Sparkles size={10} style={{ display: 'inline', marginRight: 4, color: 'var(--c500)' }} />
                  {advice}
                </p>
              )}
            </div>
          )}

          {/* Top categories */}
          {catBreakdown.length > 0 && (
            <div className="wd-tile">
              <div className="wd-tile-head">
                <div>
                  <div className="wd-tile-title">Gastos por categoría</div>
                  <div className="wd-tile-sub" style={{ textTransform: 'capitalize' }}>
                    {new Date().toLocaleDateString('es', { month: 'long' })} · {fmt.currency(expenses, currency)}
                  </div>
                </div>
              </div>
              <div className="cats-list">
                {catBreakdown.slice(0, 5).map((c, i) => {
                  const pct = (Number(c.total) / catMax) * 100;
                  return (
                    <div className="cat-row" key={i}>
                      <div className="cat-row-top">
                        <div className="cat-left">
                          <div className="ico" style={{
                            background: `${c.color || '#6a8880'}18`,
                            color: c.color || '#6a8880',
                          }}>
                            {c.name?.[0]}
                          </div>
                          <div className="cat-name">{c.name}</div>
                        </div>
                        <div className="cat-amt">{fmt.currency(c.total, currency)}</div>
                      </div>
                      <div className="cat-bar">
                        <div className="cat-bar-fill" style={{ width: `${pct}%`, background: c.color || 'var(--c500)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Goals */}
          {d?.goals?.length > 0 && (
            <div className="wd-tile">
              <div className="wd-tile-head">
                <div>
                  <div className="wd-tile-title">Metas activas</div>
                  <div className="wd-tile-sub">{d.goals.length} meta{d.goals.length !== 1 ? 's' : ''} en progreso</div>
                </div>
                <Link to="/app/savings" className="wd-tile-link">Ver todas</Link>
              </div>
              <div>
                {d.goals.slice(0, 3).map(g => {
                  const pct = Math.min(100, g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0);
                  const deadlineDate = g.deadline ? new Date(String(g.deadline).split('T')[0] + 'T00:00:00') : null;
                  const monthsLeft = deadlineDate
                    ? Math.max(0, Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24 * 30)))
                    : null;
                  return (
                    <div className="goal-mini" key={g.id}>
                      <div className="goal-mini-top">
                        <span className="goal-mini-name">{g.name}</span>
                        <span className="goal-mini-pct">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="goal-mini-bar">
                        <div className="goal-mini-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="goal-mini-meta">
                        <span>{fmt.currency(g.current_amount, currency)} / {fmt.currency(g.target_amount, currency)}</span>
                        {monthsLeft != null && (
                          <span>{monthsLeft > 0 ? `${monthsLeft} mes${monthsLeft !== 1 ? 'es' : ''}` : 'casi ahí'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick transaction modal ─────────────────────────────── */}
      <Modal
        open={quickModal}
        onClose={() => setQuickModal(false)}
        eyebrow={quickForm.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
        title="Registra un movimiento"
      >
        <form onSubmit={saveQuick} className="space-y-4">

          <div className="hero-amount" style={{
            fontSize: 44, gap: 4, justifyContent: 'center',
            color: 'var(--text)', marginBottom: 4,
            borderBottom: '1px solid var(--border)', paddingBottom: 12,
          }}>
            <span className="cur">$</span>
            <input
              type="number" step="0.01" min="0.01" placeholder="0"
              value={quickForm.amount}
              onChange={e => setQuickForm(f => ({ ...f, amount: e.target.value }))}
              required autoFocus
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 44,
                color: 'var(--text)', width: Math.max(80, (quickForm.amount?.length || 1) * 28),
                textAlign: 'center', padding: 0,
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['expense', 'income'].map((tp) => (
              <button key={tp} type="button"
                onClick={() => setQuickForm(f => ({ ...f, type: tp, category_id: '' }))}
                style={{
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: quickForm.type === tp
                    ? `1.5px solid ${tp === 'income' ? 'var(--c500)' : '#e53e3e'}`
                    : '1.5px solid var(--border)',
                  background: quickForm.type === tp
                    ? tp === 'income' ? 'rgba(0,184,148,.08)' : 'rgba(229,62,62,.08)'
                    : 'transparent',
                  color: quickForm.type === tp
                    ? tp === 'income' ? 'var(--c500)' : '#e53e3e'
                    : 'var(--text-muted)',
                }}>
                {tp === 'income' ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                {tp === 'income' ? 'Ingreso' : 'Gasto'}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
              Categoría
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickCats.map(c => {
                const sel = String(quickForm.category_id) === String(c.id);
                return (
                  <button key={c.id} type="button"
                    onClick={() => setQuickForm(f => ({ ...f, category_id: c.id }))}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 999,
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${sel ? (c.color || 'var(--c500)') : 'var(--border)'}`,
                      background: sel ? `${c.color || 'var(--c500)'}18` : 'transparent',
                      color: sel ? (c.color || 'var(--c500)') : 'var(--text-muted)',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color || 'var(--c500)', display: 'inline-block' }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(accounts.length > 0 || creditCards.length > 0) && (() => {
              const PayIcon = quickPayMethod === 'card' ? CreditCard : quickPayMethod === 'debit' ? Landmark : Wallet;
              return (
                <div style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    Cuenta
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PayIcon size={14} style={{ color: 'var(--c500)', flexShrink: 0 }} />
                    <select
                      value={quickPayMethod === 'card' ? `card:${quickForm.credit_card_id || ''}` : quickPayMethod === 'debit' ? `debit:${quickForm.account_id || ''}` : 'cash'}
                      onChange={e => {
                        const [m, id] = e.target.value.split(':');
                        if (m === 'card') setQuickForm(f => ({ ...f, payment_method: 'card', credit_card_id: id, account_id: '' }));
                        else if (m === 'debit') setQuickForm(f => ({ ...f, payment_method: 'debit', account_id: id, credit_card_id: '' }));
                        else setQuickForm(f => ({ ...f, payment_method: 'cash', account_id: '', credit_card_id: '' }));
                      }}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', padding: 0,
                      }}
                    >
                      <option value="cash">Efectivo</option>
                      {accounts.map(a => <option key={`d${a.id}`} value={`debit:${a.id}`}>{a.name}</option>)}
                      {quickForm.type === 'expense' && creditCards.map(c => <option key={`c${c.id}`} value={`card:${c.id}`}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              );
            })()}

            <div style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                Fecha
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: 'var(--c500)', flexShrink: 0 }} />
                <input
                  type="date"
                  value={quickForm.txn_date}
                  onChange={e => setQuickForm(f => ({ ...f, txn_date: e.target.value }))}
                  required
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', padding: 0,
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            padding: '10px 12px', borderRadius: 10,
            border: '1.5px dashed var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text" placeholder="Agregar nota (opcional)"
              value={quickForm.description}
              onChange={e => setQuickForm(f => ({ ...f, description: e.target.value }))}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--text)', fontFamily: 'var(--fb)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={quickBusy}
            className="btn-primary w-full justify-center"
            style={{ padding: '14px 0', fontSize: 14, marginTop: 4 }}
          >
            {quickBusy ? 'Guardando…' : quickForm.type === 'income' ? 'Guardar ingreso' : 'Guardar gasto'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
