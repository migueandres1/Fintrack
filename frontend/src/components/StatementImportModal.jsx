import { useRef, useState } from 'react';
import { FileUp, X, Loader2, FileText, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Modal } from './ui/index.jsx';
import { fmt }   from '../utils/format.js';
import { useStore } from '../store/index.js';
import clsx from 'clsx';

/**
 * StatementImportModal
 * Props:
 *   open       – boolean
 *   onClose    – () => void
 *   onImported – (count: number) => void  (called after successful import)
 *   categories – array of category objects
 *   currency   – string
 */
export default function StatementImportModal({ open, onClose, onImported, categories = [], currency = 'USD' }) {
  const inputRef = useRef(null);
  const { importStatement, confirmStatementImport } = useStore();

  const [file,       setFile]       = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [rows,       setRows]       = useState(null); // preview array
  const [selected,   setSelected]   = useState(null); // Set of selected indices
  const [busy,       setBusy]       = useState(false);

  const expenseCategories = categories.filter(c => c.type === 'expense' || !c.type);
  const allCategories     = categories;

  const reset = () => {
    setFile(null);
    setDragging(false);
    setLoading(false);
    setError(null);
    setRows(null);
    setSelected(null);
    setBusy(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.');
      return;
    }
    setFile(f);
    setError(null);
    setRows(null);
    setSelected(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await importStatement(file);
      if (!result.transactions || result.transactions.length === 0) {
        setError('No se encontraron transacciones en el PDF. Verifica que sea un estado de cuenta de texto (no escaneado).');
        return;
      }
      setRows(result.transactions);
      setSelected(new Set(result.transactions.map((_, i) => i)));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al analizar el estado de cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const updateRow = (i, field, value) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const confirmImport = async () => {
    const toImport = rows.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;
    setBusy(true);
    try {
      const result = await confirmStatementImport(toImport);
      onImported(result.imported);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al importar las transacciones.');
    } finally {
      setBusy(false);
    }
  };

  const selectedCount = selected?.size ?? 0;

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Importar estado de cuenta" size="lg">
      <div className="space-y-4">

        {/* ── Paso 1: Upload ─────────────────────────────── */}
        {!rows && (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              Sube el PDF de tu estado de cuenta bancario o de tarjeta de crédito. La IA extraerá todas las transacciones automáticamente.
            </p>

            {/* Drop zone */}
            <div
              className={clsx(
                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer',
                dragging
                  ? 'border-brand-400 bg-brand-500/10'
                  : 'border-[var(--border)] hover:border-brand-400/60 hover:bg-brand-500/5'
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => pickFile(e.target.files[0])}
              />
              {file ? (
                <>
                  <FileText size={36} className="text-brand-400" />
                  <p className="text-sm font-medium text-[var(--text)]">{file.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(0)} KB</p>
                </>
              ) : (
                <>
                  <FileUp size={36} className="text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">Arrastra el PDF aquí o haz clic para seleccionar</p>
                  <p className="text-xs text-[var(--text-muted)]">Solo archivos PDF · máx. 10 MB</p>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-500 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={handleClose} className="btn-ghost text-sm">Cancelar</button>
              <button
                onClick={analyze}
                disabled={!file || loading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Analizando con IA...</> : 'Analizar estado de cuenta'}
              </button>
            </div>
          </>
        )}

        {/* ── Paso 2: Preview y confirmación ──────────────── */}
        {rows && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-muted)]">
                Se encontraron <span className="font-semibold text-[var(--text)]">{rows.length}</span> transacciones.
                Selecciona las que deseas importar.
              </p>
              <button onClick={reset} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 transition-colors">
                <X size={13} /> Subir otro
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)] max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-2)] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selectedCount === rows.length}
                        onChange={() => setSelected(selectedCount === rows.length ? new Set() : new Set(rows.map((_, i) => i)))}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-[var(--text-muted)] font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left text-[var(--text-muted)] font-medium">Descripción</th>
                    <th className="px-3 py-2 text-right text-[var(--text-muted)] font-medium">Monto</th>
                    <th className="px-3 py-2 text-left text-[var(--text-muted)] font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left text-[var(--text-muted)] font-medium">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={clsx(
                        'border-t border-[var(--border)] transition-colors',
                        selected.has(i) ? 'bg-[var(--bg-card)]' : 'bg-[var(--surface-2)] opacity-50'
                      )}
                    >
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[var(--text-muted)]">{row.date}</td>
                      <td className="px-3 py-2 max-w-[180px]">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(i, 'description', e.target.value)}
                          className="w-full bg-transparent text-[var(--text)] truncate focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        <span className={row.type === 'income' ? 'text-green-500' : 'text-rose-500'}>
                          {row.type === 'income' ? '+' : '-'}{fmt.currency(row.amount, currency)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.type}
                          onChange={(e) => updateRow(i, 'type', e.target.value)}
                          className="bg-transparent text-[var(--text)] text-xs focus:outline-none"
                        >
                          <option value="expense">Gasto</option>
                          <option value="income">Ingreso</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.category_id || ''}
                          onChange={(e) => updateRow(i, 'category_id', e.target.value ? Number(e.target.value) : null)}
                          className="bg-transparent text-[var(--text)] text-xs focus:outline-none max-w-[120px]"
                        >
                          <option value="">Sin categoría</option>
                          {allCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-500 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)]">
              {selectedCount} de {rows.length} transacciones seleccionadas.
              Solo se importarán las que tengan categoría asignada.
            </p>

            <div className="flex gap-2 justify-end">
              <button onClick={handleClose} className="btn-ghost text-sm">Cancelar</button>
              <button
                onClick={confirmImport}
                disabled={busy || selectedCount === 0}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {busy
                  ? <><Loader2 size={15} className="animate-spin" /> Importando...</>
                  : <><CheckCircle size={15} /> Importar {selectedCount} transacciones</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
