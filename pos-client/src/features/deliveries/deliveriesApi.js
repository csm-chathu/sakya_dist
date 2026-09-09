import { api } from '../../app/baseApi';

export const deliveriesApi = api.injectEndpoints({
  endpoints: build => ({
    getDeliveries: build.query({
      query: (params) => ({ url: '/deliveries', params }),
      keepUnusedDataFor: 60,
      providesTags: (r) =>
        r ? [...r.data.map(d => ({ type: 'Deliveries', id: d.id })), { type: 'Deliveries', id: 'LIST' }]
          : [{ type: 'Deliveries', id: 'LIST' }],
    }),
    createDelivery: build.mutation({
      query: body => ({ url: '/deliveries', method: 'POST', body }),
      invalidatesTags: [{ type: 'Deliveries', id: 'LIST' }],
    }),
    getDelivery: build.query({
      query: id => `/deliveries/${id}`,
      keepUnusedDataFor: 300,
      providesTags: (r, e, id) => [{ type: 'Deliveries', id }],
    }),
    updateDeliveryStatus: build.mutation({
      query: ({ id, status, return_note }) => ({ url: `/deliveries/${id}/status`, method: 'PUT', body: { status, return_note } }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Deliveries', id }, { type: 'Deliveries', id: 'LIST' }],
    }),
    deleteDelivery: build.mutation({
      query: id => ({ url: `/deliveries/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Deliveries', id: 'LIST' }],
    }),
    bulkUpdateDeliveryStatus: build.mutation({
      query: ({ ids, status }) => ({ url: '/deliveries/bulk-status', method: 'PUT', body: { ids, status } }),
      invalidatesTags: [{ type: 'Deliveries', id: 'LIST' }],
    }),
    getLoadsheet: build.query({
      query: (params) => ({ url: '/deliveries/loadsheet', params }),
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetDeliveriesQuery,
  useCreateDeliveryMutation,
  useGetDeliveryQuery,
  useUpdateDeliveryStatusMutation,
  useDeleteDeliveryMutation,
  useGetLoadsheetQuery,
  useBulkUpdateDeliveryStatusMutation,
} = deliveriesApi;
