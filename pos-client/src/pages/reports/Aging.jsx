import { useGetReportAgingQuery } from '../../features/reports/reportsApi';

const BUCKETS = [
  { key: 'current',    label: '0–30 days',  color: 'green' },
  { key: 'days_31_60', label: '31–60 days', color: 'yellow' },
  { key: 'days_61_90', label: '61–90 days', color: 'orange' },
  { key: 'over_90',   label: '90+ days',   color: 'red' },
];

const colorMap = {
  green:  'bg-green-50 border-green-200 text-green-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red:    'bg-red-50 border-red-200 text-red-700',
};

const badgeMap = {
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  red:    'bg-red-100 text-red-700',
};

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

export default function AgingReport() {
  const { data, isLoading } = useGetReportAgingQuery();

  if (isLoading) return <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>;
  if (!data)     return null;

  const { buckets, total, as_of } = data;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Accounts Receivable Aging</h2>
          <p className="text-xs text-slate-400 mt-0.5">As of {as_of} — Total outstanding: Rs. {fmt(total)}</p>
        </div>
      </div>

      {BUCKETS.map(({ key, label, color }) => {
        const rows = buckets[key] || [];
        const bucketTotal = rows.reduce((s, r) => s + parseFloat(r.credit_balance), 0);
        return (
          <div key={key} className={`rounded-2xl border ${colorMap[color]} overflow-hidden`}>
            <div className={`px-5 py-3 flex items-center justify-between border-b ${colorMap[color]}`}>
              <span className="font-semibold text-sm">{label}</span>
              <span className="text-sm font-bold">Rs. {fmt(bucketTotal)} ({rows.length} customers)</span>
            </div>
            {rows.length === 0 ? (
              <div className="px-5 py-4 text-sm text-slate-400 bg-white">No customers in this range.</div>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                      <th className="px-4 py-2 text-left font-semibold">Customer</th>
                      <th className="px-4 py-2 text-left font-semibold">Phone</th>
                      <th className="px-4 py-2 text-left font-semibold">Payment Terms</th>
                      <th className="px-4 py-2 text-right font-semibold">Days Outstanding</th>
                      <th className="px-4 py-2 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.phone || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500 capitalize">{r.payment_terms || 'cash'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeMap[color]}`}>
                            {r.days_outstanding}d
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          Rs. {fmt(r.credit_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
