import { api } from '../../app/baseApi';

export const posApi = api.injectEndpoints({
  endpoints: b => ({
    getPosSales:   b.query({ query: p => ({ url: '/pos', params: p }), providesTags: ['PosSale'] }),
    getPosSale:    b.query({ query: id => `/pos/${id}`,                providesTags: (r, e, id) => [{ type: 'PosSale', id }] }),
    createPosSale: b.mutation({ query: body => ({ url: '/pos', method: 'POST', body }), invalidatesTags: ['PosSale'] }),
    deletePosSale: b.mutation({ query: id   => ({ url: `/pos/${id}`, method: 'DELETE' }), invalidatesTags: ['PosSale'] }),
  }),
  overrideExisting: false,
});

export const {
  useGetPosSalesQuery,
  useGetPosSaleQuery,
  useCreatePosSaleMutation,
  useDeletePosSaleMutation,
} = posApi;
