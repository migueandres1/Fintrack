import { useEffect, useState, useRef } from 'react';
import { Plus, Download, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, PiggyBank, CreditCard, RefreshCw, Pause, Play, ScanLine, FileUp, Loader2, X, Filter, Wallet, Landmark, Calendar, FileText } from 'lucide-react';
import { useStore } from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, Spinner, Empty } from '../components/ui/index.jsx';
import OcrModal             from '../components/OcrModal.jsx';
import StatementImportModal from '../components/StatementImportModal.jsx';
import UpgradeModal         from '../components/UpgradeModal.jsx';
import api from '../services/api.js';
import clsx from 'clsx';
import { Capacitor } from '@capacitor/core';
import { Browser }   from '@capacitor/browser';
import { captureReceiptPhoto } from '../utils/captureReceipt.js';

const EMPTY_FORM = {
  type: 'expense', category_id: '', amount: '', description: '',
  txn_date: localDate(),
  debt_id: '', savings_goal_id: '', credit_card_id: '', account_id: '',
  extra_principal: '0', payment_method: 'cash',
  transfer_from_account_id: '', transfer_to_account_id: '',
};

const EMPTY_REC = {
  type: 'expense', category_id: '', amount: '', description: '',
  frequency: 'monthly', start_date: localDate(),
  end_date: '', savings_goal_id: '', credit_card_id: '',
};

const FREQ_LABEL = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', yearly: 'Anual' };

function groupByDate(transactions) {
  const groups = {};
  for (const t of transactions) {
    const day = String(t.txn_date).split('T')[0];
    if (!groups[day]) groups[day] = [];
    groups[day].push(t);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDayHeader(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Transactions() {
  const {
    transactions, txnTotal, txnLoading, categories,
    fetchTransactions, fetchCategories, createTransaction, createTransfer,
    updateTransaction, deleteTransaction,
    debts, fetchDebts,
    goals, fetchGoals,
    recurring, recurringLoading, fetchRecurring, createRecurring, updateRecurring, deleteRecurring,
    creditCards, fetchCreditCards,
    accounts, fetchAccounts,
    user,
  } = useStore();

  const currency = user?.currency || 'USD';

  const [filters, setFilters] = useState({ type: '', category_id: '', account_id: '', from: '', to: '', page: 1 });
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [ocrModal,       setOcrModal]       = useState(false);
  const [statementModal, setStatementModal] = useState(false);
  const [upgradeModal,   setUpgradeModal]   = useState(false);
  const [ocrScanning,    setOcrScanning]    = useState(false);
  const cameraInputRef = useRef(null);
  const billingStatus = useStore((s) => s.billingStatus);
  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';

  function openOcr() {
    if (effectivePlan === 'free') { setUpgradeModal(true); return; }
    setOcrModal(true);
  }

  async function handleCameraOcr(file) {
    if (!file) return;
    setOcrScanning(true);
    const formData = new FormData();
    let uploadFile = file;
    if (file.type.startsWith('image/') && file.size > 1.2 * 1024 * 1024) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * ratio);
        canvas.height = Math.round(bitmap.height * ratio);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        uploadFile = await new Promise(res => canvas.toBlob(b => res(new File([b], 'receipt.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.82));
      } catch { /* use original */ }
    }
    formData.append('receipt', uploadFile);
    try {
      const { data } = await api.post('/ocr/receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const expCats = categories.filter(c => c.type === 'expense');
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
      setForm(f => ({
        ...f,
        type:        'expense',
        description: data.merchant || f.description,
        amount:      data.amount   ? String(data.amount) : f.amount,
        txn_date:    data.date     || f.txn_date,
        category_id: suggestedCat  || f.category_id,
      }));
    } catch { /* fail silently */ }
    finally { setOcrScanning(false); }
  }

  // Recurring state
  const [recModal, setRecModal] = useState(false);
  const [recForm, setRecForm] = useState(EMPTY_REC);
  const [editingRec, setEditingRec] = useState(null);
  const [deletingRec, setDeletingRec] = useState(null);
  const [recBusy, setRecBusy] = useState(false);
  const [showRecForm, setShowRecForm] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTransactions(filters);
    fetchDebts();
    fetchGoals();
    fetchCreditCards();
    fetchAccounts();
    api.get('/transactions/summary').then(r => setSummary(r.data)).catch(() => { });
  }, []);

  useEffect(() => { fetchTransactions(filters); }, [filters]);

  const filteredCats = categories.filter((c) => !form.type || c.type === form.type);
  const recFilteredCats = categories.filter((c) => !recForm.type || c.type === recForm.type);
  const activeDebts = (debts || []).filter(d => d.is_active);
  const activeGoals = (goals || []).filter(g => !g.is_completed);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      type: t.type, category_id: t.category_id, amount: t.amount,
      description: t.description || '', txn_date: String(t.txn_date).split('T')[0],
      debt_id: t.debt_id || '', savings_goal_id: t.savings_goal_id || '',
      credit_card_id: t.credit_card_id || '', account_id: t.account_id || '',
      extra_principal: t.extra_principal || '0',
      payment_method: t.credit_card_id ? 'card' : t.account_id ? 'debit' : 'cash',
    });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (form.type === 'transfer') {
        await createTransfer({
          from_account_id: form.transfer_from_account_id,
          to_account_id:   form.transfer_to_account_id,
          amount:          form.amount,
          description:     form.description || null,
          txn_date:        form.txn_date,
        });
      } else {
        const payload = {
          ...form,
          debt_id: form.debt_id || null,
          savings_goal_id: form.savings_goal_id || null,
          credit_card_id: form.credit_card_id || null,
          account_id: form.account_id || null,
          extra_principal: Number(form.extra_principal) || 0,
        };
        if (editing) await updateTransaction(editing.id, payload);
        else await createTransaction(payload);
        fetchDebts();
        fetchGoals();
        if (payload.credit_card_id) fetchCreditCards();
      }
      setModal(false);
      fetchTransactions(filters);
      fetchAccounts();
      api.get('/transactions/summary').then(r => setSummary(r.data)).catch(() => { });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === 'LIMIT_REACHED') {
        setModal(false);
        setUpgradeModal(true);
      } else {
        throw err;
      }
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteTransaction(deleting.id);
    setDeleting(null);
    fetchTransactions(filters);
    fetchAccounts();
  };

  const exportCsv = async () => {
    const params  = new URLSearchParams({ from: filters.from || '', to: filters.to || '' });
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const exportUrl = `${baseUrl}/transactions/export?${params}`;
    if (Capacitor.isNativePlatform()) {
      try {
        const stored = JSON.parse(localStorage.getItem('fintrack-store') || '{}');
        const token  = stored?.state?.token || '';
        await Browser.open({ url: `${exportUrl}&token=${encodeURIComponent(token)}` });
      } catch { /* falla silenciosa */ }
    } else {
      window.open(exportUrl, '_blank');
    }
  };

  const handleOcrConfirm = ({ description, amount, date, category_id, credit_card_id, account_id }) => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      type:           'expense',
      description:    description    || '',
      amount:         amount         || '',
      txn_date:       date           || EMPTY_FORM.txn_date,
      category_id:    category_id    || '',
      credit_card_id: credit_card_id || '',
      account_id:     account_id     || '',
      payment_method: credit_card_id ? 'card' : account_id ? 'debit' : 'cash',
    });
    setModal(true);
  };

  const openRecurring = () => {
    fetchRecurring();
    fetchCreditCards();
    setShowRecForm(false);
    setEditingRec(null);
    setRecForm(EMPTY_REC);
    setRecModal(true);
  };

  const openEditRec = (r) => {
    setEditingRec(r);
    setRecForm({
      type: r.type, category_id: r.category_id, amount: r.amount,
      description: r.description || '', frequency: r.frequency,
      start_date: String(r.start_date).split('T')[0],
      end_date: r.end_date ? String(r.end_date).split('T')[0] : '',
      savings_goal_id: r.savings_goal_id || '',
      credit_card_id: r.credit_card_id || '',
    });
    setShowRecForm(true);
  };

  const saveRec = async (e) => {
    e.preventDefault();
    setRecBusy(true);
    try {
      const payload = {
        ...recForm,
        end_date: recForm.end_date || null,
        savings_goal_id: recForm.savings_goal_id || null,
        credit_card_id: recForm.credit_card_id || null,
      };
      if (editingRec) await updateRecurring(editingRec.id, { ...payload, is_active: editingRec.is_active });
      else await createRecurring(payload);
      setShowRecForm(false);
      setEditingRec(null);
      setRecForm(EMPTY_REC);
      fetchRecurring();
    } finally { setRecBusy(false); }
  };

  const toggleActive = async (r) => {
    await updateRecurring(r.id, {
      category_id: r.category_id, type: r.type, amount: r.amount,
      description: r.description, frequency: r.frequency,
      end_date: r.end_date || null, savings_goal_id: r.savings_goal_id || null,
      is_active: r.is_active ? 0 : 1,
    });
    fetchRecurring();
  };

  const confirmDeleteRec = async () => {
    await deleteRecurring(deletingRec.id);
    setDeletingRec(null);
    fetchRecurring();
  };

  // Summary stats
  const totalIncome  = summary?.totals?.income  ?? 0;
  const totalExpense = summary?.totals?.expense  ?? 0;

  const activeTypeFilter = filters.type;
  const typeChips = [
    { key: '', label: `Todos${txnTotal ? ` · ${txnTotal}` : ''}` },
    { key: 'expense', label: 'Gastos' },
    { key: 'income',  label: 'Ingresos' },
    { key: 'transfer', label: 'Transferencias' },
  ];

  const grouped = groupByDate(transactions);

  return (
    <div className="space-y-4 animate-fade-up">

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 32, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1.1 }}>
            Transacciones
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {txnTotal} movimientos
            {totalExpense > 0 && <> · <span style={{ color: 'var(--text)' }}>{fmt.currency(totalExpense, currency)}</span> gastado</>}
            {totalIncome > 0  && <> · <span style={{ color: 'var(--c500)' }}>+{fmt.currency(totalIncome, currency)}</span> ingresado</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="btn-secondary"
            style={{ gap: 6, fontSize: 12 }}
          >
            <Filter size={13} />
            <span className="hidden sm:inline">Filtros</span>
          </button>
          <button onClick={exportCsv} className="btn-secondary" style={{ fontSize: 12 }}>
            <Download size={13} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button onClick={openOcr} className="btn-secondary" style={{ fontSize: 12 }}>
            <ScanLine size={13} />
            <span className="hidden sm:inline">OCR</span>
          </button>
          <button
            onClick={() => { if (effectivePlan === 'free') { setUpgradeModal(true); return; } setStatementModal(true); }}
            className="btn-secondary" style={{ fontSize: 12 }}
            title="Importar estado de cuenta"
          >
            <FileUp size={13} />
          </button>
          <button onClick={openRecurring} className="btn-secondary" style={{ fontSize: 12 }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={openCreate} className="btn-primary" style={{ fontSize: 13 }}>
            <Plus size={14} />
            <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      {/* ── Filter chips ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {typeChips.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilters(f => ({ ...f, type: key, page: 1 }))}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none',
              cursor: 'pointer', transition: 'all .15s',
              background: activeTypeFilter === key ? 'var(--c500)' : 'var(--surface-2)',
              color: activeTypeFilter === key ? '#0b1712' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
        {categories.filter(c => c.type === 'expense').slice(0, 4).map(c => (
          <button
            key={c.id}
            onClick={() => setFilters(f => ({ ...f, category_id: String(f.category_id) === String(c.id) ? '' : c.id, page: 1 }))}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, border: 'none',
              cursor: 'pointer', transition: 'all .15s',
              background: String(filters.category_id) === String(c.id) ? `${c.color}22` : 'var(--surface-2)',
              color: String(filters.category_id) === String(c.id) ? c.color : 'var(--text-muted)',
            }}
          >
            {c.name}
          </button>
        ))}
        {(filters.type || filters.category_id || filters.from || filters.to) && (
          <button
            onClick={() => setFilters({ type: '', category_id: '', account_id: '', from: '', to: '', page: 1 })}
            style={{ padding: '6px 10px', borderRadius: 999, fontSize: 11, border: 'none', cursor: 'pointer', background: 'rgba(229,62,62,.08)', color: '#e53e3e', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X size={11} /> Limpiar
          </button>
        )}
      </div>

      {/* ── Advanced filters panel ────────────────────────────── */}
      {showFilters && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {accounts.length > 0 && (
              <div>
                <label className="label">Cuenta</label>
                <select className="input" value={filters.account_id} onChange={e => setFilters({ ...filters, account_id: e.target.value, page: 1 })}>
                  <option value="">Todas</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Desde</label>
              <input className="input" type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value, page: 1 })} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input className="input" type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value, page: 1 })} />
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction list ──────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {txnLoading ? (
          <div style={{ padding: 40 }}><Spinner /></div>
        ) : transactions.length === 0 ? (
          <Empty icon={ArrowUpCircle} title="Sin transacciones" description="Registra tu primera transacción"
            action={<button onClick={openCreate} className="btn-primary" style={{ fontSize: 12 }}>+ Nueva transacción</button>} />
        ) : (
          <>
            {grouped.map(([day, txns], gi) => {
              const dayNet = txns.reduce((s, t) => {
                if (t.type === 'income') return s + Number(t.amount);
                if (t.type === 'expense') return s - Number(t.amount);
                return s;
              }, 0);
              return (
                <div key={day} style={{ borderBottom: gi < grouped.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {/* Date group header */}
                  <div style={{
                    padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--surface-2)', fontSize: 11, fontWeight: 600,
                    letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)',
                  }}>
                    <span>{formatDayHeader(day)}</span>
                    <span style={{
                      fontFamily: 'var(--fm)', fontVariantNumeric: 'tabular-nums',
                      color: dayNet > 0 ? 'var(--c500)' : 'var(--text)',
                    }}>
                      {dayNet > 0 ? '+' : dayNet < 0 ? '−' : ''}{fmt.currency(Math.abs(dayNet), currency)}
                    </span>
                  </div>

                  {/* Transaction rows */}
                  {txns.map((t, i) => {
                    const isTransfer = !!t.linked_transfer_txn_id;
                    const transferAccount = isTransfer ? accounts.find(a => a.id === t.account_id) : null;
                    const accountName = accounts.find(a => a.id === t.account_id)?.name || '';
                    const cardName = creditCards.find(c => c.id === t.credit_card_id)?.name || '';
                    const displayAccount = cardName || accountName;

                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '12px 20px',
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr auto auto auto',
                          gap: 14,
                          alignItems: 'center',
                          borderBottom: i < txns.length - 1 ? '1px solid var(--border)' : 'none',
                          cursor: 'default',
                        }}
                        className="group"
                      >
                        {/* Icon tile */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                          background: isTransfer ? 'rgba(0,184,148,.1)' : `${t.color || '#6a8880'}18`,
                          color: isTransfer ? 'var(--c500)' : (t.color || '#6a8880'),
                        }}>
                          {isTransfer
                            ? <ArrowLeftRight size={15} />
                            : (t.category_name?.[0] || '?')}
                        </div>

                        {/* Description + category */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                              {isTransfer
                                ? (t.description && t.description !== 'Transferencia entre cuentas'
                                    ? t.description
                                    : (transferAccount ? `${t.type === 'expense' ? '↑' : '↓'} ${transferAccount.name}` : 'Transferencia'))
                                : (t.description || t.category_name)}
                            </span>
                            {t.savings_goal_id && !isTransfer && <PiggyBank size={11} style={{ color: 'var(--c500)', flexShrink: 0 }} />}
                            {t.debt_id && !isTransfer && <CreditCard size={11} style={{ color: '#f43f5e', flexShrink: 0 }} />}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            {isTransfer ? 'Transferencia' : t.category_name}
                          </div>
                        </div>

                        {/* Account name — hidden on mobile */}
                        <div className="hidden sm:block" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {displayAccount}
                        </div>

                        {/* Time */}
                        <div className="hidden sm:block" style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>
                          {t.txn_date ? new Date(String(t.txn_date).replace('T', ' ').replace('Z', '')).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                        </div>

                        {/* Amount + actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 13, fontWeight: 600, fontFamily: 'var(--fm)',
                            fontVariantNumeric: 'tabular-nums',
                            color: t.type === 'income' ? 'var(--c500)' : 'var(--text)',
                            whiteSpace: 'nowrap',
                          }}>
                            {t.type === 'income' ? '+' : '−'}{fmt.currency(t.amount, currency)}
                          </span>
                          <div style={{ display: 'flex', gap: 2 }} className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {!isTransfer && (
                              <button
                                onClick={() => openEdit(t)}
                                style={{ padding: '4px 6px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleting(t)}
                              style={{ padding: '4px 6px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#f43f5e' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────── */}
      {txnTotal > 50 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          {filters.page > 1 && (
            <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Anterior</button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pág. {filters.page}</span>
          {filters.page * 50 < txnTotal && (
            <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Siguiente →</button>
          )}
        </div>
      )}

      {/* ── Modal nueva/editar transacción (TxAddSheet style) ──── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        eyebrow={editing
          ? 'Editar movimiento'
          : form.type === 'transfer' ? 'Nueva transferencia'
          : form.type === 'income'   ? 'Nuevo ingreso'
          : 'Nuevo gasto'}
        title={editing ? 'Actualiza los detalles' : 'Registra un movimiento'}
      >
        <form onSubmit={save} className="space-y-4">

          {/* ── Amount display ────────────────────────────────────── */}
          <div className="hero-amount" style={{
            fontSize: 44, gap: 4, justifyContent: 'center',
            color: 'var(--text)', marginBottom: 4,
            borderBottom: '1px solid var(--border)', paddingBottom: 12,
          }}>
            <span className="cur">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              required
              autoFocus={!editing}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 44,
                color: 'var(--text)', width: Math.max(80, (String(form.amount || '').length || 1) * 28),
                textAlign: 'center', padding: 0,
              }}
            />
          </div>

          {/* ── Type toggle ───────────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: accounts.length >= 2 && !editing ? '1fr 1fr 1fr' : '1fr 1fr',
            gap: 8,
          }}>
            {['expense', 'income'].map((tp) => (
              <button key={tp} type="button"
                onClick={() => setForm({ ...form, type: tp, category_id: '', debt_id: '', savings_goal_id: '', credit_card_id: '', transfer_from_account_id: '', transfer_to_account_id: '' })}
                style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: form.type === tp
                    ? `1.5px solid ${tp === 'income' ? 'var(--c500)' : '#e53e3e'}`
                    : '1.5px solid var(--border)',
                  background: form.type === tp
                    ? tp === 'income' ? 'rgba(0,184,148,.08)' : 'rgba(229,62,62,.08)'
                    : 'transparent',
                  color: form.type === tp
                    ? tp === 'income' ? 'var(--c500)' : '#e53e3e'
                    : 'var(--text-muted)',
                }}>
                {tp === 'income' ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                {tp === 'income' ? 'Ingreso' : 'Gasto'}
              </button>
            ))}
            {accounts.length >= 2 && !editing && (
              <button type="button"
                onClick={() => setForm({ ...form, type: 'transfer', category_id: '', debt_id: '', savings_goal_id: '', credit_card_id: '', account_id: '' })}
                style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: form.type === 'transfer' ? '1.5px solid var(--c500)' : '1.5px solid var(--border)',
                  background: form.type === 'transfer' ? 'rgba(0,184,148,.08)' : 'transparent',
                  color: form.type === 'transfer' ? 'var(--c500)' : 'var(--text-muted)',
                }}>
                <ArrowLeftRight size={15} /> Transferir
              </button>
            )}
          </div>

          {/* ── Transfer: from/to account tiles ───────────────────── */}
          {form.type === 'transfer' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Desde
                </div>
                <select
                  value={form.transfer_from_account_id}
                  onChange={e => setForm({ ...form, transfer_from_account_id: e.target.value })}
                  required
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', padding: 0,
                  }}
                >
                  <option value="">— Seleccionar —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} disabled={String(a.id) === String(form.transfer_to_account_id)}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Hacia
                </div>
                <select
                  value={form.transfer_to_account_id}
                  onChange={e => setForm({ ...form, transfer_to_account_id: e.target.value })}
                  required
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', padding: 0,
                  }}
                >
                  <option value="">— Seleccionar —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} disabled={String(a.id) === String(form.transfer_from_account_id)}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* ── Category chips ──────────────────────────────────── */
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                Categoría
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                {filteredCats.map(c => {
                  const sel = String(form.category_id) === String(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm({ ...form, category_id: c.id })}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 999,
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        border: `1.5px solid ${sel ? (c.color || 'var(--c500)') : 'var(--border)'}`,
                        background: sel ? `${c.color || 'var(--c500)'}18` : 'transparent',
                        color: sel ? (c.color || 'var(--c500)') : 'var(--text-muted)',
                        transition: 'all .15s',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color || 'var(--c500)', display: 'inline-block' }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Account + Date tiles ──────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: form.type !== 'transfer' && (accounts.length > 0 || creditCards.length > 0) ? '1fr 1fr' : '1fr', gap: 8 }}>
            {/* Account / payment method tile (not for transfers — already shows from/to) */}
            {form.type !== 'transfer' && (accounts.length > 0 || creditCards.length > 0) && (() => {
              const payMethod = form.payment_method || 'cash';
              const showCard  = creditCards.length > 0 && form.type === 'expense' && !form.debt_id && !form.savings_goal_id;
              const PayIcon   = payMethod === 'card' ? CreditCard : payMethod === 'debit' ? Landmark : Wallet;
              return (
                <div style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    Cuenta
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PayIcon size={14} style={{ color: 'var(--c500)', flexShrink: 0 }} />
                    <select
                      value={payMethod === 'card' ? `card:${form.credit_card_id || ''}` : payMethod === 'debit' ? `debit:${form.account_id || ''}` : 'cash'}
                      onChange={e => {
                        const [m, id] = e.target.value.split(':');
                        if (m === 'card')       setForm(f => ({ ...f, payment_method: 'card',  credit_card_id: id, account_id: '' }));
                        else if (m === 'debit') setForm(f => ({ ...f, payment_method: 'debit', account_id: id,     credit_card_id: '' }));
                        else                    setForm(f => ({ ...f, payment_method: 'cash',  account_id: '',     credit_card_id: '' }));
                      }}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer',
                        fontFamily: 'var(--fb)', padding: 0,
                      }}
                    >
                      <option value="cash">Efectivo</option>
                      {accounts.map(a => <option key={`d${a.id}`} value={`debit:${a.id}`}>{a.name}</option>)}
                      {showCard && creditCards.map(c => <option key={`c${c.id}`} value={`card:${c.id}`}>{c.name}{c.last_four ? ` ···${c.last_four}` : ''}</option>)}
                    </select>
                  </div>
                </div>
              );
            })()}

            {/* Date tile */}
            <div style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                Fecha
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: 'var(--c500)', flexShrink: 0 }} />
                <input
                  type="date"
                  value={form.txn_date}
                  onChange={e => setForm({ ...form, txn_date: e.target.value })}
                  required
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer',
                    fontFamily: 'var(--fb)', padding: 0,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Debt link (optional) ──────────────────────────────── */}
          {form.type === 'expense' && activeDebts.length > 0 && form.type !== 'transfer' && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                Vincular a deuda (opcional)
              </div>
              <select
                className="input"
                value={form.debt_id}
                onChange={e => setForm({ ...form, debt_id: e.target.value, savings_goal_id: '' })}
              >
                <option value="">— Ninguna —</option>
                {activeDebts.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — saldo: {fmt.currency(d.current_balance, currency)}</option>
                ))}
              </select>
            </div>
          )}

          {form.debt_id && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                Abono extra a capital
              </div>
              <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.extra_principal} onChange={e => setForm({ ...form, extra_principal: e.target.value })} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Se aplica directo al capital y reduce intereses futuros</p>
            </div>
          )}

          {form.type === 'expense' && !form.debt_id && activeGoals.length > 0 && form.type !== 'transfer' && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                Vincular a meta de ahorro (opcional)
              </div>
              <select
                className="input"
                value={form.savings_goal_id}
                onChange={e => setForm({ ...form, savings_goal_id: e.target.value, credit_card_id: '' })}
              >
                <option value="">— Ninguna —</option>
                {activeGoals.map(g => (
                  <option key={g.id} value={g.id}>{g.name} — {Math.round((g.current_amount / g.target_amount) * 100)}% completada</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Description (dashed note) ─────────────────────────── */}
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            border: '1.5px dashed var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Agregar nota (opcional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--text)', fontFamily: 'var(--fb)',
              }}
            />
          </div>

          {/* ── OCR (Pro only, new txn only) ──────────────────────── */}
          {!editing && effectivePlan !== 'free' && form.type !== 'transfer' && (
            <>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { handleCameraOcr(e.target.files[0]); e.target.value = ''; }} />
              <button type="button"
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    const file = await captureReceiptPhoto();
                    if (file) handleCameraOcr(file);
                  } else {
                    cameraInputRef.current?.click();
                  }
                }}
                disabled={ocrScanning}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                  border: ocrScanning ? '1.5px solid var(--c500)' : '1.5px dashed var(--border)',
                  background: ocrScanning ? 'rgba(0,184,148,.08)' : 'transparent',
                  color: ocrScanning ? 'var(--c500)' : 'var(--text-muted)',
                }}
              >
                {ocrScanning
                  ? <><Loader2 size={14} className="animate-spin" /> Analizando recibo…</>
                  : <><ScanLine size={14} /> Escanear recibo con cámara</>}
              </button>
            </>
          )}

          {/* ── Submit ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center" style={{ padding: '12px 0' }}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center" style={{ padding: '12px 0' }}>
              {busy ? 'Guardando…' : editing
                ? 'Actualizar'
                : form.type === 'transfer' ? 'Guardar transferencia'
                : form.type === 'income' ? 'Guardar ingreso'
                : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal transacciones recurrentes ─────────────────────── */}
      <Modal open={recModal} onClose={() => { setRecModal(false); setShowRecForm(false); }} title="Transacciones recurrentes" size="lg">
        <div className="space-y-4">
          {!showRecForm ? (
            <>
              <div className="flex justify-end">
                <button onClick={() => { setEditingRec(null); setRecForm(EMPTY_REC); setShowRecForm(true); }} className="btn-primary">
                  <Plus size={15} /> Nueva recurrente
                </button>
              </div>

              {recurringLoading ? <Spinner /> : recurring.length === 0 ? (
                <Empty icon={RefreshCw} title="Sin recurrentes" description="Registra suscripciones, renta y otros pagos fijos" />
              ) : (
                <div className="divide-y divide-[var(--border)] -mx-5">
                  {recurring.map((r) => (
                    <div key={r.id} className={clsx('flex items-center gap-3 px-5 py-3 transition-colors', !r.is_active && 'opacity-50')}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 font-bold"
                        style={{ background: `${r.color}20`, color: r.color }}>{r.category_name?.[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{r.description || r.category_name}</p>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                            background: 'var(--surface-2)', color: 'var(--text-muted)',
                          }}>
                            {FREQ_LABEL[r.frequency]}
                          </span>
                          {!r.is_active && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Pausada</span>}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Próx. {fmt.date(r.next_date)} · {r.category_name}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 600, fontFamily: 'var(--fm)', flexShrink: 0,
                        color: r.type === 'income' ? 'var(--c500)' : 'var(--text)',
                      }}>
                        {r.type === 'income' ? '+' : '−'}{fmt.currency(r.amount, currency)}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => toggleActive(r)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700" title={r.is_active ? 'Pausar' : 'Reanudar'}>
                          {r.is_active ? <Pause size={13} className="text-[var(--text-muted)]" /> : <Play size={13} className="text-green-500" />}
                        </button>
                        <button onClick={() => openEditRec(r)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                          <Pencil size={13} className="text-[var(--text-muted)]" />
                        </button>
                        <button onClick={() => setDeletingRec(r)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
                          <Trash2 size={13} className="text-rose-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={saveRec} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{editingRec ? 'Editar recurrente' : 'Nueva recurrente'}</h3>
                <button type="button" onClick={() => { setShowRecForm(false); setEditingRec(null); }} className="text-xs text-[var(--text-muted)] hover:underline">← Volver</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['income', 'expense'].map((tp) => (
                  <button key={tp} type="button"
                    onClick={() => setRecForm({ ...recForm, type: tp, category_id: '', savings_goal_id: '', credit_card_id: '' })}
                    className={clsx(
                      'p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2',
                      recForm.type === tp
                        ? tp === 'income' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                          : 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                    )}>
                    {tp === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                    {tp === 'income' ? 'Ingreso' : 'Gasto'}
                  </button>
                ))}
              </div>

              <div>
                <label className="label">Descripción</label>
                <input className="input" type="text" placeholder="Ej: Netflix, Renta, Salario"
                  value={recForm.description} onChange={e => setRecForm({ ...recForm, description: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" value={recForm.category_id} onChange={e => setRecForm({ ...recForm, category_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {recFilteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Frecuencia</label>
                  <select className="input" value={recForm.frequency} onChange={e => setRecForm({ ...recForm, frequency: e.target.value })}>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal (cada 15 días)</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Monto</label>
                  <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={recForm.amount} onChange={e => setRecForm({ ...recForm, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input className="input" type="date" value={recForm.start_date}
                    onChange={e => setRecForm({ ...recForm, start_date: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="label">Fecha de fin (opcional)</label>
                <input className="input" type="date" value={recForm.end_date}
                  onChange={e => setRecForm({ ...recForm, end_date: e.target.value })} />
                <p className="text-xs text-[var(--text-muted)] mt-1">Dejar vacío si no tiene fecha de fin</p>
              </div>

              {recForm.type === 'expense' && activeGoals.length > 0 && (
                <div>
                  <label className="label">Vincular a meta de ahorro (opcional)</label>
                  <select className="input" value={recForm.savings_goal_id}
                    onChange={e => setRecForm({ ...recForm, savings_goal_id: e.target.value, credit_card_id: '' })}>
                    <option value="">— Ninguna —</option>
                    {activeGoals.map(g => (
                      <option key={g.id} value={g.id}>{g.name} — {Math.round((g.current_amount / g.target_amount) * 100)}% completada</option>
                    ))}
                  </select>
                </div>
              )}

              {recForm.type === 'expense' && !recForm.savings_goal_id && creditCards.length > 0 && (
                <div>
                  <label className="label">Cargar a tarjeta de crédito (opcional)</label>
                  <select className="input" value={recForm.credit_card_id}
                    onChange={e => setRecForm({ ...recForm, credit_card_id: e.target.value })}>
                    <option value="">— Efectivo / débito —</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.last_four ? ` ···${c.last_four}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowRecForm(false); setEditingRec(null); }} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={recBusy} className="btn-primary flex-1 justify-center">
                  {recBusy ? 'Guardando...' : editingRec ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={deleting?.linked_transfer_txn_id ? 'Eliminar transferencia' : 'Eliminar transacción'}
        message={
          deleting?.linked_transfer_txn_id
            ? 'Se eliminarán ambas partes de la transferencia (egreso e ingreso). ¿Continuar?'
            : `¿Eliminar "${deleting?.description || deleting?.category_name}"? Esta acción no se puede deshacer.`
        }
      />

      <Confirm
        open={!!deletingRec}
        onClose={() => setDeletingRec(null)}
        onConfirm={confirmDeleteRec}
        title="Eliminar recurrente"
        message={`¿Eliminar "${deletingRec?.description || deletingRec?.category_name}"? Se dejará de generar automáticamente.`}
      />

      <UpgradeModal
        open={upgradeModal}
        onClose={() => setUpgradeModal(false)}
        feature="ocr"
      />

      <OcrModal
        open={ocrModal}
        onClose={() => setOcrModal(false)}
        onConfirm={handleOcrConfirm}
        categories={categories}
        creditCards={creditCards}
        accounts={accounts}
        currency={currency}
      />

      <StatementImportModal
        open={statementModal}
        onClose={() => setStatementModal(false)}
        onImported={() => {
          setStatementModal(false);
          fetchTransactions(filters);
          api.get('/transactions/summary').then(r => setSummary(r.data)).catch(() => {});
        }}
        categories={categories}
        creditCards={creditCards}
        accounts={accounts}
        currency={currency}
      />
    </div>
  );
}
