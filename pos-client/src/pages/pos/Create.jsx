import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGetCustomersQuery, useQuickAddCustomerMutation } from '../../features/customers/customersApi';
import { useGetProductsQuery } from '../../features/products/productsApi';
import { useCreatePosSaleMutation } from '../../features/pos/posApi';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

/* ── Quick-add Customer Modal ──────────────────────────────────────────────── */
function QuickAddModal({ onClose, onAdded, onSave }) {
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try { await onSave({ name, phone }); }
    finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-slate-800 mb-4">Quick Add Customer</h3>
        <form onSubmit={submit} className="space-y-3">
          <input autoFocus required placeholder="Customer name" value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          <input placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main POS Create ───────────────────────────────────────────────────────── */
export default function PosCreate() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const role      = useSelector(selectRole);

  const { data: customersData } = useGetCustomersQuery({ page: 1, limit: 500 });
  const { data: productsData }  = useGetProductsQuery({ page: 1, limit: 500 });
  const [createPosSale, { isLoading: submitting }] = useCreatePosSaleMutation();
  const [quickAddCustomer] = useQuickAddCustomerMutation();

  const customers = customersData?.data || [];
  const allProducts = productsData?.data || [];

  /* ── state ── */
  const [cart,        setCart]        = useState([]);
  const [customer,    setCustomer]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [custSearch,  setCustSearch]  = useState('');
  const [custOpen,    setCustOpen]    = useState(false);
  const [priceMode,   setPriceMode]   = useState('retail');   // retail | wholesale | custom
  const [discountAmt, setDiscountAmt] = useState(0);
  const [discountType,setDiscountType]= useState('pct');      // pct | rs
  const [discInput,   setDiscInput]   = useState('0');
  const [payMethod,   setPayMethod]   = useState('cash');
  const [amountPaid,  setAmountPaid]  = useState('');
  const [error,       setError]       = useState('');
  const [showQuickAdd,setShowQuickAdd]= useState(false);

  const searchRef  = useRef(null);
  const paidRef    = useRef(null);
  const custRef    = useRef(null);

  /* ── barcode from navigation state ── */
  useEffect(() => {
    if (location.state?.barcode) {
      setSearch(location.state.barcode);
      searchRef.current?.focus();
    }
  }, []);

  /* ── totals ── */
  const subtotal = cart.reduce((s, r) => s + r.total, 0);
  const discAmt  = discountType === 'pct'
    ? subtotal * Math.min(parseFloat(discInput) || 0, 100) / 100
    : Math.min(parseFloat(discInput) || 0, subtotal);
  const total    = Math.max(0, subtotal - discAmt);
  const paid   = parseFloat(amountPaid) || 0;
  const change = paid - total;

  /* ── product search results ── */
  const q = search.trim().toLowerCase();
  const filtered = q.length >= 1
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku     && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      ).slice(0, 8)
    : [];

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'F10') { e.preventDefault(); handleComplete(); }
        return;
      }
      if (e.key === 'F1')  { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F2')  { e.preventDefault(); setPayMethod('cash'); paidRef.current?.focus(); }
      if (e.key === 'F3')  { e.preventDefault(); setPayMethod('card'); }
      if (e.key === 'F10') { e.preventDefault(); handleComplete(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, customer, payMethod, amountPaid, total]);

  /* ── close customer dropdown on outside click ── */
  useEffect(() => {
    const h = e => { if (custRef.current && !custRef.current.contains(e.target)) setCustOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── add to cart ── */
  function addProduct(p) {
    const basePrice = priceMode === 'wholesale' && p.wholesale_price
      ? parseFloat(p.wholesale_price)
      : parseFloat(p.selling_price || 0);
    const price = Math.round(basePrice * 1.10 * 100) / 100;

    setCart(prev => {
      const idx = prev.findIndex(r => r.product_id === p.id && r.unit_price === price);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1, total: (updated[idx].qty + 1) * updated[idx].unit_price };
        return updated;
      }
      return [...prev, {
        product_id:   p.id,
        product_name: p.name,
        unit_price:   price,
        cost_price:   parseFloat(p.cost_price || 0),
        qty:          1,
        discount:     0,
        total:        price,
        _img:         p.image_url,
      }];
    });
    setSearch('');
    searchRef.current?.focus();
  }

  function updateQty(idx, val) {
    setCart(prev => {
      const c = [...prev];
      const qty = parseFloat(val) || 0;
      if (qty <= 0) { c.splice(idx, 1); return c; }
      c[idx] = { ...c[idx], qty, total: qty * c[idx].unit_price };
      return c;
    });
  }

  function updatePrice(idx, val) {
    setCart(prev => {
      const c = [...prev];
      const price = parseFloat(val) || 0;
      c[idx] = { ...c[idx], unit_price: price, total: c[idx].qty * price };
      return c;
    });
  }

  function removeItem(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  /* ── search enter → add first result ── */
  function handleSearchKey(e) {
    if (e.key === 'Enter' && filtered.length > 0) { addProduct(filtered[0]); }
    if (e.key === 'Escape') { setSearch(''); }
  }

  /* ── discount quick buttons ── */
  function applyDiscPct(pct) {
    setDiscountType('pct');
    setDiscInput(String(pct));
  }

  /* ── complete sale ── */
  async function handleComplete() {
    setError('');
    if (cart.length === 0) { setError('Cart is empty'); return; }

    const payments = [{ method: payMethod, amount: parseFloat(amountPaid) || total, reference: null }];

    const payload = {
      customer_id: customer?.id || null,
      items: cart.map(r => ({
        product_id:   r.product_id,
        product_name: r.product_name,
        unit_price:   r.unit_price,
        cost_price:   r.cost_price,
        qty:          r.qty,
        discount:     r.discount,
        total:        r.total,
      })),
      payments,
      subtotal,
      discount: discAmt,
      total,
      status: 'completed',
      notes: null,
    };

    try {
      const result = await createPosSale(payload).unwrap();
      navigate(`/pos/${result.id}?print=1`);
    } catch (e) {
      setError(e?.data?.error || 'Failed to complete sale');
    }
  }

  /* ── filtered customers ── */
  const filtCust = custSearch.trim()
    ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.phone||'').includes(custSearch))
    : customers;

  /* ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAdded={c => { setCustomer(c); setShowQuickAdd(false); }}
          onSave={async ({ name, phone }) => {
            const res = await quickAddCustomer({ name, phone }).unwrap();
            setCustomer(res);
            setShowQuickAdd(false);
          }}
        />
      )}

      {/* ── Top bar ── */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pos')} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-white font-bold text-base">New Sale</span>
        </div>
        {/* shortcut hints */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {[['F1','Search'],['F2','Cash'],['F3','Card'],['F10','Complete']].map(([k,l]) => (
            <span key={k} className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded text-slate-300">
              <kbd className="font-mono text-orange-400">{k}</kbd><span>{l}</span>
            </span>
          ))}
        </div>
        {/* Day End / Return */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71M17.66 17.66l-.71-.71M6.34 6.34l-.71-.71"/></svg>
            Day End Report
          </button>
        </div>
      </header>

      {/* ── Main two-panel layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ LEFT: product search + cart ══ */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-slate-700">

          {/* Search bar */}
          <div className="shrink-0 p-3 bg-slate-800 border-b border-slate-700 flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search product (F1)"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {/* search dropdown */}
              {filtered.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-72 overflow-y-auto">
                  {filtered.map(p => (
                    <button key={p.id} type="button" onMouseDown={() => addProduct(p)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-orange-50 text-left transition-colors border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-800 text-sm">{p.name}
                        {p.sku && <span className="ml-1.5 text-xs text-slate-400">({p.sku})</span>}
                      </span>
                      <span className="text-sm font-bold text-orange-600 shrink-0">Rs. {fmt(p.selling_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* price mode */}
            <div className="flex gap-1 bg-slate-700 rounded-xl p-1">
              {['retail','wholesale','custom'].map(m => (
                <button key={m} type="button" onClick={() => setPriceMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${priceMode===m ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {m === 'retail' ? '🛍 Retail' : m === 'wholesale' ? '🏷 Wholesale' : '+ Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                <svg className="w-14 h-14 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <div className="text-center">
                  <p className="font-semibold text-slate-400">Cart is empty</p>
                  <p className="text-xs text-slate-500 mt-1">Search and add products</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-2 py-2 text-center w-24">Qty</th>
                    <th className="px-2 py-2 text-right w-28">Price</th>
                    <th className="px-2 py-2 text-right w-28">Total</th>
                    <th className="w-8"/>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-2">
                        <p className="text-white font-medium leading-tight">{row.product_name}</p>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="0.001" step="0.001" value={row.qty}
                          onChange={e => updateQty(idx, e.target.value)}
                          onFocus={e => e.target.select()}
                          className="w-20 text-center bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                      </td>
                      <td className="px-2 py-2">
                        {priceMode === 'custom' ? (
                          <input type="number" min="0" step="0.01" value={row.unit_price}
                            onChange={e => updatePrice(idx, e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-24 text-right bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                        ) : (
                          <span className="text-slate-300 block text-right pr-2">{fmt(row.unit_price)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-white">{fmt(row.total)}</td>
                      <td className="pr-2">
                        <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* ══ RIGHT: discount + payment ══ */}
        <div className="w-80 xl:w-96 flex flex-col bg-slate-800 shrink-0 overflow-y-auto">

          {/* Discount */}
          <div className="p-3 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-400 font-bold text-sm">Discount</span>
              <div className="flex flex-1 gap-1">
                <input type="number" min="0" value={discInput} onChange={e => setDiscInput(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-16 text-center bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                {/* toggle */}
                <button onClick={() => setDiscountType(t => t === 'pct' ? 'rs' : 'pct')}
                  className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm font-bold hover:bg-slate-600 transition-colors">
                  {discountType === 'pct' ? '%' : 'Rs'}
                </button>
              </div>
              {/* quick pct buttons */}
              <div className="flex gap-1">
                {[0,5,10,15].map(p => (
                  <button key={p} type="button" onClick={() => applyDiscPct(p)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${parseFloat(discInput)===p && discountType==='pct' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {p === 0 ? '0' : `${p}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="p-3 border-b border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key:'cash', label:'Cash', kbd:'F2', icon:'💵' },
                { key:'card', label:'Card', kbd:'F3', icon:'💳' },
              ].map(m => (
                <button key={m.key} type="button" onClick={() => setPayMethod(m.key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl font-semibold text-sm border transition-all ${
                    payMethod === m.key
                      ? 'bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/30'
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                  }`}>
                  <span className="text-xl">{m.icon}</span>
                  <span>{m.label} <span className="text-[10px] opacity-70">[{m.kbd}]</span></span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid */}
          <div className="p-3 border-b border-slate-700">
            {/* Customer */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</p>
              <button type="button" onClick={() => setShowQuickAdd(true)}
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Quick Add Customer
              </button>
            </div>
            <div ref={custRef} className="relative mb-3">
              {customer ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-900/40 border border-orange-700 rounded-xl">
                  <span className="flex-1 text-orange-200 text-sm font-semibold truncate">{customer.name}</span>
                  <button onClick={() => setCustomer(null)} className="text-orange-400 hover:text-orange-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <>
                  <input value={custSearch} onChange={e => { setCustSearch(e.target.value); setCustOpen(true); }}
                    onFocus={() => setCustOpen(true)} placeholder="Select Customer"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                  {custOpen && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-44 overflow-y-auto">
                      <button type="button" onMouseDown={() => { setCustomer(null); setCustSearch(''); setCustOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100">— Walk-in Customer —</button>
                      {filtCust.slice(0,20).map(c => (
                        <button key={c.id} type="button" onMouseDown={() => { setCustomer(c); setCustSearch(''); setCustOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors border-b border-slate-50">
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="ml-2 text-xs text-slate-400">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Grand total */}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Grand Total (Rs.)</p>
            <div className="bg-black rounded-xl flex items-center justify-center py-4 mb-3">
              <span className="text-4xl font-black text-white tracking-tight">{fmt(total)}</span>
            </div>

            {/* Amount paid input */}
            {(
              <>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Amount Paid</p>
                <input ref={paidRef} type="number" min="0" step="0.01" value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)} onFocus={e => e.target.select()}
                  placeholder={fmt(total)}
                  className="w-full bg-green-900/30 border-2 border-green-600 rounded-xl px-4 py-3 text-green-300 text-2xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-green-400 mb-2"/>
                {/* change */}
                {amountPaid && (
                  <div className={`flex justify-between items-center text-sm font-bold px-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>Change</span>
                    <span>Rs. {fmt(Math.abs(change))} {change < 0 ? '(short)' : ''}</span>
                  </div>
                )}
                {/* Quick denominations */}
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {[100,500,1000,2000,5000].map(d => (
                    <button key={d} type="button" onClick={() => setAmountPaid(String(d))}
                      className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-600">
                      {d >= 1000 ? `${d/1000}K` : d}
                    </button>
                  ))}
                </div>
                {/* Exact */}
                <button type="button" onClick={() => setAmountPaid(String(total.toFixed(2)))}
                  className="mt-1 w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs rounded-lg border border-slate-600 transition-colors">
                  Exact Amount
                </button>
              </>
            )}

          </div>

          {/* Error */}
          {error && <p className="mx-3 mt-2 text-xs text-red-400 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">{error}</p>}

          {/* Action buttons */}
          <div className="p-3 mt-auto space-y-2">
            <button type="button" onClick={handleComplete} disabled={submitting || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-base transition-colors shadow-lg shadow-orange-500/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm1-4h4v4H9v-4z"/></svg>
              {submitting ? 'Processing…' : 'Print Bill & Complete Sale'} <span className="text-orange-300 text-sm">[F10]</span>
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setCart([]); setCustomer(null); setAmountPaid(''); setDiscInput('0'); setError(''); }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-xl border border-slate-600 transition-colors">
                Hold
              </button>
              <button type="button" onClick={() => navigate('/pos')}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-xl border border-slate-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
