import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useGetSuppliersQuery, useCreateSupplierMutation,
  useUpdateSupplierMutation, useDeleteSupplierMutation,
} from '../../features/suppliers/suppliersApi';
import { useLocale } from '../../contexts/LocaleContext';
import ConfirmModal from '../../components/ConfirmModal';

const empty = { name: '', phone: '', email: '', address: '', active: true };

export default function SuppliersIndex() {
  const { t } = useLocale();
  const [modal, setModal]   = useState(null);
  const [err, setErr]       = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { register, handleSubmit: rhfSubmit, formState: { errors }, reset } = useForm({ defaultValues: empty });

  const { data: suppliers = [], isLoading, refetch } = useGetSuppliersQuery();
  const [create, { isLoading: creating }] = useCreateSupplierMutation();
  const [update, { isLoading: updating }] = useUpdateSupplierMutation();
  const [del]                             = useDeleteSupplierMutation();

  function openCreate() { reset(empty); setErr(''); setModal('form'); }
  function openEdit(s)  { reset({ ...s }); setErr(''); setModal({ edit: s }); }
  function close()      { setModal(null); }

  const handleSave = rhfSubmit(async (data) => {
    setErr('');
    setSaving(true);
    try {
      if (modal?.edit) await update({ id: modal.edit.id, ...data }).unwrap();
      else await create(data).unwrap();
      refetch();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  });

  async function handleDelete(s) { setConfirmDelete(s); }
  async function confirmDeleteAction() {
    await del(confirmDelete.id);
    setConfirmDelete(null);
    refetch();
  }

  const isBusy = creating || updating || saving;
  const inp = (hasErr) => `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${hasErr ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'}`;

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.suppliers')}</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + {t('btn.add')} {t('pur.supplier')}
        </button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && suppliers.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('sup.no_suppliers')}</div>
        )}
        {suppliers.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="font-semibold text-slate-800">{s.name}</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500 mb-3">
              <span>{s.phone || '—'}</span>
              <span>{s.email || '—'}</span>
            </div>
            {s.address && <p className="text-xs text-slate-400 mb-3 truncate">{s.address}</p>}
            <div className="flex gap-2 pt-2 border-t border-slate-50">
              <button onClick={() => openEdit(s)}
                className="flex-1 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                {t('btn.edit')}
              </button>
              <button onClick={() => handleDelete(s)}
                className="flex-1 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                {t('btn.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-b-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-200 border-b border-slate-300 text-xs text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.name')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.phone')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.email')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.address')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.address || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(s)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">{t('btn.edit')}</button>
                      <button onClick={() => handleDelete(s)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors">{t('btn.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('sup.no_suppliers')}</td></tr>
              )}
            </tbody>
          </table></div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                {modal?.edit ? `${t('btn.edit')} ${t('pur.supplier')}` : `${t('btn.add')} ${t('pur.supplier')}`}
              </h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {err && <p className="text-sm text-red-600">{err}</p>}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('cust.name')} *</label>
                <input {...register('name', { required: 'Name is required' })}
                  className={inp(errors.name)} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('cust.phone')}</label>
                <input {...register('phone')} className={inp(false)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('cust.email')}</label>
                <input type="email" {...register('email')} className={inp(false)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('cust.address')}</label>
                <input {...register('address')} className={inp(false)} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={close}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                  {t('btn.cancel')}
                </button>
                <button type="submit" disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 flex items-center gap-2">
                  {isBusy && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  )}
                  {isBusy ? t('lbl.loading') : t('btn.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
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
