import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetDeliveryQuery, useUpdateDeliveryStatusMutation } from '../../features/deliveries/deliveriesApi';
import { useLocale } from '../../contexts/LocaleContext';

const STATUS_BADGE = {
  pending:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  loaded:     'bg-blue-100 text-blue-700 border-blue-200',
  in_transit: 'bg-purple-100 text-purple-700 border-purple-200',
  delivered:  'bg-green-100 text-green-700 border-green-200',
  returned:   'bg-red-100 text-red-700 border-red-200',
};

const STATUS_FLOW = ['pending', 'loaded', 'in_transit', 'delivered'];

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_BADGE[status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-800">{value || '—'}</span>
    </div>
  );
}

export default function DeliveryShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { data: delivery, isLoading, error } = useGetDeliveryQuery(id);
  const [updateStatus, { isLoading: updating }] = useUpdateDeliveryStatusMutation();
  const [returnModal, setReturnModal] = useState(false);
  const [returnNote, setReturnNote] = useState('');

  async function handleStatusChange(status) {
    try { await updateStatus({ id, status }).unwrap(); } catch (e) { alert(e?.data?.error || 'Failed to update status'); }
  }

  async function handleReturn(e) {
    e.preventDefault();
    if (!returnNote.trim()) return;
    try {
      await updateStatus({ id, status: 'returned', return_note: returnNote }).unwrap();
      setReturnModal(false);
      setReturnNote('');
    } catch (err) { alert(err?.data?.error || 'Failed to update status'); }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading…</div>;
  }
  if (error || !delivery) {
    return <div className="p-8 text-center text-slate-400">Delivery not found.</div>;
  }

  const next = nextStatus(delivery.status);

  function formatDate(s) {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/deliveries')}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-800">Delivery #{delivery.id}</h1>
        <StatusBadge status={delivery.status} />
      </div>

      {/* Status actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Update Status</p>
        <div className="flex flex-wrap gap-2">
          {next && (
            <button
              onClick={() => handleStatusChange(next)}
              disabled={updating}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {updating ? 'Updating…' : `Mark as ${next.replace('_', ' ')}`}
            </button>
          )}
          {delivery.status !== 'returned' && (
            <button
              onClick={() => setReturnModal(true)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Mark as Returned
            </button>
          )}
          {delivery.status === 'delivered' && (
            <span className="px-4 py-2 text-sm text-green-600 font-semibold">Delivery complete.</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Delivery Details</p>
        <Row label="Delivery ID" value={`#${delivery.id}`} />
        <Row label="Status" value={<StatusBadge status={delivery.status} />} />
        <Row label="Area" value={delivery.area?.name} />
        <Row label="Driver" value={delivery.driver_name} />
        <Row label="Scheduled" value={formatDate(delivery.scheduled_date)} />
        <Row label="Notes" value={delivery.notes} />
        {delivery.return_note && <Row label="Return Reason" value={<span className="text-red-600 font-medium">{delivery.return_note}</span>} />}
      </div>

      {/* Sale info */}
      {delivery.sale && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Sale Information</p>
          <Row label="Invoice No" value={delivery.sale.invoice_no} />
          <Row label="Customer" value={delivery.sale.customer?.name} />
          <Row label="Customer Phone" value={delivery.sale.customer?.phone} />
          <Row label="Total" value={delivery.sale.total ? `Rs. ${Number(delivery.sale.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` : null} />
        </div>
      )}

      {/* Return note modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800">Return Reason</h2>
            <p className="text-sm text-slate-500">Please provide a reason for marking this delivery as returned.</p>
            <form onSubmit={handleReturn} className="space-y-4">
              <textarea
                value={returnNote}
                onChange={e => setReturnNote(e.target.value)}
                required
                rows={3}
                placeholder="e.g. Customer not available, damaged goods…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setReturnModal(false); setReturnNote(''); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !returnNote.trim()}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors"
                >
                  {updating ? 'Updating…' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
