import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation,
  useDeleteCustomerMutation, useSettleCreditMutation, useAdjustCreditMutation,
} from '../../features/customers/customersApi';
import { useLocale } from '../../contexts/LocaleContext';
import ConfirmModal from '../../components/ConfirmModal';

const PRICE_LEVELS   = ['retail', 'wholesale', 'vip'];
const PAYMENT_TERMS  = [
  { value: 'cash',   label: 'Cash on Delivery' },
  { value: 'net_7',  label: 'Net 7 days' },
  { value: 'net_15', label: 'Net 15 days' },
  { value: 'net_30', label: 'Net 30 days' },
  { value: 'net_60', label: 'Net 60 days' },
];

const empty = { name: '', phone: '', email: '', address: '', credit_limit: 0, active: true, price_level: 'retail', payment_terms: 'cash' };

export default function CustomersIndex() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [applied, setApplied] = useState('');
  const [modal, setModal]   = useState(null);
  const [creditAmt, setCreditAmt] = useState('');
  const [adjForm, setAdjForm]     = useState({ type: 'add', amount: '', note: '' });
  const { register, handleSubmit: rhfSubmit, formState: { errors }, reset } = useForm({ defaultValues: empty });
  const [err, setErr]       = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (search.length === 0) { setApplied(''); setPage(1); return; }
    if (search.length < 3) return;
    const timer = setTimeout(() => { setApplied(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = useGetCustomersQuery({ search: applied, page });

  const displayRows = data?.data || [];
  const [create, { isLoading: creating }] = useCreateCustomerMutation();
  const [update, { isLoading: updating }] = useUpdateCustomerMutation();
  const [del]     = useDeleteCustomerMutation();
  const [settle, { isLoading: settling }]   = useSettleCreditMutation();
  const [adjustCredit, { isLoading: adjusting }] = useAdjustCreditMutation();

  function openCreate() { reset(empty); setErr(''); setModal({ mode: 'form', data: null }); }
  function openEdit(c) { reset({ ...c }); setErr(''); setModal({ mode: 'form', data: c }); }
  function openCredit(c) { setCreditAmt(''); setErr(''); setModal({ mode: 'credit', data: c }); }
  function openAdjust(c) { setAdjForm({ type: 'add', amount: '', note: '' }); setErr(''); setModal({ mode: 'adjust', data: c }); }
  function close() { setModal(null); }

  const handleSave = rhfSubmit(async (data) => {
    setErr('');
    setSaving(true);
    try {
      if (modal.data) await update({ id: modal.data.id, ...data }).unwrap();
      else await create(data).unwrap();
      refetch();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  });

  async function handleSettle(e) {
    e.preventDefault();
    setErr('');
    try {
      await settle({ id: modal.data.id, amount: parseFloat(creditAmt) }).unwrap();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  async function handleAdjust(e) {
    e.preventDefault();
    setErr('');
    const amount = parseFloat(adjForm.amount);
    if (!amount || amount <= 0) return setErr('Enter a valid amount');
    try {
      await adjustCredit({ id: modal.data.id, type: adjForm.type, amount, note: adjForm.note }).unwrap();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  async function handleDelete(c) {
    setConfirmDelete(c);
  }

  async function confirmDeleteAction() {
    await del(confirmDelete.id);
    setConfirmDelete(null);
    refetch();
  }

  const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.customers')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            + {t('btn.add')} {t('lbl.customer')}
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); setApplied(search); setPage(1); }}
        className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('btn.search')}</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('cust.name')} / ${t('cust.phone')}…`}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {search.length > 0 && search.length < 3 && (
            <p className="text-[11px] text-slate-400 mt-1">Type {3 - search.length} more character{3 - search.length > 1 ? 's' : ''}…</p>
          )}
        </div>
        <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
          {t('btn.search')}
        </button>
      </form>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && !displayRows.length && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('cust.no_customers')}</div>
        )}
        {displayRows.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.phone || '—'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.active ? t('lbl.active') : t('lbl.inactive')}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
              <span>{t('lbl.credit_limit')}: {fmt(c.credit_limit)}</span>
              <span className={parseFloat(c.credit_balance) > 0 ? 'text-red-600 font-bold' : ''}>
                {t('lbl.balance')}: {fmt(c.credit_balance)}
              </span>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-50">
              {parseFloat(c.credit_balance) > 0 && (
                <button onClick={() => navigate(`/customers/${c.id}/credit`)}
                  className="flex-1 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  Credit
                </button>
              )}
              <button onClick={() => openEdit(c)}
                className="flex-1 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                {t('btn.edit')}
              </button>
              <button onClick={() => handleDelete(c)}
                className="flex-1 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                {t('btn.delete')}
              </button>
            </div>
          </div>
        ))}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-2 py-2 text-sm text-slate-500">
            <span>{data.total} {t('nav.customers')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'‹'}</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'›'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-b-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-200 border-b border-slate-300 text-xs text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.name')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.phone')}</th>
                <th className="px-4 py-3 text-left font-semibold">Price Level</th>
                <th className="px-4 py-3 text-left font-semibold">Payment Terms</th>
                <th className="px-4 py-3 text-right font-semibold">{t('lbl.credit_limit')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('lbl.balance')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('th.status')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map(c => (
                <tr key={c.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                      c.price_level === 'wholesale' ? 'bg-blue-100 text-blue-700' :
                      c.price_level === 'vip'       ? 'bg-purple-100 text-purple-700' :
                                                      'bg-slate-100 text-slate-600'
                    }`}>{c.price_level || 'retail'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{
                    PAYMENT_TERMS.find(pt => pt.value === c.payment_terms)?.label || 'Cash'
                  }</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(c.credit_limit)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={parseFloat(c.credit_balance) > 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {fmt(c.credit_balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.active ? t('lbl.active') : t('lbl.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {parseFloat(c.credit_balance) > 0 && (
                        <button onClick={() => navigate(`/customers/${c.id}/credit`)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-orange-200 bg-orange-50 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors">Credit</button>
                      )}
                      <button onClick={() => openAdjust(c)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-violet-200 bg-violet-50 text-xs font-medium text-violet-600 hover:bg-violet-100 transition-colors">Adjust</button>
                      <button onClick={() => openEdit(c)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">{t('btn.edit')}</button>
                      <button onClick={() => handleDelete(c)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors">{t('btn.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!displayRows.length && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t('cust.no_customers')}</td></tr>
              )}
            </tbody>
          </table></div>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} {t('nav.customers')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'‹'}</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'›'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {modal?.mode === 'form' && (
        <Modal title={modal.data ? `${t('btn.edit')} ${t('lbl.customer')}` : `${t('btn.add')} ${t('lbl.customer')}`} onClose={close}>
          <form onSubmit={handleSave} className="space-y-3">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Field label={`${t('cust.name')} *`} error={errors.name}
              {...register('name', { required: 'Name is required' })} />
            <Field label={t('cust.phone')} {...register('phone')} />
            <Field label={t('cust.email')} type="email" {...register('email')} />
            <Field label={t('cust.address')} {...register('address')} />
            <Field label={t('cust.credit_limit')} type="number" min="0" step="0.01"
              {...register('credit_limit', { min: { value: 0, message: 'Cannot be negative' } })} error={errors.credit_limit} />
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Price Level</label>
              <select {...register('price_level')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white capitalize">
                {PRICE_LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Terms</label>
              <select {...register('payment_terms')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" {...register('active')} className="rounded" />
              {t('cust.active')}
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
              <button type="submit" disabled={creating || updating || saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 flex items-center gap-2">
                {(creating || updating || saving) && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                {creating || updating || saving ? t('lbl.loading') : t('btn.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Credit Settle Modal */}
      {modal?.mode === 'credit' && (
        <Modal title={`${t('btn.settle')} ${t('lbl.credit')} — ${modal.data.name}`} onClose={close}>
          <p className="text-sm text-slate-600 mb-3">{t('cust.current_balance')}: <strong className="text-red-600">{fmt(modal.data.credit_balance)}</strong></p>
          <form onSubmit={handleSettle} className="space-y-3">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Field label="Payment Amount" type="number" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} min="0.01" step="0.01" required />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
              <button type="submit" disabled={settling} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold disabled:opacity-60 hover:bg-orange-600">
                {settling ? t('lbl.loading') : t('btn.settle')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Credit Adjustment Modal */}
      {modal?.mode === 'adjust' && (
        <Modal title={`Adjust Credit — ${modal.data.name}`} onClose={close}>
          <p className="text-sm text-slate-500 mb-4">
            Current balance: <strong className={parseFloat(modal.data.credit_balance) > 0 ? 'text-red-600' : 'text-green-600'}>{fmt(modal.data.credit_balance)}</strong>
          </p>
          <form onSubmit={handleAdjust} className="space-y-3">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select value={adjForm.type} onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="add">Add credit (increase balance owed)</option>
                <option value="reduce">Reduce credit (payment / write-off)</option>
              </select>
            </div>
            <Field label="Amount" type="number" min="0.01" step="0.01" required
              value={adjForm.amount} onChange={e => setAdjForm(f => ({ ...f, amount: e.target.value }))} />
            <Field label="Note (optional)"
              value={adjForm.note} onChange={e => setAdjForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Reason for adjustment" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={adjusting}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-violet-700">
                {adjusting ? 'Saving…' : 'Save Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${confirmDelete.name}"?`}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, error, type = 'text', ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${error ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'}`} />
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
