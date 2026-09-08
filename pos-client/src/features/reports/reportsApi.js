import { api } from '../../app/baseApi';

export const reportsApi = api.injectEndpoints({
  endpoints: b => ({
    getReportToday:           b.query({ query: () => '/reports/today' }),
    getReportDayEnd:          b.query({ query: date => `/reports/day-end?date=${date}` }),
    getReportMonthly:         b.query({ query: month => `/reports/monthly?month=${month}` }),
    getReportTopProducts:     b.query({ query: () => '/reports/top-products' }),
    getReportLowStock:        b.query({ query: () => '/reports/low-stock' }),
    getReportProfit:          b.query({ query: p => `/reports/profit?date_from=${p.from}&date_to=${p.to}` }),
    getReportCreditCustomers: b.query({ query: () => '/reports/credit-customers' }),
    getReportStockSummary:    b.query({ query: p => {
      const q = new URLSearchParams({ page: p.page || 1 });
      if (p.limit) q.set('limit', p.limit);
      if (p.search) q.set('search', p.search);
      if (p.category_id) q.set('category_id', p.category_id);
      return `/reports/stock-summary?${q}`;
    }}),
    getReportRevenue:         b.query({ query: p => `/reports/revenue?date_from=${p.from}&date_to=${p.to}` }),
    getReportStockMovements:  b.query({ query: p => {
      const q = new URLSearchParams({ page: p.page || 1, date_from: p.from, date_to: p.to });
      if (p.type && p.type !== 'all') q.set('type', p.type);
      if (p.search) q.set('search', p.search);
      return `/reports/stock-movements?${q}`;
    }}),
    getReportDailySales: b.query({ query: p => `/reports/daily-sales?date_from=${p.from}&date_to=${p.to}` }),
    getReportAging:          b.query({ query: () => '/reports/aging' }),
    getReportCreditPayments: b.query({ query: p => `/reports/credit-payments?from=${p.from}&to=${p.to}` }),
  }),
});

export const {
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
  useGetReportDailySalesQuery,
  useGetReportAgingQuery,
  useGetReportCreditPaymentsQuery,
} = reportsApi;
