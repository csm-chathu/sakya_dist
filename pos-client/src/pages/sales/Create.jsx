import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCustomersQuery } from '../../features/customers/customersApi';
import { useGetProductsQuery } from '../../features/products/productsApi';
import { useCreateSaleMutation } from '../../features/sales/salesApi';
import { useLocale } from '../../contexts/LocaleContext';

const inputCls = 'border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

function newRow() {
  return { product_id: '', product_name: '', qty: 1, selling_price: '', total: 0 };
}

/* ── Searchable Customer Combobox ─────────────────────────────────────────── */
function CustomerCombobox({ customers, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = q.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.phone || '').includes(q)
      )
    : customers;

  function choose(c) {
    onSelect(c);
    setQ('');
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setQ('');
  }

  if (selected) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border border-slate-300 rounded-xl bg-orange-50">
        <span className="flex-1 text-sm font-semibold text-orange-800 truncate">{selected.name}</span>
        {selected.price_level && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-200 text-orange-700 uppercase">
            {selected.price_level}
          </span>
        )}
        <button type="button" onClick={clear} className="text-orange-400 hover:text-orange-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        className={inputCls + ' w-full'}
        placeholder="Search customer…"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          <button
            type="button"
            onMouseDown={() => choose(null)}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100"
          >
            — Walk-in Customer —
          </button>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No match</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => choose(c)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <span className="font-medium">{c.name}</span>
                {c.phone && <span className="ml-2 text-slate-400 text-xs">{c.phone}</span>}
                {c.price_level && (
                  <span className="ml-2 text-[10px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                    {c.price_level}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Searchable Product Combobox (per row) ────────────────────────────────── */
function ProductCombobox({ products, selectedId, selectedName, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  const updatePos = useCallback(() => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filtered = q.trim()
    ? products.filter(p => {
        const lq = q.toLowerCase();
        return p.name.toLowerCase().includes(lq)
          || (p.sku  && p.sku.toLowerCase().includes(lq))
          || (p.barcode && p.barcode.toLowerCase().includes(lq));
      })
    : products;

  function choose(p) {
    onSelect(p);
    setQ('');
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setQ('');
  }

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 border border-slate-300 rounded-xl bg-orange-50">
        <span className="flex-1 text-sm font-semibold text-orange-800 truncate">{selectedName}</span>
        <button type="button" onClick={clear} className="text-orange-400 hover:text-orange-600 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        className={inputCls + ' w-full py-1.5'}
        placeholder="Search product…"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); updatePos(); }}
        onFocus={() => { updatePos(); setOpen(true); }}
      />
      {open && (
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No match</div>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => choose(p)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center justify-between gap-2"
              >
                <span className="font-medium">{p.name}{p.sku && <span className="ml-1.5 text-xs text-slate-400 font-normal">({p.sku})</span>}</span>
                <span className="text-xs text-slate-400 shrink-0">
                  Rs. {Number(p.selling_price || 0).toLocaleString('en-LK')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function SalesCreate() {
  const navigate = useNavigate();
  const { t } = useLocale();

  const { data: customersData } = useGetCustomersQuery({ page: 1, limit: 500 });
  const { data: productsData } = useGetProductsQuery({ page: 1, limit: 500 });
  const [createSale, { isLoading: submitting }] = useCreateSaleMutation();

  const customers = customersData?.data || [];
  const products = productsData?.data || [];

  const [form, setForm] = useState({
    delivery_date: '',
    notes: '',
    payment_method: 'cash',
    discount_pct: '',
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [items, setItems] = useState([newRow()]);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleCustomerSelect(c) {
    setSelectedCustomer(c);
    // Recalculate prices if customer price_level changed
    if (c !== selectedCustomer) {
      setItems(prev => prev.map(row => {
        if (!row.product_id) return row;
        const p = products.find(p => String(p.id) === String(row.product_id));
        if (!p) return row;
        const useWholesale = c?.price_level === 'wholesale' && p.wholesale_price;
        const selling_price = String(useWholesale ? p.wholesale_price : (p.selling_price || ''));
        const qty = parseFloat(row.qty) || 0;
        return { ...row, selling_price, total: qty * (parseFloat(selling_price) || 0) };
      }));
    }
  }

  function setItem(idx, field, value) {
    setItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      if (field === 'product_id') {
        const p = products.find(p => String(p.id) === String(value));
        if (p) {
          const useWholesale = selectedCustomer?.price_level === 'wholesale' && p.wholesale_price;
          updated.selling_price = String(useWholesale ? p.wholesale_price : (p.selling_price || ''));
          updated.product_name  = p.name;
        } else {
          updated.selling_price = '';
          updated.product_name  = '';
        }
      }
      const qty = parseFloat(updated.qty) || 0;
      const price = parseFloat(updated.selling_price) || 0;
      updated.total = qty * price;
      return updated;
    }));
  }

  function handleProductSelect(idx, p) {
    if (!p) {
      setItems(prev => prev.map((row, i) =>
        i !== idx ? row : { ...row, product_id: '', product_name: '', selling_price: '', total: 0 }
      ));
      return;
    }
    setItem(idx, 'product_id', p.id);
  }

  function addRow() {
    setItems(prev => [...prev, newRow()]);
  }

  function removeRow(idx) {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, r) => s + (r.total || 0), 0);
  const discountPct = parseFloat(form.discount_pct) || 0;
  const discountAmt = subtotal * Math.min(discountPct, 100) / 100;
  const total = Math.max(0, subtotal - discountAmt);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validItems = items.filter(r => r.product_id && parseFloat(r.qty) > 0);
    if (validItems.length === 0) { setError('Add at least one item'); return; }

    if (form.payment_method === 'credit') {
      if (!selectedCustomer) { setError('Select a customer for credit sales'); return; }
      const limit   = parseFloat(selectedCustomer.credit_limit || 0);
      const balance = parseFloat(selectedCustomer.credit_balance || 0);
      if (limit > 0 && balance + total > limit) {
        const avail = (limit - balance).toLocaleString('en-LK', { minimumFractionDigits: 2 });
        if (!window.confirm(`Credit limit exceeded!\n\nAvailable credit: Rs. ${avail}\nOrder total: Rs. ${total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}\n\nProceed anyway?`)) return;
      }
    }

    const payload = {
      customer_id: selectedCustomer?.id || null,
      items: validItems.map(r => {
        const price = parseFloat(r.selling_price) || 0;
        const qty   = parseFloat(r.qty);
        const p     = products.find(p => String(p.id) === String(r.product_id));
        return {
          product_id:   parseInt(r.product_id),
          product_name: r.product_name || p?.name || '',
          unit_price:   price,
          cost_price:   p?.cost_price || 0,
          qty,
          discount:     0,
          total:        qty * price,
        };
      }),
      payments: [{ method: form.payment_method, amount: total }],
      subtotal,
      discount: discountAmt,
      tax: 0,
      extra_charges: 0,
      total,
      paid: total,
      balance: 0,
      status: 'completed',
      notes: form.notes || null,
      delivery_date: form.delivery_date || null,
    };

    try {
      const result = await createSale(payload).unwrap();
      navigate(`/sales/${result.id}`);
    } catch (e) {
      setError(e?.data?.error || 'Failed to create order');
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="mb-2">
        <h1 className="text-lg font-bold text-slate-800">Create Order</h1>
        <p className="text-sm text-slate-400">New sales order for distribution.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header fields */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Customer</label>
            <CustomerCombobox
              customers={customers}
              selected={selectedCustomer}
              onSelect={handleCustomerSelect}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Delivery Date</label>
            <input
              type="date"
              className={inputCls + ' w-full'}
              value={form.delivery_date}
              onChange={e => setField('delivery_date', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea
              className={inputCls + ' w-full resize-none'}
              rows={2}
              placeholder="Order notes…"
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Order Items</p>
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              + Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase" style={{width:'55%'}}>Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-28">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-36">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-36">Total</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">
                      <ProductCombobox
                        products={products}
                        selectedId={row.product_id}
                        selectedName={row.product_name}
                        onSelect={p => handleProductSelect(idx, p)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        className={inputCls + ' w-full text-right'}
                        value={row.qty}
                        onChange={e => setItem(idx, 'qty', e.target.value)}
                        onFocus={e => e.target.select()}
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputCls + ' w-full text-right'}
                        value={row.selling_price}
                        onChange={e => setItem(idx, 'selling_price', e.target.value)}
                        onFocus={e => e.target.select()}
                        required
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">
                      {Number(row.total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Remove row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary + Payment */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Method</label>
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setField('payment_method', m.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      form.payment_method === m.value
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputCls + ' w-full'}
                placeholder="0"
                value={form.discount_pct}
                onChange={e => setField('discount_pct', e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount ({discountPct}%)</span>
                <span>- Rs. {discountAmt.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-800 pt-1 border-t border-slate-100">
              <span>Total</span>
              <span>Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/sales')}
              className="px-8 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-10 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
