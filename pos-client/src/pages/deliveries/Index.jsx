import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetDeliveriesQuery, useDeleteDeliveryMutation } from '../../features/deliveries/deliveriesApi';
import { selectRole } from '../../features/auth/authSlice';
import { useLocale } from '../../contexts/LocaleContext';

const STATUS_BADGE = {
  pending:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  loaded:     'bg-blue-100 text-blue-700 border-blue-200',
  in_transit: 'bg-purple-100 text-purple-700 border-purple-200',
  delivered:  'bg-green-100 text-green-700 border-green-200',
  returned:   'bg-red-100 text-red-700 border-red-200',
};

const STATUSES = ['', 'pending', 'loaded', 'in_transit', 'delivered', 'returned'];

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

export default function DeliveriesIndex() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: '', date: '', page: 1 });
  const [selected, setSelected] = useState(new Set());

  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.date) params.date = filters.date;
  params.page = filters.page;

  const { data, isLoading } = useGetDeliveriesQuery(params);
  const [deleteDelivery] = useDeleteDeliveryMutation();
  const role     = useSelector(selectRole);
  const canDelete = role === 'admin' || role === 'manager';

  const deliveries = data?.data || [];
  const total = data?.total || 0;
  const lastPage = data?.last_page || 1;

  async function handleDelete(id) {
    if (!confirm('Delete this delivery?')) return;
    try { await deleteDelivery(id).unwrap(); } catch (e) { alert(e?.data?.error || 'Failed to delete'); }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === deliveries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(deliveries.map(d => d.id)));
    }
  }

  function openLoadsheet() {
    const ids = [...selected].join(',');
    navigate(`/deliveries/loadsheet?ids=${ids}`);
  }

  function formatDate(s) {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Deliveries</h1>
          {selected.size > 0 && (
            <p className="text-xs text-orange-600 font-semibold mt-0.5">{selected.size} selected</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 ? (
            <>
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
              >
                Clear
              </button>
              <button
                onClick={openLoadsheet}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 7h6m-6 4h4"/>
                </svg>
                Load Sheet ({selected.size})
              </button>
            </>
          ) : (
            <Link
              to="/deliveries/loadsheet"
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 7h6m-6 4h4"/>
              </svg>
              Load Sheet
            </Link>
          )}
          <Link
            to="/deliveries/create"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            + New Delivery
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Statuses'}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value, page: 1 }))}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {(filters.status || filters.date) && (
          <button
            onClick={() => setFilters({ status: '', date: '', page: 1 })}
            className="px-3 py-2 text-xs font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : deliveries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No deliveries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={deliveries.length > 0 && selected.size === deliveries.length}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sale</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Area</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Scheduled</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map(d => (
                  <tr key={d.id} className={`hover:bg-slate-50 transition-colors ${selected.has(d.id) ? 'bg-orange-50' : ''}`}>
                    <td className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        className="rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-400">{d.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {d.sale?.invoice_no || `Sale #${d.sale_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.area?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{d.driver_name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(d.scheduled_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/deliveries/${d.id}`}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          View
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{total} total</span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-slate-500">Page {filters.page} / {lastPage}</span>
            <button
              disabled={filters.page >= lastPage}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
