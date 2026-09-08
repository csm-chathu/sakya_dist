import { useState, useMemo } from 'react';
import { useGetProductsQuery } from '../../features/products/productsApi';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0"/>
  </svg>
);

const TagIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-5 5a2 2 0 0 1-2.828 0l-7-7A2 2 0 0 1 3 10V5a2 2 0 0 1 2-2z"/>
  </svg>
);

const CATEGORY_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

export default function PriceList() {
  const { data, isLoading } = useGetProductsQuery({ page: 1, limit: 500 });
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const products = data?.data || [];

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    return ['All', ...cats];
  }, [products]);

  const catColorMap = useMemo(() => {
    const map = {};
    categories.filter(c => c !== 'All').forEach((c, i) => {
      map[c] = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
    });
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'All' || p.category?.name === activeCategory;
      const matchSearch = !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, search]);

  return (
    <div className="p-4 md:p-6 space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
          <TagIcon />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Price List</h1>
          <p className="text-xs text-slate-400">{filtered.length} of {products.length} products</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Category tabs — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              activeCategory === cat
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
              <div className="h-3 bg-slate-200 rounded mb-3 w-3/4" />
              <div className="h-5 bg-slate-100 rounded mb-2 w-1/2" />
              <div className="h-7 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <p className="text-sm font-medium">No products found</p>
          {search && <p className="text-xs mt-1">Try a different search term</p>}
        </div>
      )}

      {/* Product cards — 2 cols mobile, 3 tablet, 4 desktop */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(p => {
            const catName = p.category?.name;
            const catColor = catColorMap[catName] || 'bg-slate-100 text-slate-600';
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2 hover:shadow-md hover:border-orange-200 transition-all"
              >
                {/* Category badge */}
                {catName && (
                  <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor}`}>
                    {catName}
                  </span>
                )}

                {/* Product name */}
                <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-3">
                  {p.name}
                </p>

                {/* Unit */}
                {p.unit && (
                  <p className="text-xs text-slate-400">per {p.unit}</p>
                )}

                {/* Price */}
                <div className="mt-auto pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-0.5">Selling Price</p>
                  <p className="text-xl font-extrabold text-orange-600 leading-none">
                    Rs.&nbsp;{fmt(p.selling_price)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop table view (hidden on mobile) */}
      {/* Already covered by card grid above — cards look great on all sizes */}
    </div>
  );
}
