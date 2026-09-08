import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetSaleQuery, useReturnSaleMutation } from '../../features/sales/salesApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectRole } from '../../features/auth/authSlice';
import { useLocale } from '../../contexts/LocaleContext';
import { getApiUrl } from '../../config/runtimeConfig';

const API = getApiUrl();

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = s => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtInvDate = s => { const d = new Date(s); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; };

// Amount in words (English, up to billions)
function numToWords(n) {
  const ones  = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                  'Seventeen','Eighteen','Nineteen'];
  const tens  = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function conv(num) {
    if (num === 0) return '';
    if (num < 20)  return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '') + ' ';
    return ones[Math.floor(num/100)] + ' Hundred ' + conv(num%100);
  }
  const intPart = Math.floor(n);
  const cents   = Math.round((n - intPart) * 100);
  let words = '';
  if (intPart >= 1e9)  { words += conv(Math.floor(intPart/1e9)) + 'Billion ';  }
  if (intPart >= 1e6)  { words += conv(Math.floor((intPart%1e9)/1e6)) + 'Million '; }
  if (intPart >= 1e3)  { words += conv(Math.floor((intPart%1e6)/1e3)) + 'Thousand '; }
  words += conv(intPart % 1e3);
  words = words.trim();
  if (cents > 0) words += ` and ${cents}/100`;
  return (words || 'Zero') + ' Only';
}

const IcoBack    = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>;
const IcoReturn  = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/></svg>;
const IcoPlus    = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>;
const IcoPrint   = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm1-4h4v4H9v-4z"/></svg>;
const IcoSpinner = <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>;

export default function SaleShow() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const role     = useSelector(selectRole);
  const user     = useSelector(selectCurrentUser);
  const { t }    = useLocale();

  const { data: sale, isLoading, refetch } = useGetSaleQuery(id);
  const [returnSale, { isLoading: returning }] = useReturnSaleMutation();

  const [returnModal,  setReturnModal]  = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnItems,  setReturnItems]  = useState([]);
  const [shopInfo,     setShopInfo]     = useState({});
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings/public`)
      .then(r => r.json())
      .then(setShopInfo)
      .catch(() => {});
  }, []);

  function openReturn() {
    setReturnItems((sale.items || []).map(i => ({ ...i, return_qty: 0 })));
    setReturnReason('');
    setReturnModal(true);
  }

  async function handleReturn(e) {
    e.preventDefault();
    const items = returnItems.filter(i => parseFloat(i.return_qty) > 0);
    if (!items.length) return;
    await returnSale({ id, reason: returnReason, items }).unwrap();
    setReturnModal(false);
    navigate('/sales');
  }

  async function handlePrint() {
    if (!sale || printing) return;
    setPrinting(true);
    const html = buildInvoiceHtml();
    try {
      const win = window.open('', '_blank', 'width=820,height=1060,scrollbars=yes');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.onload = () => { win.focus(); win.print(); };
      }
    } catch (err) {
      alert('Print error: ' + err.message);
    } finally {
      setPrinting(false);
    }
  }

  // ─── Shared helpers ─────────────────────────────────────────────────────────
  function paymentSummary() {
    const payments = sale?.payments || [];
    return {
      cash:   payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      card:   payments.filter(p => p.method === 'card').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      bank:   payments.filter(p => p.method === 'bank_transfer').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      credit: payments.filter(p => p.method === 'credit').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
    };
  }

  // ─── Sales Invoice (Messenger Hardware style) ───────────────────────────────
  function buildInvoiceHtml() {
    const items    = sale.items || [];
    const total    = parseFloat(sale.total    || 0);
    const discount = parseFloat(sale.discount || 0);
    const subtotal = parseFloat(sale.subtotal || total);
    const amtWords = numToWords(total);
    const pay      = paymentSummary();
    const minRows  = 17;

    const itemRows = items.map((item, i) => {
      const qty   = parseFloat(item.qty || 0);
      const price = parseFloat(item.unit_price || 0);
      const disc  = parseFloat(item.discount || 0);
      const amt   = parseFloat(item.total || qty * price - disc);
      return `<tr>
        <td style="text-align:center;border:1px solid #e0e0e0;padding:2px 4px">${i+1}</td>
        <td style="border:1px solid #e0e0e0;padding:2px 6px">${item.product_name || '—'}</td>
        <td style="text-align:right;border:1px solid #e0e0e0;padding:2px 4px">${qty % 1 === 0 ? qty.toFixed(2) : qty.toFixed(3)}</td>
        <td style="text-align:center;border:1px solid #e0e0e0;padding:2px 4px">${item.unit || 'NOS'}</td>
        <td style="text-align:right;border:1px solid #e0e0e0;padding:2px 4px">${fmt(price)}</td>
        <td style="text-align:center;border:1px solid #e0e0e0;padding:2px 4px">0.00 %</td>
        <td style="text-align:right;border:1px solid #e0e0e0;padding:2px 4px">${fmt(disc)}</td>
        <td style="text-align:right;border:1px solid #e0e0e0;padding:2px 4px;font-weight:600">${fmt(amt)}</td>
      </tr>`;
    }).join('');

    const blankRows = Array.from({ length: Math.max(0, minRows - items.length) }, () =>
      `<tr>${Array(8).fill('<td style="border:1px solid #e0e0e0;height:7mm">&nbsp;</td>').join('')}</tr>`
    ).join('');

    const payNote = [
      pay.cash   > 0 ? `Cash Rs. ${fmt(pay.cash)}` : '',
      pay.bank   > 0 ? `Bank Transfer Rs. ${fmt(pay.bank)}` : '',
      pay.credit > 0 ? `Credit Rs. ${fmt(pay.credit)}` : '',
    ].filter(Boolean).join('  |  ');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Sales Invoice — ${sale.invoice_no}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:9.5pt;color:#000;background:#fff}
  .page{padding:10mm 12mm;min-height:277mm}
  /* Header */
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2mm;border:1px solid #999;padding:3mm 4mm}
  .hdr-left{display:flex;flex-direction:column;gap:1mm}
  .co{font-size:16pt;font-weight:900;letter-spacing:0.5px}
  .hdr-right{text-align:right;font-size:8pt;line-height:1.7;max-width:48%}
  .tagline{font-size:8pt;font-weight:700;line-height:1.5}
  /* Title bar */
  .title-bar{text-align:center;font-size:11pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;
             padding:2mm 0;margin-bottom:3mm}
  /* Table */
  table{width:100%;border-collapse:collapse;font-size:9pt}
  thead th{background:#000;color:#fff;padding:3px 5px;border:1px solid #000;font-size:8.5pt}
  /* Footer */
  .footer-area{display:flex;justify-content:space-between;align-items:flex-start;margin-top:3mm;gap:6mm}
  .words-col{flex:1;font-size:8.5pt;line-height:1.7}
  .words-amount{font-weight:700;margin-bottom:1mm;text-transform:capitalize}
  .terms{font-size:7.5pt;color:#444;line-height:1.7;margin-top:1mm}
  .tot-tbl{width:66mm;border-collapse:collapse;font-size:9.5pt}
  .tot-tbl td{border:1px solid #e0e0e0;padding:3px 6px}
  .tot-tbl .grand td{background:#000;color:#fff;font-weight:700}
  /* Sigs */
  .sigs{display:flex;justify-content:space-between;margin-top:12mm;font-size:9pt}
  .sig-line{border-top:1px solid #333;width:60mm;margin-bottom:2px}
  @media print{@page{size:A4;margin:0}body{margin:0}}</style>
</head><body><div class="page">

<!-- Header -->
<div class="hdr">
  <div class="hdr-left" style="display:flex;align-items:center;gap:8px">
    ${shopInfo.shop_logo ? `<img src="${shopInfo.shop_logo}" style="height:40px;object-fit:contain">` : ''}
    <div class="co">${shopInfo.shop_name || 'Shakya Enterprises'}</div>
  </div>
  <div class="hdr-right">
    ${shopInfo.tagline ? `<div class="tagline">${shopInfo.tagline}</div>` : ''}
    ${shopInfo.address ? `<div>${shopInfo.address}</div>` : ''}
    ${shopInfo.phone   ? `<div>PHONE : ${shopInfo.phone}</div>` : ''}
  </div>
</div>

<!-- Title -->
<div class="title-bar">SALES INVOICE</div>

<!-- Meta: customer left, invoice details right -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4mm;border:1px solid #999;padding:2mm 3mm">
  <div style="font-size:11pt;font-weight:700;text-transform:uppercase">${sale.customer?.name || 'Walk-in Customer'}</div>
  <table style="font-size:9pt;border-spacing:0 3px">
    <tbody>
      <tr>
        <td style="font-weight:700;white-space:nowrap;padding-right:3px;vertical-align:baseline">Invoice No</td>
        <td style="font-weight:700;padding:0 3px;vertical-align:baseline">:</td>
        <td style="border-bottom:1px solid #888;min-width:44mm;padding-bottom:1px;padding-left:2px;vertical-align:baseline">${sale.invoice_no}</td>
      </tr>
      <tr>
        <td style="font-weight:700;white-space:nowrap;padding-right:3px;vertical-align:baseline">Date</td>
        <td style="font-weight:700;padding:0 3px;vertical-align:baseline">:</td>
        <td style="border-bottom:1px solid #888;min-width:44mm;padding-bottom:1px;padding-left:2px;vertical-align:baseline">${fmtInvDate(sale.created_at)}</td>
      </tr>
      <tr>
        <td style="font-weight:700;white-space:nowrap;padding-right:3px;vertical-align:baseline">PO No</td>
        <td style="font-weight:700;padding:0 3px;vertical-align:baseline">:</td>
        <td style="border-bottom:1px solid #888;min-width:64mm;padding-bottom:1px;vertical-align:baseline">&nbsp;</td>
      </tr>
      <tr>
        <td style="font-weight:700;white-space:nowrap;padding-right:3px;vertical-align:baseline">Narration</td>
        <td style="font-weight:700;padding:0 3px;vertical-align:baseline">:</td>
        <td style="border-bottom:1px solid #888;min-width:64mm;padding-bottom:1px;padding-left:2px;vertical-align:baseline">${sale.notes || ''}&nbsp;</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Items table -->
<table>
  <thead><tr>
    <th style="width:28px;text-align:center">S.N.</th>
    <th style="text-align:left">Description</th>
    <th style="width:55px;text-align:right">Qty.</th>
    <th style="width:36px;text-align:center">Unit</th>
    <th style="width:66px;text-align:right">List Price</th>
    <th style="width:54px;text-align:center">Discount</th>
    <th style="width:50px;text-align:right">Dis Amt</th>
    <th style="width:74px;text-align:right">Amount(Rs.)</th>
  </tr></thead>
  <tbody>${itemRows}${blankRows}</tbody>
</table>

<!-- Footer -->
<div class="footer-area">
  <div class="words-col">
    <div class="words-amount">${amtWords}</div>
    <div class="terms">
      Goods in Good Condition &amp; Correct Quantity Mentioned Above<br>
      Cheque should be in favour of &nbsp;..............&nbsp; A/C payee only<br>
      Returns of goods should be done within 30 days of purchase with the original invoice<br>
      Goods must be in their original state.
    </div>
    ${payNote ? `<div style="margin-top:2mm;font-size:8pt;font-weight:700">${payNote}</div>` : ''}
  </div>
  <table class="tot-tbl">
    <tr><td style="font-weight:700">SUB TOTAL</td><td style="text-align:right">${fmt(subtotal)}</td></tr>
    <tr><td style="font-weight:700">DISCOUNT</td><td style="text-align:right">${discount > 0 ? fmt(discount) : ''}</td></tr>
    <tr class="grand"><td>GRAND TOTAL</td><td style="text-align:right">${fmt(total)}</td></tr>
  </table>
</div>

<!-- Signatures -->
<div class="sigs">
  <div><div class="sig-line"></div><span>By</span></div>
  <div style="text-align:center"><div class="sig-line"></div><span>Received By</span></div>
</div>

</div></body></html>`;
  }

  // ─── Derived values for on-screen display ───────────────────────────────────
  const payments   = sale?.payments || [];
  const paidCash   = payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCard   = payments.filter(p => p.method === 'card').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCredit = payments.filter(p => p.method === 'credit').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidBank   = payments.filter(p => p.method === 'bank_transfer').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const currency   = shopInfo.currency || 'Rs.';
  const roleColor  = { admin: 'bg-red-500', manager: 'bg-orange-500', cashier: 'bg-green-500', sales: 'bg-blue-500' };

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-400 text-sm">{t('lbl.loading')}</div>;
  if (!sale)     return <div className="h-screen flex items-center justify-center text-slate-400 text-sm">Sale not found</div>;

  return (
    <div className="flex flex-col min-h-full bg-slate-100">

      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/sales')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            {IcoBack}
          </button>
          <span className="font-bold text-slate-800 font-mono text-sm">{sale.invoice_no}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
            sale.status === 'returned' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
          }`}>{sale.status}</span>
        </div>
        <div className="flex items-center gap-2">
          {sale.status === 'completed' && (role === 'admin' || role === 'manager') && (
            <button onClick={openReturn}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors">
              {IcoReturn}<span>Return</span>
            </button>
          )}
          <button onClick={() => navigate('/sales/create')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors">
            {IcoPlus}<span>New Order</span>
          </button>
          <button onClick={refetch}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/></svg>
          </button>
          <div className={`w-7 h-7 rounded-full ${roleColor[role] || 'bg-slate-500'} flex items-center justify-center text-white font-bold text-xs`}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* ── Invoice Preview ──────────────────────────────────────────────────── */}
      <div className="flex-1 py-8 px-4 flex justify-center">
        <div className="bg-white shadow-lg border border-slate-200 w-full max-w-3xl"
          style={{ padding: '10mm 12mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', fontSize: '9.5pt', color: '#000' }}>

          {/* Header box */}
          <div className="flex justify-between items-start border border-slate-400 p-3 mb-3">
            <div className="flex items-center gap-2">
              {shopInfo.shop_logo && <img src={shopInfo.shop_logo} alt="logo" className="h-10 object-contain" />}
              <p style={{ fontSize: '16pt', fontWeight: 900, letterSpacing: '0.5px' }}>{shopInfo.shop_name || 'Shakya Enterprises'}</p>
            </div>
            <div className="text-right text-xs leading-relaxed max-w-[48%]">
              {shopInfo.tagline && <p className="font-bold text-[8.5pt] leading-snug mb-1">{shopInfo.tagline}</p>}
              {shopInfo.address && <p>{shopInfo.address}</p>}
              {shopInfo.phone   && <p>PHONE : {shopInfo.phone}</p>}
            </div>
          </div>

          {/* Title */}
          <p className="text-center font-bold tracking-widest uppercase mb-3"
            style={{ fontSize: '11pt', letterSpacing: '2px' }}>SALES INVOICE</p>

          {/* Meta — customer left, invoice details right */}
          <div className="flex justify-between items-start mb-3 gap-4 border border-slate-400 px-3 py-2">
            <p className="font-bold uppercase" style={{ fontSize: '11pt' }}>{sale.customer?.name || 'Walk-in Customer'}</p>
            <table className="text-xs shrink-0" style={{ borderSpacing: '0 2px' }}>
              <tbody>
                {[
                  ['Invoice No', sale.invoice_no],
                  ['Date', fmtInvDate(sale.created_at)],
                  ['PO No', ''],
                  ['Narration', sale.notes || ''],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td className="font-bold whitespace-nowrap pr-1 align-baseline">{label}</td>
                    <td className="font-bold align-baseline px-0.5">:</td>
                    <td className="border-b border-slate-400 min-w-[48mm] pb-0.5 pl-1 align-baseline">{val}&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table */}
          <table className="w-full border-collapse" style={{ fontSize: '9pt' }}>
            <thead>
              <tr style={{ background: '#000', color: '#fff' }}>
                <th className="border border-black px-1 py-1.5 text-center w-7">S.N.</th>
                <th className="border border-black px-2 py-1.5 text-left">Description</th>
                <th className="border border-black px-1 py-1.5 text-right w-14">Qty.</th>
                <th className="border border-black px-1 py-1.5 text-center w-9">Unit</th>
                <th className="border border-black px-2 py-1.5 text-right w-16">List Price</th>
                <th className="border border-black px-1 py-1.5 text-center w-14">Discount</th>
                <th className="border border-black px-2 py-1.5 text-right w-12">Dis Amt</th>
                <th className="border border-black px-2 py-1.5 text-right w-20">Amount(Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {(sale.items || []).map((item, i) => {
                const qty = parseFloat(item.qty || 0), price = parseFloat(item.unit_price || 0), disc = parseFloat(item.discount || 0);
                return (
                  <tr key={item.id}>
                    <td className="border border-slate-200 px-1 py-1 text-center text-slate-500">{i+1}</td>
                    <td className="border border-slate-200 px-2 py-1">{item.product_name}</td>
                    <td className="border border-slate-200 px-1 py-1 text-right">{qty % 1 === 0 ? qty.toFixed(2) : qty.toFixed(3)}</td>
                    <td className="border border-slate-200 px-1 py-1 text-center">{item.unit || 'NOS'}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right">{fmt(price)}</td>
                    <td className="border border-slate-200 px-1 py-1 text-center">0.00 %</td>
                    <td className="border border-slate-200 px-2 py-1 text-right">{fmt(disc)}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right font-semibold">{fmt(parseFloat(item.total || qty * price - disc))}</td>
                  </tr>
                );
              })}
              {Array.from({ length: Math.max(0, 12 - (sale.items || []).length) }).map((_, i) => (
                <tr key={`b${i}`}>
                  {[...Array(8)].map((__, j) => <td key={j} className="border border-slate-200 py-1">&nbsp;</td>)}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex justify-between items-start mt-3 gap-4">
            <div className="flex-1 text-xs leading-relaxed">
              <p className="font-bold capitalize">{numToWords(parseFloat(sale.total || 0))}</p>
              <p className="text-slate-500 mt-1">Goods in Good Condition &amp; Correct Quantity Mentioned Above</p>
              <p className="text-slate-500">Cheque should be in favour of &nbsp;..............&nbsp; A/C payee only</p>
              <p className="text-slate-500">Returns of goods should be done within 30 days of purchase with the original invoice</p>
              <p className="text-slate-500">Goods must be in their original state.</p>
              {(paidCash > 0 || paidBank > 0 || paidCredit > 0) && (
                <p className="mt-1 font-bold">
                  {paidCash   > 0 && `Cash Rs. ${fmt(paidCash)}`}
                  {paidBank   > 0 && `  Bank Transfer Rs. ${fmt(paidBank)}`}
                  {paidCredit > 0 && <span className="text-red-600">  Credit Rs. {fmt(paidCredit)}</span>}
                </p>
              )}
            </div>
            <table className="border-collapse text-xs" style={{ width: '66mm' }}>
              <tbody>
                <tr><td className="border border-slate-200 px-2 py-1 font-bold">SUB TOTAL</td><td className="border border-slate-200 px-2 py-1 text-right">{fmt(sale.subtotal || sale.total)}</td></tr>
                <tr><td className="border border-slate-200 px-2 py-1 font-bold">DISCOUNT</td><td className="border border-slate-200 px-2 py-1 text-right">{parseFloat(sale.discount || 0) > 0 ? fmt(sale.discount) : ''}</td></tr>
                <tr style={{ background: '#000', color: '#fff' }}>
                  <td className="border border-black px-2 py-1 font-bold">GRAND TOTAL</td>
                  <td className="border border-black px-2 py-1 text-right font-bold">{fmt(sale.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="flex justify-between mt-10 text-xs">
            <div><div className="border-t border-slate-400 w-44 mb-1" /><span>By</span></div>
            <div className="text-center"><div className="border-t border-slate-400 w-44 mb-1" /><span>Received By</span></div>
          </div>
        </div>
      </div>

      {/* Print FAB */}
      <button onClick={handlePrint} disabled={printing}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-60 transition-all shadow-lg shadow-orange-500/40">
        {printing ? IcoSpinner : IcoPrint}
        <span>{printing ? 'Preparing…' : 'Print Invoice'}</span>
      </button>

      {/* Return modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Return Items</h2>
              <span className="font-mono text-xs text-slate-400">{sale.invoice_no}</span>
            </div>
            <form onSubmit={handleReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason for return</label>
                <input value={returnReason} onChange={e => setReturnReason(e.target.value)} required
                  placeholder="Enter reason..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select items to return</label>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Product</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Ordered</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Return Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {returnItems.map((item, i) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-slate-700">{item.product_name}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{item.qty}</td>
                          <td className="px-3 py-2 text-right">
                            <input type="number" min="0" max={item.qty} step="0.001"
                              value={item.return_qty}
                              onChange={e => setReturnItems(ri => ri.map((r, idx) => idx === i ? { ...r, return_qty: e.target.value } : r))}
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-orange-400" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setReturnModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={returning}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-red-700">
                  {returning ? 'Processing…' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
