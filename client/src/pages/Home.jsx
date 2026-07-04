import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Instagram, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import './Home.css';

export default function Home() {
  const [featured, setFeatured]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [newest, setNewest]         = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products?featured=true&limit=6'),
      api.get('/categories'),
      api.get('/products?sort=newest&limit=8'),
    ]).then(([f, c, n]) => {
      setFeatured(f.data.products);
      setCategories(c.data);
      setNewest(n.data.products);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="home page">

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="hero">
        <p className="hero__eyebrow">New Collection · 2025</p>
        <h1 className="hero__title">Wear<br />what<br /><em>you are.</em></h1>
        <p className="hero__sub">
          No hype. No gatekeeping.<br />
          Just clean clothes made with intention.
        </p>
        <div className="hero__actions">
          <Link to="/shop" className="btn btn-white">Shop Now <ArrowRight size={15} /></Link>
          <Link to="/shop?category=drops" className="btn btn-outline">Latest Drops</Link>
        </div>
      </section>

      {/* ── Category row ───────────────────────────────────── */}
      <section className="home-section">
        <div className="home-section__head">
          <p className="section-label">Browse by</p>
          <h2 className="home-section__title">Category</h2>
        </div>
        <div className="cat-scroll">
          {loading
            ? Array(5).fill(0).map((_,i) => <div key={i} className="skeleton cat-chip" style={{width:80,height:34}} />)
            : categories.map(c => (
              <Link key={c.id} to={`/shop?category=${c.slug}`} className="cat-chip">
                {c.name}
              </Link>
            ))
          }
        </div>
      </section>

      {/* ── Featured ───────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <div>
              <p className="section-label">Handpicked</p>
              <h2 className="home-section__title">Featured</h2>
            </div>
            <Link to="/shop?featured=true" className="see-all">All <ChevronRight size={13} /></Link>
          </div>
          <div className="product-grid">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Statement ──────────────────────────────────────── */}
      <section className="statement-banner">
        <p className="statement-banner__top">Made for people who</p>
        <h2 className="statement-banner__line">know what they want</h2>
        <p className="statement-banner__bottom">before the world tells them.</p>
        <Link to="/about" className="statement-banner__link">
          Our story <ArrowRight size={14} />
        </Link>
      </section>

      {/* ── New Arrivals ───────────────────────────────────── */}
      {newest.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <div>
              <p className="section-label">Just landed</p>
              <h2 className="home-section__title">New Arrivals</h2>
            </div>
            <Link to="/shop?sort=newest" className="see-all">All <ChevronRight size={13} /></Link>
          </div>
          <div className="product-grid">
            {newest.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Trust / values ─────────────────────────────────── */}
      <section className="values-row">
        {[
          { icon: '✦', label: 'Quality Fabrics', sub: 'Every piece checked' },
          { icon: '📦', label: 'Lagos Delivery', sub: 'We bring it to you' },
          { icon: '↩', label: 'Easy Returns', sub: '7-day return window' },
          { icon: '💬', label: 'WhatsApp Support', sub: 'Always reachable' },
        ].map(v => (
          <div key={v.label} className="value-item">
            <span className="value-icon">{v.icon}</span>
            <p className="value-label">{v.label}</p>
            <p className="value-sub">{v.sub}</p>
          </div>
        ))}
      </section>

      {/* ── Instagram CTA ──────────────────────────────────── */}
      <section className="ig-cta">
        <a href="https://instagram.com" target="_blank" rel="noreferrer">
          <Instagram size={20} />
          <span>Follow the fits on Instagram</span>
          <ArrowRight size={16} />
        </a>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="home-footer">
        <p className="home-footer__logo">JBOSS</p>
        <p className="home-footer__tag">"Wear what you are."</p>
        <div className="home-footer__links">
          <Link to="/about">About</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/account">Account</Link>
        </div>
        <p className="home-footer__copy">© {new Date().getFullYear()} Jboss Clothing</p>
      </footer>
    </div>
  );
}
