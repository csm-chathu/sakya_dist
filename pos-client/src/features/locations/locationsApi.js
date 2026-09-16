import { api } from '../../app/baseApi';

export const locationsApi = api.injectEndpoints({
  endpoints: build => ({
    getLocations: build.query({
      query: () => '/locations',
      providesTags: ['Locations'],
    }),
    updateMyLocation: build.mutation({
      query: body => ({ url: '/locations', method: 'POST', body }),
    }),
  }),
});

export const { useGetLocationsQuery, useUpdateMyLocationMutation } = locationsApi;
