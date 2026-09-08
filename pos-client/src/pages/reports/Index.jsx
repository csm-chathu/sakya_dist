import { useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import {
  useGetReportTodayQuery,
  useGetReportDayEndQuery,
  useGetReportMonthlyQuery,
  useGetReportTopProductsQuery,
  useGetReportLowStockQuery,
  useGetReportProfitQuery,
  useGetReportCreditCustomersQuery,
  useGetReportStockSummaryQuery,
  useGetReportRevenueQuery,
  useGetReportStockMovementsQuery,
  useGetReportCreditPaymentsQuery,
} from '../../features/reports/reportsApi';

const fmt     = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtQty  = n => Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 });
const fmtDate = s => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const todayStr   = () => new Date().toISOString().slice(0, 10);
const monthStr   = () => new Date().toISOString().slice(0, 7);
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

function Spin() {
  return (
    <div className="flex justify-center py-16">
      <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function DateRange({ from, to, onFrom, onTo }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input type="date" value={from} onChange={e => onFrom(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <span className="text-slate-400 text-sm">to</span>
      <input type="date" value={to} onChange={e => onTo(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function TableWrap({ title, children, footer }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {title && <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">{title}</div>}
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}

function Th({ children, right }) {
  return <th className={`px-4 py-2.5 font-semibold ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

// ─── Tab: Today's Sales ────────────────────────────────────────────────────────
function SalesToday() {
  const { t } = useLocale();
  const [date, setDate] = useState(todayStr());
  const { data, isLoading } = useGetReportDayEndQuery(date);
  const { summary = {}, byPayment = [], sales = [] } = data || {};
  const isToday = date === todayStr();
  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {!isToday && (
          <button onClick={() => setDate(todayStr())}
            className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            {t('rep.today')}
          </button>
        )}
        {!isToday && (
          <span className="text-xs text-slate-400">{fmtDate(date)}</span>
        )}
      </div>

      {isLoading ? <Spin /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label={t('rep.total_sales')}   value={summary.total_bills ?? 0} />
            <SummaryCard label={t('th.revenue')}         value={fmt(summary.total_revenue)} color="text-green-600" />
            <SummaryCard label={t('rep.total_discount')} value={fmt(summary.total_discount)} color="text-orange-500" />
            <SummaryCard label={t('th.balance')}         value={fmt(summary.total_balance)} color={parseFloat(summary.total_balance) > 0 ? 'text-red-500' : 'text-slate-800'} />
          </div>

          <TableWrap title={t('rep.by_method')}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr><Th>{t('th.method')}</Th><Th right>{t('th.sales_count')}</Th><Th right>{t('th.amount')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byPayment.map(r => (
                  <tr key={r.method} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 capitalize font-medium text-slate-700">{r.method}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{r.count}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmt(r.total)}</td>
                  </tr>
                ))}
                {!byPayment.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">{t('rep.no_sales')}</td></tr>}
              </tbody>
            </table>
          </TableWrap>

          <TableWrap title={`${t('nav.sales')} (${sales.length})`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr><Th>{t('th.invoice')}</Th><Th>{t('th.cashier')}</Th><Th right>{t('th.total')}</Th><Th right>{t('th.paid')}</Th><Th right>{t('th.balance')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-blue-600">{s.invoice_no}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.user_name}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(s.total)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(s.paid)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{parseFloat(s.balance) > 0 ? fmt(s.balance) : '—'}</td>
                  </tr>
                ))}
                {!sales.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('rep.no_sales')}</td></tr>}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}

// ─── Tab: Day End ──────────────────────────────────────────────────────────────
function DayEnd() {
  const { t } = useLocale();
  const [date, setDate] = useState(todayStr());
  const { data, isLoading } = useGetReportDayEndQuery(date);
  const { summary = {}, byPayment = [], sales = [] } = data || {};
  return (
    <div className="space-y-4">
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {isLoading ? <Spin /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label={t('rep.total_sales')}   value={summary.total_bills ?? 0} />
            <SummaryCard label={t('th.revenue')}         value={fmt(summary.total_revenue)} color="text-green-600" />
            <SummaryCard label={t('lbl.discount')}       value={fmt(summary.total_discount)} color="text-orange-500" />
            <SummaryCard label={t('th.balance')}         value={fmt(summary.total_balance)} color={parseFloat(summary.total_balance) > 0 ? 'text-red-500' : 'text-slate-800'} />
          </div>

          <TableWrap title={t('rep.by_method')}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr><Th>{t('th.method')}</Th><Th right>{t('th.sales_count')}</Th><Th right>{t('th.amount')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byPayment.map(r => (
                  <tr key={r.method} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 capitalize font-medium">{r.method}</td>
                    <td className="px-4 py-2.5 text-right">{r.count}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmt(r.total)}</td>
                  </tr>
                ))}
                {!byPayment.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">{t('rep.no_sales')}</td></tr>}
              </tbody>
            </table>
          </TableWrap>

          <TableWrap title={`${t('nav.sales')} (${sales.length})`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr><Th>{t('th.invoice')}</Th><Th>{t('th.cashier')}</Th><Th right>{t('th.total')}</Th><Th right>{t('th.paid')}</Th><Th right>{t('th.balance')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-blue-600">{s.invoice_no}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.user_name}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(s.total)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(s.paid)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{parseFloat(s.balance) > 0 ? fmt(s.balance) : '—'}</td>
                  </tr>
                ))}
                {!sales.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('rep.no_sales')}</td></tr>}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}

// ─── Tab: Monthly Summary ──────────────────────────────────────────────────────
function Monthly() {
  const { t } = useLocale();
  const [month, setMonth] = useState(monthStr());
  const { data, isLoading } = useGetReportMonthlyQuery(month);
  const { byDay = [], summary = {} } = data || {};
  const avgDaily = byDay.length ? parseFloat(summary.total_revenue) / byDay.length : 0;
  return (
    <div className="space-y-4">
      <input type="month" value={month} onChange={e => setMonth(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {isLoading ? <Spin /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SummaryCard label={t('rep.total_revenue')} value={fmt(summary.total_revenue)} color="text-green-600" />
            <SummaryCard label={t('rep.total_sales')}   value={summary.total_sales ?? 0} />
            <SummaryCard label="Avg / Day"              value={fmt(avgDaily)} />
          </div>

          <TableWrap title={t('rep.monthly')}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr><Th>{t('th.date')}</Th><Th right>{t('th.sales_count')}</Th><Th right>{t('lbl.discount')}</Th><Th right>{t('th.revenue')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byDay.map(r => (
                  <tr key={r.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{r.count}</td>
                    <td className="px-4 py-2.5 text-right text-orange-500">{parseFloat(r.discount) > 0 ? fmt(r.discount) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmt(r.total)}</td>
                  </tr>
                ))}
                {!byDay.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('rep.no_sales')}</td></tr>}
              </tbody>
              {byDay.length > 0 && (
                <tfoot className="bg-slate-50 border-t border-slate-200 text-sm font-semibold">
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600">{t('lbl.total')}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{byDay.reduce((a, r) => a + Number(r.count), 0)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-500">{fmt(byDay.reduce((a, r) => a + parseFloat(r.discount || 0), 0))}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{fmt(summary.total_revenue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}

// ─── Tab: Revenue ──────────────────────────────────────────────────────────────
function Revenue() {
  const { t } = useLocale();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(todayStr());
  const { data, isLoading } = useGetReportRevenueQuery({ from, to });
  const { byDay = [], byPayment = [] } = data || {};
  const totRevenue = byDay.reduce((a, r) => a + parseFloat(r.net_revenue || 0), 0);
  const totCost    = byDay.reduce((a, r) => a + parseFloat(r.total_cost  || 0), 0);
  const totProfit  = byDay.reduce((a, r) => a + parseFloat(r.net_profit  || 0), 0);
  const margin     = totRevenue > 0 ? (totProfit / totRevenue * 100).toFixed(1) + '%' : '0%';
  return (
    <div className="space-y-4">
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {isLoading ? <Spin /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label={t('rep.total_revenue')} value={fmt(totRevenue)} color="text-green-600" />
            <SummaryCard label={t('th.cost')}           value={fmt(totCost)} color="text-red-500" />
            <SummaryCard label={t('th.profit')}         value={fmt(totProfit)} color="text-blue-600" />
            <SummaryCard label="Margin"                  value={margin} />
          </div>

          {byPayment.length > 0 && (
            <TableWrap title={t('rep.by_method')}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr><Th>{t('th.method')}</Th><Th right>{t('th.amount')}</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {byPayment.map(r => (
                    <tr key={r.method} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 capitalize font-medium">{r.method}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}

          <TableWrap title={t('rep.revenue')}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr><Th>{t('th.date')}</Th><Th right>{t('th.sales_count')}</Th><Th right>{t('th.revenue')}</Th><Th right>{t('th.cost')}</Th><Th right>{t('th.profit')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byDay.map(r => (
                  <tr key={r.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{r.total_bills}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.net_revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">{fmt(r.total_cost)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt(r.net_profit)}</td>
                  </tr>
                ))}
                {!byDay.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('lbl.no_data')}</td></tr>}
              </tbody>
              {byDay.length > 0 && (
                <tfoot className="bg-slate-50 border-t border-slate-200 text-sm font-semibold">
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600">{t('lbl.total')}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{byDay.reduce((a, r) => a + Number(r.total_bills), 0)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(totRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">{fmt(totCost)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{fmt(totProfit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}

// ─── Tab: Profit ───────────────────────────────────────────────────────────────
function Profit() {
  const { t } = useLocale();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(todayStr());
  const { data, isLoading } = useGetReportProfitQuery({ from, to });
  const { items = [], summary = {} } = data || {};
  const marginPct = summary.net_revenue > 0
    ? (summary.net_profit / summary.net_revenue * 100).toFixed(1) + '%' : '0%';
  return (
    <div className="space-y-4">
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {isLoading ? <Spin /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label={t('rep.total_sales')}   value={summary.total_bills ?? 0} />
            <SummaryCard label={t('rep.total_revenue')} value={fmt(summary.net_revenue)} color="text-green-600" />
            <SummaryCard label={t('th.cost')}           value={fmt(summary.total_cost)} color="text-red-500" />
            <SummaryCard label={t('th.profit')}         value={fmt(summary.net_profit)} color="text-blue-600" sub={`Margin: ${marginPct}`} />
          </div>

          <TableWrap title={t('rep.profit')}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr><Th>{t('th.product')}</Th><Th right>{t('th.qty')}</Th><Th right>{t('th.revenue')}</Th><Th right>{t('th.cost')}</Th><Th right>{t('th.profit')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{fmtQty(item.total_qty)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(item.net_revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">{fmt(item.total_cost)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt(item.gross_profit)}</td>
                  </tr>
                ))}
                {!items.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('lbl.no_data')}</td></tr>}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}

// ─── Tab: Top Products ─────────────────────────────────────────────────────────
function TopProducts() {
  const { t } = useLocale();
  const { data, isLoading } = useGetReportTopProductsQuery();
  if (isLoading) return <Spin />;
  const { topProducts = [], from, to } = data || {};
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {fmtDate(from)} — {fmtDate(to)}
      </p>
      <TableWrap>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr><Th>{t('th.rank')}</Th><Th>{t('th.product')}</Th><Th right>{t('th.qty')}</Th><Th right>{t('th.sales_count')}</Th><Th right>{t('th.revenue')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {topProducts.map((p, i) => (
              <tr key={p.product_id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-400 font-semibold w-10">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{p.product_name}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{fmtQty(p.total_qty)}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{p.sale_count}</td>
                <td className="px-4 py-2.5 text-right">{fmt(p.total_revenue)}</td>
              </tr>
            ))}
            {!topProducts.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('rep.no_items')}</td></tr>}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

// ─── Tab: Low Stock ────────────────────────────────────────────────────────────
function LowStock() {
  const { t } = useLocale();
  const { data, isLoading } = useGetReportLowStockQuery();
  if (isLoading) return <Spin />;
  const products = data?.products || [];
  return (
    <div className="space-y-4">
      {products.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 font-semibold">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {products.length} {t('rep.low_stock_title')}
        </div>
      )}
      <TableWrap>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr><Th>{t('th.product')}</Th><Th>{t('th.category')}</Th><Th right>{t('rep.current_stock')}</Th><Th right>{t('rep.alert_qty')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{p.category?.name || '—'}</td>
                <td className={`px-4 py-2.5 text-right font-bold ${parseFloat(p.stock_qty) <= 0 ? 'text-red-600' : 'text-orange-500'}`}>
                  {fmtQty(p.stock_qty)}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-400">{fmtQty(p.alert_qty)}</td>
              </tr>
            ))}
            {!products.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-green-600 font-medium">{t('rep.no_low_stock')}</td></tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

// ─── Tab: Stock Summary ────────────────────────────────────────────────────────
function StockSummary() {
  const { t } = useLocale();
  const [search, setSearch]   = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage]       = useState(1);
  const [viewAll, setViewAll] = useState(() => localStorage.getItem('stock_summary_viewAll') === 'true');

  const { data, isLoading } = useGetReportStockSummaryQuery(
    viewAll
      ? { limit: 9999, page: 1 }
      : { search: applied, page }
  );

  const allProducts = data?.products?.data || [];
  const products = viewAll
    ? allProducts.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))
    : allProducts;
  const meta    = data?.products || {};
  const summary = data?.summary  || {};

  function handleSearch() { setApplied(search); setPage(1); }

  function toggleViewAll() {
    setViewAll(v => {
      localStorage.setItem('stock_summary_viewAll', String(!v));
      return !v;
    });
    setSearch('');
    setApplied('');
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          disabled={!viewAll}
          placeholder={viewAll ? t('lbl.search') : '—'}
          className={`flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!viewAll ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}`} />
        <button onClick={toggleViewAll}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${viewAll ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          {viewAll ? 'Paginated' : 'View All'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label={t('nav.products')}  value={Number(summary.total_products  || 0).toLocaleString()} />
        <SummaryCard label={t('th.qty')}         value={fmtQty(summary.total_units)} />
        <SummaryCard label={t('th.cost')}        value={fmt(summary.total_cost_value)} />
        <SummaryCard label={t('lbl.retail')}     value={fmt(summary.total_retail_value)} color="text-green-600" />
      </div>

      <TableWrap footer={
        !viewAll && meta.last_page > 1 ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{meta.total} {t('nav.products')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">‹</button>
              <span className="px-2 py-1">{page} / {meta.last_page}</span>
              <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">›</button>
            </div>
          </div>
        ) : viewAll && products.length > 0 ? (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 text-right">
            {products.length} {t('nav.products')}
          </div>
        ) : null
      }>
        {isLoading ? <Spin /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <Th>{t('th.product')}</Th><Th>{t('th.category')}</Th>
                <Th right>{t('th.stock')}</Th><Th right>{t('th.cost')}</Th>
                <Th right>{t('th.sell_price')}</Th><Th right>{t('th.cost')} Value</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.category?.name || '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${parseFloat(p.stock_qty) <= parseFloat(p.alert_qty) ? 'text-orange-500' : 'text-slate-800'}`}>
                    {fmtQty(p.stock_qty)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{fmt(p.cost_price)}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(p.selling_price)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fmt(parseFloat(p.cost_price) * parseFloat(p.stock_qty))}</td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t('prod.no_products')}</td></tr>}
            </tbody>
          </table>
        )}
      </TableWrap>
    </div>
  );
}

// ─── Tab: Credit Customers ─────────────────────────────────────────────────────
function CreditCustomers() {
  const { t } = useLocale();
  const { data, isLoading } = useGetReportCreditCustomersQuery();
  if (isLoading) return <Spin />;
  const { customers = [], totalCredit = 0 } = data || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label={t('nav.customers')} value={customers.length} />
        <SummaryCard label={t('credit.total')}  value={fmt(totalCredit)} color="text-red-500" />
      </div>
      <TableWrap>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr><Th>{t('th.name')}</Th><Th>{t('th.phone')}</Th><Th right>{t('th.credit')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{c.phone || '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-500">{fmt(c.credit_balance)}</td>
              </tr>
            ))}
            {!customers.length && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-green-600 font-medium">{t('credit.no_credit')}</td></tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

// ─── Tab: Credit Payments ──────────────────────────────────────────────────────
function CreditPayments() {
  const { t } = useLocale();
  const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayStr());
  const [to, setTo]     = useState(todayStr());
  const { data, isLoading } = useGetReportCreditPaymentsQuery({ from, to });
  const { payments = [], total = 0 } = data || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">From</p>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">To</p>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <SummaryCard label="Payments" value={payments.length} />
        <SummaryCard label="Total Collected" value={fmt(total)} color="text-green-600" />
      </div>
      {isLoading ? <Spin /> : (
        <TableWrap title={`Credit Payments (${payments.length})`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <Th>Ref No</Th>
                <Th>Customer</Th>
                <Th>Phone</Th>
                <Th>Note</Th>
                <Th>Collected By</Th>
                <Th>Date</Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{p.invoice_no || `#${p.id}`}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{p.customer?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.customer?.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 italic">{p.note || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.user?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(p.created_at).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt(p.amount)}</td>
                </tr>
              ))}
              {!payments.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No credit payments in this period.</td></tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Tab: Stock Movements ───────────────────────────────────────────────────────
const TYPE_BADGE = {
  in:         'bg-green-100 text-green-700',
  out:        'bg-red-100 text-red-600',
  adjustment: 'bg-yellow-100 text-yellow-700',
  return:     'bg-blue-100 text-blue-700',
};

function StockMovements() {
  const [from, setFrom]   = useState(monthStart());
  const [to, setTo]       = useState(todayStr());
  const [type, setType]   = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage]   = useState(1);

  const { data, isLoading } = useGetReportStockMovementsQuery({ from, to, type, search, page });
  const { data: rows = [], total = 0, last_page = 1 } = data || {};

  const fmtQtySign = (row) => {
    const q = parseFloat(row.qty);
    return (row.type === 'out' ? '−' : '+') + fmtQty(Math.abs(q));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <DateRange from={from} to={to} onFrom={v => { setFrom(v); setPage(1); }} onTo={v => { setTo(v); setPage(1); }} />
        <select value={type} onChange={e => { setType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All types</option>
          <option value="in">In</option>
          <option value="out">Out</option>
          <option value="adjustment">Adjustment</option>
          <option value="return">Return</option>
        </select>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search product…"
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </div>

      {/* Summary count */}
      <p className="text-sm text-slate-500">{total} movement{total !== 1 ? 's' : ''}</p>

      {isLoading ? <Spin /> : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <Th>Date</Th>
                <Th>Product</Th>
                <Th>Type</Th>
                <Th right>Qty</Th>
                <Th right>Before</Th>
                <Th right>After</Th>
                <Th>Reference</Th>
                <Th>Note</Th>
                <Th>User</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.product_name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TYPE_BADGE[r.type] || 'bg-slate-100 text-slate-600'}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-bold ${r.type === 'out' ? 'text-red-500' : 'text-green-600'}`}>
                    {fmtQtySign(r)} {r.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{fmtQty(r.stock_before)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 font-semibold">{fmtQty(r.stock_after)}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{r.reference || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{r.note || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{r.user_name}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No movements found</td></tr>
              )}
            </tbody>
          </table>
          {last_page > 1 && (() => {
            const pages = [];
            const visible = new Set([1, last_page]);
            for (let p = Math.max(1, page - 2); p <= Math.min(last_page, page + 2); p++) visible.add(p);
            const sorted = [...visible].sort((a, b) => a - b);
            sorted.forEach((p, i) => { if (i > 0 && p - sorted[i-1] > 1) pages.push('…'); pages.push(p); });
            return (
              <div className="flex items-center justify-end gap-1 px-4 py-3 border-t border-slate-100">
                <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50">‹</button>
                {pages.map((p, i) => p === '…'
                  ? <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                  : <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border text-sm transition-colors ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50'}`}>{p}</button>
                )}
                <button disabled={page >= last_page} onClick={() => setPage(p => p+1)} className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50">›</button>
              </div>
            );
          })()}
        </TableWrap>
      )}
    </div>
  );
}

// ─── Daily Sales Report ───────────────────────────────────────────────────────
const TAB_ICONS = {
  today:    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg>,
  dayend:   <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>,
  monthly:  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeWidth={2} d="M16 2v4M8 2v4M3 10h18"/></svg>,
  revenue:  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>,
  profit:   <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  top:      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z"/></svg>,
  lowstock: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  stock:    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
  credit:          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z"/></svg>,
  credit_payments: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>,
  movements:<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>,
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Reports() {
  const { t } = useLocale();
  const [tab, setTab] = useState('today');

  const TABS = [
    { id: 'today',    label: t('rep.today') },
    { id: 'dayend',   label: t('rep.day_end') },
    { id: 'monthly',  label: t('rep.monthly') },
    { id: 'revenue',  label: t('rep.revenue') },
    { id: 'profit',   label: t('rep.profit') },
    { id: 'top',      label: t('rep.top_products') },
    { id: 'lowstock', label: t('rep.low_stock') },
    { id: 'stock',    label: t('rep.stock_summary') },
    { id: 'credit',          label: t('rep.credit') },
    { id: 'credit_payments', label: 'Credit Payments' },
    { id: 'movements',       label: 'Stock Movements' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full">

      {/* Sidebar tabs — vertical on md+, horizontal scroll on mobile */}
      <div className="md:w-52 md:shrink-0 md:border-r border-b md:border-b-0 border-slate-200 bg-white md:overflow-y-auto">
        <div className="px-4 py-3 md:py-4 border-b border-slate-100 hidden md:block">
          <h1 className="text-base font-bold text-slate-800">{t('nav.reports')}</h1>
        </div>
        {/* Mobile: horizontal scrolling tab strip */}
        <nav className="flex md:hidden overflow-x-auto gap-1 px-2 py-2 scrollbar-none">
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap
                ${tab === tb.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}>
              {TAB_ICONS[tb.id]}
              {tb.label}
            </button>
          ))}
        </nav>
        {/* Desktop: vertical nav */}
        <nav className="hidden md:block p-2 space-y-0.5">
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${tab === tb.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}>
              {TAB_ICONS[tb.id]}
              {tb.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {tab === 'today'    && <SalesToday />}
        {tab === 'dayend'   && <DayEnd />}
        {tab === 'monthly'  && <Monthly />}
        {tab === 'revenue'  && <Revenue />}
        {tab === 'profit'   && <Profit />}
        {tab === 'top'      && <TopProducts />}
        {tab === 'lowstock' && <LowStock />}
        {tab === 'stock'    && <StockSummary />}
        {tab === 'credit'          && <CreditCustomers />}
        {tab === 'credit_payments' && <CreditPayments />}
        {tab === 'movements'       && <StockMovements />}
      </div>
    </div>
  );
}
