import { useState, useEffect } from 'react';
import { useGetProductsQuery } from '../features/products/productsApi';
import { db } from '../db/localDb';

export function useOfflineProducts() {
  const [localProducts, setLocalProducts] = useState([]);
  const [lastSynced,    setLastSynced]    = useState(null);
  const [localLoading,  setLocalLoading]  = useState(true);

  // Always hit the API — do NOT skip based on navigator.onLine (unreliable in WebView)
  const { data, isLoading: apiLoading, isError, refetch } = useGetProductsQuery(
    { page: 1, limit: 9999, active: '1' }
  );

  // On mount: load cached data from IndexedDB immediately so the list isn't blank while API loads
  useEffect(() => {
    setLocalLoading(true);
    Promise.all([
      db.products.toArray(),
      db.meta.get('lastSynced'),
    ]).then(([rows, meta]) => {
      setLocalProducts(rows);
      if (meta) setLastSynced(meta.value);
    }).catch(() => {}).finally(() => setLocalLoading(false));
  }, []);

  // When API succeeds: persist fresh data to IndexedDB
  useEffect(() => {
    const products = data?.data;
    if (!products?.length) return;
    const now = new Date().toISOString();
    db.products.bulkPut(products)
      .then(() => setLocalProducts(products))
      .catch(() => {});
    db.meta.put({ key: 'lastSynced', value: now }).catch(() => {});
    setLastSynced(now);
  }, [data]);

  const apiProducts = data?.data || [];
  // Prefer live API data; fall back to IndexedDB cache
  const products  = apiProducts.length > 0 ? apiProducts : localProducts;
  const isLoading = apiLoading && localLoading; // only show spinner when BOTH are loading
  const isOffline = isError && localProducts.length >= 0;

  return { products, isLoading, isOffline: isError, lastSynced, refetch };
}
