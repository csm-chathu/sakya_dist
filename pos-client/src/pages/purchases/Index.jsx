import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetPurchasesQuery, useDeletePurchaseMutation } from '../../features/purchases/purchasesApi';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';
import { useLocale } from '../../contexts/LocaleContext';

export default function PurchasesIndex() {
  const role = useSelector(selectRole);
  const { t } = useLocale();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetPurchasesQuery({ page });
  const [del] = useDeletePurchaseMutation();

  const rows = data?.data || [];

  const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const fmtDate = s => new Date(s).toLocaleDateString('en-LK');

  async function handleDelete(p) {
    if (!window.confirm(`Delete GRN ${p.grn_no}?`)) return;
    await del(p.id);
  }

  const statusBadge = s => {
    const cls = { received: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', partial: 'bg-blue-100 text-blue-700' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${cls[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
  };

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.purchases')}</h1>
        <Link to="/purchases/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + {t('btn.new_purchase')}
        </Link>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && !rows.length && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('pur.no_purchases')}</div>
        )}
        {rows.map(p => (
          <Link key={p.id} to={`/purchases/${p.id}`}
            className="block bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-blue-600 font-bold text-sm">{p.grn_no}</span>
              {statusBadge(p.status)}
            </div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-500">{fmtDate(p.purchase_date)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.supplier?.name || t('lbl.all')} · {p.user?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-slate-800">{fmt(p.total)}</p>
                <p className="text-xs text-slate-400">{t('th.paid')}: {fmt(p.paid)}</p>
              </div>
            </div>
            {role === 'admin' && (
              <div className="pt-2 border-t border-slate-50 flex justify-end">
                <button onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(p); }}
                  className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-0.5 hover:bg-red-50 rounded transition-colors">
                  {t('btn.delete')}
                </button>
              </div>
            )}
          </Link>
        ))}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-2 py-2 text-sm text-slate-500">
            <span>{data.total} {t('nav.purchases')}</span>
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
                <th className="px-4 py-3 text-left font-semibold">{t('pur.grn')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('th.date')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('pur.supplier')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('lbl.cashier')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.total')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.paid')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('th.status')}</th>
                {role === 'admin' && <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                    <Link to={`/purchases/${p.id}`} className="hover:underline">{p.grn_no}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(p.purchase_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.supplier?.name || t('lbl.all')}</td>
                  <td className="px-4 py-3 text-slate-500">{p.user?.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(p.total)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(p.paid)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                  {role === 'admin' && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(p)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors">{t('btn.delete')}</button>
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={role === 'admin' ? 8 : 7} className="px-4 py-8 text-center text-slate-400">{t('pur.no_purchases')}</td></tr>
              )}
            </tbody>
          </table></div>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} {t('nav.purchases')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'‹'}</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'›'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
