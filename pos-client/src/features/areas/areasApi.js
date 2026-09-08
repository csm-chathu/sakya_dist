import { api } from '../../app/baseApi';

export const areasApi = api.injectEndpoints({
  endpoints: build => ({
    getAreas: build.query({
      query: () => '/areas',
      keepUnusedDataFor: 600,
      providesTags: (r) =>
        r ? [...r.data.map(a => ({ type: 'Areas', id: a.id })), { type: 'Areas', id: 'LIST' }]
          : [{ type: 'Areas', id: 'LIST' }],
    }),
    createArea: build.mutation({
      query: body => ({ url: '/areas', method: 'POST', body }),
      invalidatesTags: [{ type: 'Areas', id: 'LIST' }],
    }),
    updateArea: build.mutation({
      query: ({ id, ...body }) => ({ url: `/areas/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Areas', id }, { type: 'Areas', id: 'LIST' }],
    }),
    deleteArea: build.mutation({
      query: id => ({ url: `/areas/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Areas', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAreasQuery,
  useCreateAreaMutation,
  useUpdateAreaMutation,
  useDeleteAreaMutation,
} = areasApi;
