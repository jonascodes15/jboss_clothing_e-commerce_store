import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Share2, ShoppingBag, Star, Clock } from 'lucide-react';
import api from '../utils/api';
import { useStore } from '../context/store';
import toast from 'react-hot-toast';
import './ProductDetail.css';

const fmt = n => `₦${Number(n).toLocaleString()}`;

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, addToCart } = useStore();

  const [product, setProduct]       = useState(null);
  const [activeImg, setActiveImg]   = useState(0);
  const [selectedColor, setColor]   = useState(null);
  const [selectedSize, setSize]     = useState(null);
  const [adding, setAdding]         = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get(`/products/${slug}`)
      .then(r => setProduct(r.data))
      .catch(() => { toast.error('Product not found'); navigate('/shop'); })
      .finally(() => setLoading(false));
  }, [slug]);

  // Derived data from variants
  const { uniqueColors, uniqueSizes, selectedVariant } = useMemo(() => {
    if (!product?.variants) return { uniqueColors: [], uniqueSizes: [], selectedVariant: null };

    const colorsMap = {};
    product.variants.forEach(v => {
      if (!colorsMap[v.color]) colorsMap[v.color] = { color: v.color, hex: v.color_hex, hasStock: false };
      if (v.stock_qty > 0) colorsMap[v.color].hasStock = true;
    });
    const uniqueColors = Object.values(colorsMap);

    // Sizes available for selected color (or all sizes)
    const relevantVariants = selectedColor
      ? product.variants.filter(v => v.color === selectedColor)
      : product.variants;
    const sizesMap = {};
    relevantVariants.forEach(v => {
      if (!sizesMap[v.size]) sizesMap[v.size] = { size: v.size, stock: 0 };
      sizesMap[v.size].stock += v.stock_qty;
    });
    const sizeOrder = ['XS','S','M','L','XL','XXL','XXXL'];
    const uniqueSizes = Object.values(sizesMap).sort((a,b) => {
      const ai = sizeOrder.indexOf(a.size); const bi = sizeOrder.indexOf(b.size);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const selectedVariant = selectedColor && selectedSize
      ? product.variants.find(v => v.color === selectedColor && v.size === selectedSize)
      : null;

    return { uniqueColors, uniqueSizes, selectedVariant };
  }, [product, selectedColor, selectedSize]);

  const handleAddToCart = async () => {
    if (!user) { navigate('/login', { state: { from: `/product/${slug}` } }); return; }
    if (!selectedColor) { toast.error('Please select a color'); return; }
    if (!selectedSize)  { toast.error('Please select a size');  return; }
    if (!selectedVariant || selectedVariant.stock_qty < 1) { toast.error('This combination is out of stock'); return; }
    setAdding(true);
    try {
      await addToCart(product.id, selectedVariant.id);
      toast.success(product.availability === 'preorder' ? 'Pre-order added to cart!' : 'Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart');
    } finally { setAdding(false); }
  };

  const handleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    try { await api.post('/wishlist', { product_id: product.id }); toast.success('Saved to wishlist'); }
    catch { toast.error('Could not save'); }
  };

  const handleShare = async () => {
    try { await navigator.share({ title: product.name, url: window.location.href }); }
    catch { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
  };

  if (loading) return <div className="page pd-loading"><div className="spinner" /></div>;
  if (!product) return null;

  const { images = [], reviews = [], variants = [] } = product;
  const hasDiscount  = product.sale_price && parseFloat(product.sale_price) < parseFloat(product.price);
  const displayPrice = product.sale_price || product.price;
  const totalStock   = variants.reduce((s, v) => s + v.stock_qty, 0);
  const avgRating    = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="pd page">

      {/* Top nav */}
      <div className="pd-topbar">
        <button className="pd-icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={21} /></button>
        <div style={{ display:'flex', gap:8 }}>
          <button className="pd-icon-btn" onClick={handleWishlist}><Heart size={19} strokeWidth={1.8} /></button>
          <button className="pd-icon-btn" onClick={handleShare}><Share2 size={19} strokeWidth={1.8} /></button>
        </div>
      </div>

      {/* Image gallery */}
      <div className="pd-gallery">
        <div className="pd-gallery__main">
          {images.length
            ? <img src={images[activeImg]?.url} alt={product.name} />
            : <div className="pd-gallery__empty">👕</div>
          }
        </div>
        {images.length > 1 && (
          <div className="pd-gallery__thumbs">
            {images.map((img, i) => (
              <button key={img.id} className={`pd-thumb${i === activeImg ? ' active' : ''}`} onClick={() => setActiveImg(i)}>
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pd-content">
        <p className="pd-cat">{product.category_name}</p>
        <h1 className="pd-name">{product.name}</h1>

        {/* Price row */}
        <div className="pd-price-row">
          <div>
            <span className={`price pd-price${hasDiscount ? ' price-sale' : ''}`}>{fmt(displayPrice)}</span>
            {hasDiscount && <span className="price-old"> {fmt(product.price)}</span>}
          </div>
          {avgRating && (
            <div className="pd-rating">
              <Star size={12} fill="var(--gold)" stroke="none" />
              <span>{avgRating}</span>
              <span className="pd-rating__count">({reviews.length})</span>
            </div>
          )}
        </div>

        {/* Availability tags */}
        <div className="pd-tags">
          {product.availability === 'preorder' && <span className="badge badge-gold"><Clock size={10} /> Pre-order</span>}
          {product.availability === 'sold_out'  && <span className="badge badge-danger">Sold Out</span>}
          {totalStock > 0 && totalStock <= 5 && product.availability === 'buy' && (
            <span className="badge badge-danger">Only {totalStock} left</span>
          )}
        </div>

        {/* ── Color picker ── */}
        {uniqueColors.length > 0 && (
          <div className="pd-option-group">
            <p className="pd-option-label">
              Color {selectedColor && <span className="pd-option-value">— {selectedColor}</span>}
            </p>
            <div className="pd-colors">
              {uniqueColors.map(c => (
                <button
                  key={c.color}
                  className={`color-swatch${selectedColor === c.color ? ' selected' : ''}${!c.hasStock ? ' oos' : ''}`}
                  style={{ background: c.hex || '#888' }}
                  title={c.color}
                  onClick={() => { setColor(c.color); setSize(null); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Size picker ── */}
        {uniqueSizes.length > 0 && (
          <div className="pd-option-group">
            <p className="pd-option-label">
              Size {selectedSize && <span className="pd-option-value">— {selectedSize}</span>}
            </p>
            <div className="pd-sizes">
              {uniqueSizes.map(s => (
                <button
                  key={s.size}
                  className={`size-chip${selectedSize === s.size ? ' selected' : ''}${s.stock === 0 ? ' oos' : ''}`}
                  onClick={() => setSize(s.size)}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {selectedVariant && selectedVariant.stock_qty > 0 && selectedVariant.stock_qty <= 3 && (
              <p className="pd-low-stock">Only {selectedVariant.stock_qty} left in this size!</p>
            )}
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="pd-desc">
            <p className="section-label">About</p>
            <p>{product.description}</p>
          </div>
        )}

        {/* Specs */}
        {(product.material || product.care_instructions) && (
          <div className="pd-specs">
            {product.material        && <div className="pd-spec"><span>Material</span><p>{product.material}</p></div>}
            {product.care_instructions && <div className="pd-spec"><span>Care</span><p>{product.care_instructions}</p></div>}
          </div>
        )}

        {/* Pre-order note */}
        {product.availability === 'preorder' && product.lead_time_days && (
          <div className="pd-preorder-note">
            <Clock size={14} />
            Ready in approximately {product.lead_time_days} days after order
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="pd-reviews">
            <p className="section-label">Reviews</p>
            {reviews.map((r, i) => (
              <div key={i} className="pd-review">
                <div className="pd-review__head">
                  <div className="pd-review__avatar">{r.full_name[0]}</div>
                  <div>
                    <p className="pd-review__name">{r.full_name}</p>
                    <div className="pd-review__stars">
                      {Array(5).fill(0).map((_,s) => (
                        <Star key={s} size={10} fill={s < r.rating ? 'var(--gold)' : 'var(--border)'} stroke="none" />
                      ))}
                    </div>
                  </div>
                </div>
                {r.body && <p className="pd-review__body">{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {product.availability !== 'sold_out' && (
        <div className="pd-cta">
          <button className="btn btn-white btn-full" onClick={handleAddToCart} disabled={adding}>
            {adding
              ? <span className="spinner" style={{width:18,height:18,borderWidth:2,borderTopColor:'#000'}} />
              : product.availability === 'preorder'
                ? <><Clock size={15} /> Pre-order</>
                : <><ShoppingBag size={15} /> Add to Cart</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
