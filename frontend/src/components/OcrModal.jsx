import { useRef, useState } from 'react';

// Comprime imágenes grandes antes de subir (fotos de cámara móvil ~6MB → ~400KB)
async function compressImage(file, maxPx = 1920, quality = 0.82) {
  if (!file.type.startsWith('image/') || file.size < 1.2 * 1024 * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(new File([blob], 'receipt.jpg', { type: 'image/jpeg' })),
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
import { ScanLine, Upload, X, CheckCircle, AlertCircle, Loader2, ImageIcon, Banknote, CreditCard } from 'lucide-react';
import { Modal } from './ui/index.jsx';
import { fmt }   from '../utils/format.js';
import api        from '../services/api.js';
import clsx       from 'clsx';

/**
 * OcrModal
 * Props:
 *   open        – boolean
 *   onClose     – () => void
 *   onConfirm   – (fields: { description, amount, date, line_items }) => void
 *   categories  – array de categorías para sugerir
 *   currency    – string
 */
export default function OcrModal({ open, onClose, onConfirm, categories = [], creditCards = [], accounts = [], currency = 'USD' }) {
  const inputRef = useRef(null);

  const [file,      setFile]      = useState(null);       // File object
  const [preview,   setPreview]   = useState(null);       // data URL para imagen
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);       // datos extraídos
  const [error,     setError]     = useState(null);
  const [dragging,  setDragging]  = useState(false);

  // Campos editables tras extracción
  const [fields, setFields] = useState({
    description: '', amount: '', date: '', category_id: '',
    payment_method: 'cash', credit_card_id: '', account_id: '',
  });

  const reset = () => {
    setFile(null); setPreview(null); setLoading(false);
    setResult(null); setError(null);
    setFields({ description: '', amount: '', date: '', category_id: '' });
  };

  const handleClose = () => { reset(); onClose(); };

  const loadFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null); // PDF — sin preview
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  const process = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    const form = new FormData();
    const uploadFile = await compressImage(file);
    form.append('receipt', uploadFile);
    try {
      const { data } = await api.post('/ocr/receipt', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60s — conexiones móviles lentas
      });
      setResult(data);
      // Sugerir categoría "Alimentación" si parece supermercado, etc.
      const merchant = (data.merchant || '').toLowerCase();
      let suggestedCat = '';
      const expCats = categories.filter(c => c.type === 'expense');
      if (/super|walmart|market|tienda|colonia|precio|mall/.test(merchant)) {
        suggestedCat = expCats.find(c => /alimenta|comida|food/i.test(c.name))?.id || '';
      } else if (/gas|shell|texaco|petro|combustible/.test(merchant)) {
        suggestedCat = expCats.find(c => /transport/i.test(c.name))?.id || '';
      } else if (/restaur|pizza|burger|sushi|cafe|coffee|mcdonalds|kfc/.test(merchant)) {
        suggestedCat = expCats.find(c => /alimenta|comida|food/i.test(c.name))?.id || '';
      } else if (/farmacia|medic|clinica|hospital|doctor/.test(merchant)) {
        suggestedCat = expCats.find(c => /salud/i.test(c.name))?.id || '';
      }
      setFields({
        description:    data.merchant || '',
        amount:         data.amount   ? String(data.amount) : '',
        date:           data.date     || new Date().toISOString().split('T')[0],
        category_id:    suggestedCat,
        payment_method: 'cash',
        credit_card_id: '',
        account_id:     '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el recibo');
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    onConfirm({
      description:    fields.description,
      amount:         fields.amount,
      date:           fields.date,
      category_id:    fields.category_id,
      credit_card_id: fields.payment_method === 'card'  ? fields.credit_card_id : null,
      account_id:     fields.payment_method === 'debit' ? fields.account_id     : null,
      line_items:     result?.line_items || [],
    });
    handleClose();
  };

  const expCategories = categories.filter(c => c.type === 'expense');

  return (
    <Modal open={open} onClose={handleClose} title="Escanear recibo">
      <div className="space-y-4">

        {/* Zona de drop */}
        {!result && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl cursor-pointer transition-colors',
              'flex flex-col items-center justify-center gap-2 text-center',
              file ? 'p-3' : 'p-8',
              dragging
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-[var(--border)] hover:border-brand-400 hover:bg-surface-50 dark:hover:bg-surface-800'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf"
              onChange={e => loadFile(e.target.files[0])}
            />

            {file ? (
              <div className="flex items-center gap-3 w-full">
                {preview
                  ? <img src={preview} alt="recibo" className="h-20 w-20 object-cover rounded-lg flex-shrink-0" />
                  : <div className="h-20 w-20 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={28} className="text-[var(--text-muted)]" />
                    </div>
                }
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {(file.size / 1024).toFixed(0)} KB · haz clic para cambiar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); reset(); }}
                  className="ml-auto p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 flex-shrink-0"
                >
                  <X size={14} className="text-[var(--text-muted)]" />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="text-[var(--text-muted)]" />
                <p className="text-sm font-medium">Arrastra tu recibo aquí</p>
                <p className="text-xs text-[var(--text-muted)]">JPG, PNG, WEBP o PDF · máx. 10 MB</p>
              </>
            )}
          </div>
        )}

        {/* Resultado extraído */}
        {result && !loading && (
          <div className="space-y-3 animate-fade-up">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
              <CheckCircle size={15} />
              Recibo procesado — revisa y ajusta si es necesario
            </div>

            {/* Preview pequeño */}
            {preview && (
              <img src={preview} alt="recibo" className="h-28 w-full object-contain rounded-lg bg-surface-50 dark:bg-surface-800" />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Descripción / Comercio</label>
                <input className="input" type="text" placeholder="Ej: Walmart"
                  value={fields.description}
                  onChange={e => setFields(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Monto total</label>
                <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
                  value={fields.amount}
                  onChange={e => setFields(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date"
                  value={fields.date}
                  onChange={e => setFields(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Categoría sugerida</label>
                <select className="input" value={fields.category_id}
                  onChange={e => setFields(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {expCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Forma de pago */}
              <div className="col-span-2">
                <label className="label">Forma de pago</label>
                <div className={clsx('grid gap-2', creditCards.length > 0 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2')}>
                  {[
                    { value: 'cash',  label: 'Efectivo',       emoji: '💵' },
                    { value: 'debit', label: 'Débito / Cuenta', emoji: '🏦' },
                    ...(creditCards.length > 0 ? [{ value: 'card', label: 'Tarjeta de crédito', emoji: '💳' }] : []),
                  ].map(({ value, label, emoji }) => (
                    <button key={value} type="button"
                      onClick={() => setFields(f => ({
                        ...f,
                        payment_method: value,
                        credit_card_id: value === 'card'  ? f.credit_card_id : '',
                        account_id:     value === 'debit' ? f.account_id     : '',
                      }))}
                      className={clsx(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-medium transition-all',
                        fields.payment_method === value
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                      )}>
                      {emoji} {label}
                    </button>
                  ))}
                </div>

                {/* Cuenta (débito) */}
                {fields.payment_method === 'debit' && (
                  <select className="input mt-2" value={fields.account_id}
                    onChange={e => setFields(f => ({ ...f, account_id: e.target.value }))}>
                    <option value="">— Seleccionar cuenta —</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.currency || 'USD'})</option>
                    ))}
                  </select>
                )}

                {/* Tarjeta de crédito */}
                {fields.payment_method === 'card' && creditCards.length > 0 && (
                  <select className="input mt-2" value={fields.credit_card_id}
                    onChange={e => setFields(f => ({ ...f, credit_card_id: e.target.value }))}>
                    <option value="">— Seleccionar tarjeta —</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.last_four ? ` ···${c.last_four}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Líneas de detalle */}
            {result.line_items?.length > 0 && (
              <details className="group">
                <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)] select-none list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  {result.line_items.length} línea{result.line_items.length !== 1 ? 's' : ''} de detalle
                </summary>
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-[var(--border)]">
                  {result.line_items.map((li, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)] truncate mr-2">
                        {li.quantity ? `${li.quantity}× ` : ''}{li.description}
                      </span>
                      {li.amount != null && (
                        <span className="text-mono font-medium flex-shrink-0">{fmt.currency(li.amount, currency)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleClose} className="btn-ghost flex-1 justify-center">
            Cancelar
          </button>
          {!result ? (
            <button
              type="button"
              onClick={process}
              disabled={!file || loading}
              className="btn-primary flex-1 justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                : <><ScanLine size={14} /> Procesar recibo</>}
            </button>
          ) : (
            <button
              type="button"
              onClick={confirm}
              disabled={!fields.amount}
              className="btn-primary flex-1 justify-center gap-2"
            >
              <CheckCircle size={14} /> Crear transacción
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
