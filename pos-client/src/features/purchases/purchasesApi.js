import { api } from '../../app/baseApi';

export const purchasesApi = api.injectEndpoints({
  endpoints: build => ({
    getPurchases: build.query({
      query: params => ({ url: '/purchases', params }),
      keepUnusedDataFor: 300,
      providesTags: (r) =>
        r ? [...r.data.map(p => ({ type: 'Purchases', id: p.id })), { type: 'Purchases', id: 'LIST' }]
          : [{ type: 'Purchases', id: 'LIST' }],
    }),
    getPurchase: build.query({
      query: id => `/purchases/${id}`,
      keepUnusedDataFor: 1800,
      providesTags: (r, e, id) => [{ type: 'Purchases', id }],
    }),
    createPurchase: build.mutation({
      query: body => ({ url: '/purchases', method: 'POST', body }),
      invalidatesTags: [{ type: 'Purchases', id: 'LIST' }],
    }),
    deletePurchase: build.mutation({
      query: id => ({ url: `/purchases/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Purchases', id: 'LIST' }],
    }),
    getPurchaseReturns: build.query({
      query: id => `/purchases/${id}/returns`,
      providesTags: (r, e, id) => [{ type: 'PurchaseReturns', id }],
    }),
    createPurchaseReturn: build.mutation({
      query: ({ id, ...body }) => ({ url: `/purchases/${id}/return`, method: 'POST', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'PurchaseReturns', id }],
    }),
  }),
});

export const {
  useGetPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useDeletePurchaseMutation,
  useGetPurchaseReturnsQuery,
  useCreatePurchaseReturnMutation,
} = purchasesApi;
