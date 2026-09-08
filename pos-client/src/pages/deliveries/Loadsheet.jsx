import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetLoadsheetQuery } from '../../features/deliveries/deliveriesApi';

const STATUS_BADGE = {
  pending:    'bg-yellow-100 text-yellow-700',
  loaded:     'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  returned:   'bg-red-100 text-red-700',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

export default function Loadsheet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(today());

  const ids = searchParams.get('ids');
  const queryParams = ids ? { ids } : { date };
  const { data: deliveries = [], isLoading, isFetching } = useGetLoadsheetQuery(queryParams);

  function handleDateChange(d) {
    setDate(d);
    setSearchParams({});  // clear ids filter when switching to date mode
  }

  // Group by area
  const groups = deliveries.reduce((acc, d) => {
    const key = d.area?.name || 'No Area';
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const totalItems = deliveries.reduce((s, d) => s + (d.sale?.items?.length || 0), 0);
  const totalValue = deliveries.reduce((s, d) => s + parseFloat(d.sale?.total || 0), 0);

  function handlePrint() {
    const rows = deliveries.map(d => {
      const customer = d.sale?.customer;
      const items = d.sale?.items || [];
      const itemRows = items.map(it =>
        `<tr>
          <td style="padding:3px 8px;border:1px solid #ddd;">${it.product_name || '—'}</td>
          <td style="padding:3px 8px;border:1px solid #ddd;text-align:center;">${it.qty}</td>
          <td style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Rs. ${fmt(it.unit_price)}</td>
          <td style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Rs. ${fmt(it.total)}</td>
        </tr>`
      ).join('');
      return `
        <div style="margin-bottom:18px;page-break-inside:avoid;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px;">
            <tr style="background:#f1f5f9;">
              <td style="padding:5px 8px;font-weight:700;">${d.sale?.invoice_no || `#${d.id}`}</td>
              <td style="padding:5px 8px;">${customer?.name || 'Walk-in'}</td>
              <td style="padding:5px 8px;">${customer?.phone || ''}</td>
              <td style="padding:5px 8px;">Driver: ${d.driver_name || '—'}</td>
              <td style="padding:5px 8px;text-align:right;">
                <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;">
                  ${(d.status || '').replace('_', ' ').toUpperCase()}
                </span>
              </td>
            </tr>
          </table>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:left;">Product</th>
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:center;">Qty</th>
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Unit Price</th>
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding:4px 8px;border:1px solid #ddd;text-align:right;font-weight:700;">Invoice Total</td>
                <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;font-weight:700;">Rs. ${fmt(d.sale?.total)}</td>
              </tr>
            </tfoot>
          </table>
          ${d.sale?.notes ? `<p style="font-size:10px;color:#64748b;margin-top:3px;">Note: ${d.sale.notes}</p>` : ''}
        </div>`;
    });

    const groupHtml = Object.entries(groups).map(([area, areaDeliveries]) => `
      <div style="margin-bottom:8px;">
        <h3 style="font-size:13px;font-weight:700;background:#1e293b;color:#fff;padding:5px 10px;border-radius:4px;margin-bottom:8px;">${area}</h3>
        ${areaDeliveries.map(d => {
          const customer = d.sale?.customer;
          const items = d.sale?.items || [];
          const itemRows = items.map(it =>
            `<tr>
              <td style="padding:3px 8px;border:1px solid #ddd;">${it.product_name || '—'}</td>
              <td style="padding:3px 8px;border:1px solid #ddd;text-align:center;">${it.qty}</td>
              <td style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Rs. ${fmt(it.unit_price)}</td>
              <td style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Rs. ${fmt(it.total)}</td>
            </tr>`
          ).join('');
          return `
          <div style="margin-bottom:14px;page-break-inside:avoid;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px;">
              <tr style="background:#f1f5f9;">
                <td style="padding:5px 8px;font-weight:700;">${d.sale?.invoice_no || `#${d.id}`}</td>
                <td style="padding:5px 8px;">${customer?.name || 'Walk-in'}</td>
                <td style="padding:5px 8px;">${customer?.phone || ''}</td>
                <td style="padding:5px 8px;">Driver: ${d.driver_name || '—'}</td>
                <td style="padding:5px 8px;text-align:right;font-size:10px;font-weight:700;">${(d.status || '').replace('_', ' ').toUpperCase()}</td>
              </tr>
            </table>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead><tr style="background:#f8fafc;">
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:left;">Product</th>
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:center;">Qty</th>
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Unit Price</th>
                <th style="padding:3px 8px;border:1px solid #ddd;text-align:right;">Total</th>
              </tr></thead>
              <tbody>${itemRows}</tbody>
              <tfoot><tr>
                <td colspan="3" style="padding:4px 8px;border:1px solid #ddd;text-align:right;font-weight:700;">Total</td>
                <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;font-weight:700;">Rs. ${fmt(d.sale?.total)}</td>
              </tr></tfoot>
            </table>
          </div>`;
        }).join('')}
      </div>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><title>Loadsheet — ${fmtDate(date)}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        p { margin: 0; }
      </style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:2px solid #1e293b;padding-bottom:10px;">
        <div>
          <h1>Load Sheet</h1>
          <p style="color:#64748b;font-size:12px;">${fmtDate(date)}</p>
        </div>
        <div style="text-align:right;font-size:11px;color:#64748b;">
          <p>${deliveries.length} deliveries &nbsp;|&nbsp; ${totalItems} items &nbsp;|&nbsp; Rs. ${fmt(totalValue)}</p>
        </div>
      </div>
      ${groupHtml}
    </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html.replace('</body>', '<script>setTimeout(()=>window.print(),400)</script></body>'));
    win.document.close();
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Load Sheet</h1>
          <p className="text-xs text-slate-400">Daily delivery manifest grouped by area</p>
        </div>
        <div className="flex items-center gap-2">
          {ids ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 text-sm bg-orange-100 text-orange-700 font-semibold rounded-xl border border-orange-200">
                {ids.split(',').length} selected deliveries
              </span>
              <button
                onClick={() => setSearchParams({})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
              >
                Clear selection
              </button>
            </div>
          ) : (
            <input
              type="date"
              value={date}
              onChange={e => handleDateChange(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          )}
          <button
            onClick={handlePrint}
            disabled={deliveries.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z"/>
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && deliveries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-slate-800">{deliveries.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Deliveries</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-slate-800">{totalItems}</p>
            <p className="text-xs text-slate-400 mt-0.5">Items</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <p className="text-lg font-extrabold text-orange-600">Rs.{fmt(totalValue)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Value</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {(isLoading || isFetching) && (
        <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
      )}

      {/* Empty */}
      {!isLoading && !isFetching && deliveries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p className="text-sm font-medium">No deliveries for {fmtDate(date)}</p>
        </div>
      )}

      {/* Groups */}
      {!isLoading && !isFetching && Object.entries(groups).map(([area, areaDeliveries]) => (
        <div key={area} className="space-y-3">
          {/* Area header */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-full">
              {area}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Delivery cards */}
          {areaDeliveries.map(d => {
            const customer = d.sale?.customer;
            const items = d.sale?.items || [];
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Delivery header */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm">
                      {d.sale?.invoice_no || `Delivery #${d.id}`}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[d.status] || 'bg-slate-100 text-slate-600'}`}>
                      {(d.status || '').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {d.driver_name && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"/>
                        </svg>
                        {d.driver_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer info */}
                <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Customer</p>
                    <p className="font-semibold text-slate-800">{customer?.name || 'Walk-in'}</p>
                  </div>
                  {customer?.phone && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Phone</p>
                      <p className="text-slate-700">{customer.phone}</p>
                    </div>
                  )}
                  {customer?.address && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Address</p>
                      <p className="text-slate-700">{customer.address}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                {items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase w-20">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase w-28">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-800 font-medium">{it.product_name || '—'}</td>
                            <td className="px-4 py-2.5 text-center text-slate-700">{it.qty}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">Rs. {fmt(it.unit_price)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">Rs. {fmt(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 uppercase">Invoice Total</td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-slate-800">Rs. {fmt(d.sale?.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-400 italic">No items</p>
                )}

                {/* Notes */}
                {d.sale?.notes && (
                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-700"><span className="font-semibold">Note:</span> {d.sale.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
