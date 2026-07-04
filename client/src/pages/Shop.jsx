import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import './Shop.css';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'popular',    label: 'Popular' },
  { value: 'price_asc',  label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const category     = params.get('category') || '';
  const sort         = params.get('sort') || 'newest';
  const search       = params.get('search') || '';
  const availability = params.get('availability') || '';
  const featured     = params.get('featured') || '';

  const fetchProducts = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ sort, page: pg, limit: 12 });
      if (category)     q.set('category', category);
      if (search)       q.set('search', search);
      if (availability) q.set('availability', availability);
      if (featured)     q.set('featured', featured);
      const { data } = await api.get(`/products?${q}`);
      setProducts(pg === 1 ? data.products : prev => [...prev, ...data.products]);
      setTotal(data.total);
      setPage(pg);
    } finally { setLoading(false); }
  }, [category, sort, search, availability, featured]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);
  useEffect(() => { api.get('/categories').then(r => setCategories(r.data)); }, []);

  const setParam = (key, val) => {
    const p = new URLSearchParams(params);
    if (val) p.set(key, val); else p.delete(key);
    setParams(p);
  };

  return (
    <div className="shop page">
      {/* Sticky top bar */}
      <div className="shop-topbar">
        <div className="shop-search">
          <Search size={15} className="shop-search__icon" />
          <input
            placeholder="Search pieces…"
            defaultValue={search}
            onKeyDown={e => e.key === 'Enter' && setParam('search', e.target.value)}
          />
        </div>
        <button className="shop-filter-btn" onClick={() => setShowFilter(true)}>
          <SlidersHorizontal size={17} />
        </button>
      </div>

      {/* Category chips */}
      <div className="cat-scroll shop-cats">
        <button className={`cat-chip${!category ? ' active' : ''}`} onClick={() => setParam('category', '')}>All</button>
        {categories.map(c => (
          <button key={c.id}
            className={`cat-chip${category === c.slug ? ' active' : ''}`}
            onClick={() => setParam('category', c.slug)}
          >{c.name}</button>
        ))}
      </div>

      {/* Meta row */}
      <div className="shop-meta">
        <span className="shop-count">{total} piece{total !== 1 ? 's' : ''}</span>
        <select value={sort} onChange={e => setParam('sort', e.target.value)} className="shop-sort">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading && products.length === 0
        ? <div className="shop-grid">
            {Array(6).fill(0).map((_,i) => (
              <div key={i} className="skeleton" style={{aspectRatio:'3/4', borderRadius:'var(--radius)'}} />
            ))}
          </div>
        : products.length === 0
          ? <div className="shop-empty">
              <p>👕</p>
              <p>No pieces found</p>
              <button className="btn btn-outline" onClick={() => setParams({})}>Clear filters</button>
            </div>
          : <>
              <div className="shop-grid">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              {products.length < total && (
                <div style={{padding:'20px 16px'}}>
                  <button className="btn btn-outline btn-full" onClick={() => fetchProducts(page + 1)} disabled={loading}>
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
      }

      {/* Filter drawer */}
      {showFilter && (
        <div className="filter-overlay" onClick={() => setShowFilter(false)}>
          <div className="filter-drawer" onClick={e => e.stopPropagation()}>
            <div className="filter-drawer__head">
              <h3>Filter</h3>
              <button onClick={() => setShowFilter(false)}><X size={20} /></button>
            </div>
            <div className="filter-group">
              <p className="filter-label">Availability</p>
              {[['', 'All'], ['buy', 'Buy Now'], ['preorder', 'Pre-order']].map(([v, l]) => (
                <button key={v}
                  className={`filter-opt${availability === v ? ' selected' : ''}`}
                  onClick={() => { setParam('availability', v); setShowFilter(false); }}
                >{l}</button>
              ))}
            </div>
            <button className="btn btn-gold btn-full" style={{marginTop:16}} onClick={() => setShowFilter(false)}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
