import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGetPosSaleQuery } from '../../features/pos/posApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectRole } from '../../features/auth/authSlice';
import { getApiUrl } from '../../config/runtimeConfig';

const API = getApiUrl();
const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => { const d = new Date(s); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; };
const fmtTime = s => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });

const IcoBack    = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>;
const IcoPlus    = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>;
const IcoPrint   = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm1-4h4v4H9v-4z"/></svg>;
const IcoSpinner = <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>;

const METHOD_COLOR = { cash: 'bg-green-100 text-green-700', card: 'bg-blue-100 text-blue-700', credit: 'bg-red-100 text-red-600', qr: 'bg-purple-100 text-purple-700', bank_transfer: 'bg-yellow-100 text-yellow-700' };

export default function PosShow() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get('print') === '1';
  const role = useSelector(selectRole);
  const user = useSelector(selectCurrentUser);

  const { data: sale, isLoading, refetch } = useGetPosSaleQuery(id);
  const [shopInfo,  setShopInfo]  = useState({});
  const [printing,  setPrinting]  = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings/public`).then(r => r.json()).then(setShopInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (autoPrint && sale && shopInfo?.shop_name !== undefined) handleReceipt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, sale?.id, shopInfo?.shop_name]);

  const payments   = sale?.payments || [];
  const paidCash   = payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const total      = parseFloat(sale?.total || 0);
  const change     = paidCash > 0 ? paidCash - total : 0;
  const roleColor  = { admin: 'bg-red-500', manager: 'bg-orange-500', cashier: 'bg-green-500', sales: 'bg-blue-500' };

  function buildReceiptHtml() {
    const items    = sale.items || [];
    const discount = parseFloat(sale.discount || 0);
    const subtotal = parseFloat(sale.subtotal || total);

    const itemLines = items.map(item => {
      const qty   = parseFloat(item.qty || 0);
      const price = parseFloat(item.unit_price || 0);
      const iTotal= parseFloat(item.total || qty * price);
      return `<tr>
        <td colspan="3" style="padding:2px 0 0 0;font-weight:600">${item.product_name}</td>
      </tr><tr>
        <td style="padding:0 0 4px 0;color:#666">${qty%1===0?qty.toFixed(0):qty.toFixed(2)} x ${fmt(price)}</td>
        <td></td>
        <td style="text-align:right;padding:0 0 4px 0;font-weight:700;white-space:nowrap">${fmt(iTotal)}</td>
      </tr>`;
    }).join('');

    const payLines = payments.map(p =>
      `<tr><td style="padding:2px 0;text-transform:capitalize">${p.method.replace('_',' ')}</td><td style="text-align:right;font-weight:600">Rs. ${fmt(p.amount)}</td></tr>`
    ).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Receipt — ${sale.invoice_no}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;font-size:11pt;width:80mm;margin:0 auto;padding:5mm 3mm;color:#000;background:#fff}
.center{text-align:center}.bold{font-weight:700}
.sep{border:none;border-top:1px dashed #555;margin:3mm 0}
table{width:100%;border-collapse:collapse;font-size:10pt}
@media print{@page{size:80mm auto;margin:0}body{margin:2mm;padding:2mm}}</style>
</head><body>
<div class="center">
  ${shopInfo.shop_logo ? `<img src="${shopInfo.shop_logo}" style="height:60px;object-fit:contain;margin-bottom:3mm"><br>` : ''}
  <div class="bold" style="font-size:14pt">${shopInfo.shop_name || 'Sakya Enterprises'}</div>
  ${shopInfo.address ? `<div style="font-size:9pt">${shopInfo.address}</div>` : ''}
  ${shopInfo.phone ? `<div style="font-size:9pt">Tel: ${shopInfo.phone}</div>` : ''}
</div>
<hr class="sep">
<table><tbody>
  <tr><td>Invoice No</td><td style="text-align:right;font-weight:700">${sale.invoice_no}</td></tr>
  <tr><td>Date</td><td style="text-align:right">${fmtDate(sale.created_at)} ${fmtTime(sale.created_at)}</td></tr>
  ${sale.customer?.name ? `<tr><td>Customer</td><td style="text-align:right">${sale.customer.name}</td></tr>` : ''}
</tbody></table>
<hr class="sep">
<table><thead>
  <tr style="border-bottom:1px solid #555"><th style="text-align:left;padding-bottom:2px">Item</th><th style="text-align:right;padding-bottom:2px">Qty×Price</th><th style="text-align:right;padding-bottom:2px">Total</th></tr>
</thead><tbody style="border-top:1px solid #555">${itemLines}</tbody></table>
<hr class="sep">
<table><tbody>
  <tr><td>Sub Total</td><td style="text-align:right">Rs. ${fmt(subtotal)}</td></tr>
  ${discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">- Rs. ${fmt(discount)}</td></tr>` : ''}
  <tr><td class="bold" style="font-size:13pt;padding-top:2px">TOTAL</td><td style="text-align:right;font-weight:900;font-size:13pt;padding-top:2px">Rs. ${fmt(total)}</td></tr>
</tbody></table>
<hr class="sep">
<table><tbody>${payLines}${paidCash>0&&change>0?`<tr><td>Change</td><td style="text-align:right">Rs. ${fmt(change)}</td></tr>`:''}</tbody></table>
<hr class="sep">
<div class="center" style="font-size:9pt;line-height:1.8">
  Thank you for your purchase!<br>Please keep this receipt.<br>
  Returns within 30 days with receipt.
</div>
</body></html>`;
  }

  async function handleReceipt() {
    if (!sale || printing) return;
    setPrinting(true);
    try {
      const win = window.open('', '_blank', 'width=340,height=620,scrollbars=yes');
      if (win) { win.document.write(buildReceiptHtml()); win.document.close(); win.onload = () => { win.focus(); win.print(); }; }
    } finally { setPrinting(false); }
  }

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  if (!sale)     return <div className="h-screen flex items-center justify-center text-slate-400 text-sm">Sale not found</div>;

  return (
    <div className="min-h-full bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 py-2.5 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/pos')} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">{IcoBack}</button>
          <span className="font-bold text-slate-800 font-mono text-sm">{sale.invoice_no}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${sale.status === 'returned' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{sale.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/pos/create')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors">
            {IcoPlus}<span>New Sale</span>
          </button>
          <button onClick={refetch} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/></svg>
          </button>
          <div className={`w-7 h-7 rounded-full ${roleColor[role] || 'bg-slate-500'} flex items-center justify-center text-white font-bold text-xs`}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      <div className="py-6 px-4 flex justify-center gap-6 flex-wrap lg:flex-nowrap">

        {/* ── Receipt preview (thermal style) ── */}
        <div className="w-full max-w-xs shrink-0">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
            {/* top teeth */}
            <div className="h-3 bg-slate-100" style={{ backgroundImage: 'radial-gradient(circle at 8px -2px, transparent 10px, #f1f5f9 10px)', backgroundSize: '16px 12px', backgroundRepeat: 'repeat-x' }}/>
            <div className="px-5 py-4 font-mono text-xs text-slate-800">
              {/* shop header */}
              <div className="text-center mb-3">
                {shopInfo.shop_logo && <img src={shopInfo.shop_logo} alt="" className="h-16 object-contain mx-auto mb-2"/>}
                <p className="font-black text-sm">{shopInfo.shop_name || 'Sakya Enterprises'}</p>
                {shopInfo.address && <p className="text-[10px] text-slate-500">{shopInfo.address}</p>}
                {shopInfo.phone   && <p className="text-[10px] text-slate-500">Tel: {shopInfo.phone}</p>}
              </div>
              <div className="border-t border-dashed border-slate-300 my-2"/>
              {/* invoice info */}
              <div className="space-y-0.5">
                <div className="flex justify-between"><span className="text-slate-500">Invoice</span><span className="font-bold">{sale.invoice_no}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{fmtDate(sale.created_at)} {fmtTime(sale.created_at)}</span></div>
                {sale.customer?.name && <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="truncate max-w-[120px] text-right">{sale.customer.name}</span></div>}
              </div>
              <div className="border-t border-dashed border-slate-300 my-2"/>
              {/* items */}
              <div className="space-y-1">
                {(sale.items || []).map((item, i) => {
                  const qty = parseFloat(item.qty || 0), price = parseFloat(item.unit_price || 0);
                  return (
                    <div key={i} className="border-b border-slate-100 pb-1 last:border-0">
                      <p className="leading-tight font-medium">{item.product_name}</p>
                      <div className="flex justify-between text-slate-500 mt-0.5">
                        <span>{qty%1===0?qty.toFixed(0):qty.toFixed(2)} × {fmt(price)}</span>
                        <span className="font-bold text-slate-800">{fmt(parseFloat(item.total||qty*price))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-dashed border-slate-300 my-2"/>
              {/* totals */}
              <div className="space-y-0.5">
                <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span>Rs. {fmt(sale.subtotal || total)}</span></div>
                {parseFloat(sale.discount||0) > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>- Rs. {fmt(sale.discount)}</span></div>}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200"><span>TOTAL</span><span>Rs. {fmt(total)}</span></div>
              </div>
              <div className="border-t border-dashed border-slate-300 my-2"/>
              {/* payments */}
              <div className="space-y-0.5">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-500 capitalize">{p.method.replace('_',' ')}</span>
                    <span className="font-semibold">Rs. {fmt(p.amount)}</span>
                  </div>
                ))}
                {paidCash > 0 && change > 0 && (
                  <div className="flex justify-between text-green-600"><span>Change</span><span>Rs. {fmt(change)}</span></div>
                )}
              </div>
              <div className="border-t border-dashed border-slate-300 my-2"/>
              <p className="text-center text-[10px] text-slate-400 leading-relaxed">Thank you for your purchase!<br/>Returns within 30 days with receipt.</p>
            </div>
            {/* bottom teeth */}
            <div className="h-3 bg-slate-100" style={{ backgroundImage: 'radial-gradient(circle at 8px 14px, transparent 10px, #f1f5f9 10px)', backgroundSize: '16px 12px', backgroundRepeat: 'repeat-x' }}/>
          </div>

          {/* Print button */}
          <button onClick={handleReceipt} disabled={printing}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-60 transition-colors shadow-lg shadow-orange-500/30">
            {printing ? IcoSpinner : IcoPrint}
            {printing ? 'Preparing…' : 'Print Receipt'}
          </button>
        </div>

        {/* ── Sale details panel ── */}
        <div className="flex-1 min-w-0 space-y-4 max-w-lg">
          {/* summary card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sale Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Customer</p>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{sale.customer?.name || 'Walk-in'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Cashier</p>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{sale.user?.name || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Date &amp; Time</p>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{fmtDate(sale.created_at)}</p>
                <p className="text-xs text-slate-400">{fmtTime(sale.created_at)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Status</p>
                <span className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full uppercase ${sale.status==='returned'?'bg-red-100 text-red-600':'bg-green-100 text-green-700'}`}>{sale.status}</span>
              </div>
            </div>
            {sale.notes && <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl p-3">{sale.notes}</p>}
          </div>

          {/* payment breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Payment</h2>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${METHOD_COLOR[p.method]||'bg-slate-100 text-slate-600'}`}>{p.method.replace('_',' ')}</span>
                  <span className="font-bold text-slate-800">Rs. {fmt(p.amount)}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-base">
                <span>Total</span><span className="text-orange-600">Rs. {fmt(total)}</span>
              </div>
              {paidCash > 0 && change > 0 && (
                <div className="flex justify-between text-green-600 text-sm font-semibold">
                  <span>Change returned</span><span>Rs. {fmt(change)}</span>
                </div>
              )}
            </div>
          </div>

          {/* items */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-5 py-3 border-b border-slate-100">Items ({(sale.items||[]).length})</h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items||[]).map((item, i) => {
                  const qty = parseFloat(item.qty||0), price = parseFloat(item.unit_price||0);
                  return (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{item.product_name}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{qty%1===0?qty.toFixed(0):qty.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-slate-600">Rs. {fmt(price)}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800">Rs. {fmt(parseFloat(item.total||qty*price))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
