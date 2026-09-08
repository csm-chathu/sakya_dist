import { api } from '../../app/baseApi';

export const productsApi = api.injectEndpoints({
  endpoints: build => ({
    getProducts: build.query({
      query: params => ({ url: '/products', params }),
      keepUnusedDataFor: 300,
      providesTags: (result) =>
        result
          ? [...result.data.map(p => ({ type: 'Products', id: p.id })), { type: 'Products', id: 'LIST' }]
          : [{ type: 'Products', id: 'LIST' }],
    }),
    getProduct: build.query({
      query: id => `/products/${id}`,
      keepUnusedDataFor: 1800,
      providesTags: (r, e, id) => [{ type: 'Products', id }],
    }),
    createProduct: build.mutation({
      query: body => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
    updateProduct: build.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Products', id }, { type: 'Products', id: 'LIST' }],
    }),
    deleteProduct: build.mutation({
      query: id => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
    getCategories: build.query({
      query: () => '/categories',
      keepUnusedDataFor: 7200,
      providesTags: ['Categories'],
    }),
    intakeLookup: build.query({
      query: barcode => ({ url: '/products/intake-lookup', params: { barcode } }),
      keepUnusedDataFor: 0,
    }),
    importProducts: build.mutation({
      query: body => ({ url: '/products/import', method: 'POST', body }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
    truncateProducts: build.mutation({
      query: () => ({ url: '/products/truncate', method: 'POST', body: { confirm: 'TRUNCATE_PRODUCTS' } }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useImportProductsMutation,
  useTruncateProductsMutation,
  useIntakeLookupQuery,
  useLazyIntakeLookupQuery,
} = productsApi;
