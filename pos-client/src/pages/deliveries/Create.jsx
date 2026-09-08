import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateDeliveryMutation } from '../../features/deliveries/deliveriesApi';
import { useGetAreasQuery } from '../../features/areas/areasApi';
import { useGetSalesQuery } from '../../features/sales/salesApi';

const inputCls = 'border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-full';

export default function DeliveryCreate() {
  const navigate = useNavigate();
  const [createDelivery, { isLoading }] = useCreateDeliveryMutation();
  const { data: areasData } = useGetAreasQuery();
  const { data: salesData } = useGetSalesQuery({ page: 1, limit: 200 });

  const areas = areasData?.data || [];
  const sales = salesData?.data || [];

  const [form, setForm] = useState({
    sale_id: '',
    area_id: '',
    driver_name: '',
    scheduled_date: '',
    notes: '',
  });
  const [selectedSale, setSelectedSale] = useState(null);
  const [search, setSearch]   = useState('');
  const [open, setOpen]       = useState(false);
  const [error, setError]     = useState('');
  const dropRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    return (
      s.invoice_no?.toLowerCase().includes(q) ||
      s.customer?.name?.toLowerCase().includes(q)
    );
  }).slice(0, 30);

  function selectSale(sale) {
    setSelectedSale(sale);
    setForm(f => ({ ...f, sale_id: String(sale.id) }));
    if (sale.delivery_date) setForm(f => ({ ...f, scheduled_date: sale.delivery_date }));
    setSearch('');
    setOpen(false);
  }

  function clearSale() {
    setSelectedSale(null);
    setForm(f => ({ ...f, sale_id: '' }));
    setSearch('');
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.sale_id) { setError('Please select an invoice'); return; }
    try {
      await createDelivery({
        sale_id:        parseInt(form.sale_id),
        area_id:        form.area_id ? parseInt(form.area_id) : null,
        driver_name:    form.driver_name,
        scheduled_date: form.scheduled_date || null,
        notes:          form.notes,
      }).unwrap();
      navigate('/deliveries');
    } catch (e) {
      setError(e?.data?.error || 'Failed to create delivery');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-xl">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-800">New Delivery</h1>
        <p className="text-sm text-slate-400">Create a delivery order linked to a sale.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Invoice picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Invoice</label>
            <div className="relative" ref={dropRef}>
              {selectedSale ? (
                /* Selected state */
                <div className="flex items-center justify-between border border-orange-400 ring-1 ring-orange-300 rounded-xl px-3 py-2 bg-orange-50">
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-slate-800">{selectedSale.invoice_no}</span>
                    {selectedSale.customer?.name && (
                      <span className="ml-2 text-xs text-slate-500">{selectedSale.customer.name}</span>
                    )}
                    {selectedSale.total != null && (
                      <span className="ml-2 text-xs font-medium text-orange-600">
                        Rs. {Number(selectedSale.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={clearSale}
                    className="ml-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ) : (
                /* Search input */
                <input
                  className={inputCls}
                  type="text"
                  placeholder="Search invoice no or customer…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  autoComplete="off"
                />
              )}

              {/* Dropdown */}
              {open && !selectedSale && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">No invoices found</div>
                  ) : filtered.map(sale => (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => selectSale(sale)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-orange-50 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-slate-800">{sale.invoice_no}</span>
                        {sale.customer?.name && (
                          <span className="ml-2 text-xs text-slate-500 truncate">{sale.customer.name}</span>
                        )}
                      </div>
                      <span className="ml-4 text-xs font-medium text-slate-500 flex-shrink-0">
                        Rs. {Number(sale.total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Area</label>
            <select className={inputCls} value={form.area_id} onChange={e => set('area_id', e.target.value)}>
              <option value="">— Select Area —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Driver Name</label>
            <input className={inputCls} type="text" placeholder="Driver name"
              value={form.driver_name} onChange={e => set('driver_name', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Scheduled Date</label>
            <input className={inputCls} type="date"
              value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea className={inputCls + ' resize-none'} rows={3} placeholder="Optional notes…"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isLoading}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
              {isLoading ? 'Creating…' : 'Create Delivery'}
            </button>
            <button type="button" onClick={() => navigate('/deliveries')}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
