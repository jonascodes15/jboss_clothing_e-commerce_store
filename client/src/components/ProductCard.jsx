import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '../context/store';
import toast from 'react-hot-toast';
import api from '../utils/api';
import './ProductCard.css';

const fmt = n => `₦${Number(n).toLocaleString()}`;

export default function ProductCard({ product }) {
  const { user } = useStore();

  const colors = product.available_colors
    ? product.available_colors.split(',').filter(Boolean)
    : [];

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) { window.location.href = '/login'; return; }
    try { await api.post('/wishlist', { product_id: product.id }); toast.success('Saved'); }
    catch { toast.error('Could not save'); }
  };

  const hasDiscount = product.sale_price && parseFloat(product.sale_price) < parseFloat(product.price);
  const displayPrice = product.sale_price || product.price;

  return (
    <Link to={`/product/${product.slug}`} className="pcard fade-in">
      <div className="pcard__img-wrap">
        {product.primary_image
          ? <img src={product.primary_image} alt={product.name} loading="lazy" />
          : <div className="pcard__no-img">👕</div>
        }
        <button className="pcard__wish" onClick={handleWishlist} aria-label="Save">
          <Heart size={14} strokeWidth={2} />
        </button>
        {product.availability === 'preorder' && <span className="pcard__tag tag-pre">Pre-order</span>}
        {product.availability === 'sold_out'  && <span className="pcard__tag tag-sold">Sold Out</span>}
        {product.is_featured && product.availability === 'buy' && <span className="pcard__tag tag-drop">Featured</span>}
      </div>

      <div className="pcard__body">
        <p className="pcard__cat">{product.category_name}</p>
        <h3 className="pcard__name">{product.name}</h3>

        {colors.length > 0 && (
          <div className="pcard__colors">
            {colors.slice(0, 5).map(c => (
              <span key={c} className="pcard__color-dot" title={c}
                style={{ background: c.toLowerCase().startsWith('#') ? c : undefined,
                         border: '1px solid var(--border)' }} />
            ))}
            {colors.length > 5 && <span className="pcard__color-more">+{colors.length - 5}</span>}
          </div>
        )}

        <div className="pcard__foot">
          <div>
            <span className={`price${hasDiscount ? ' price-sale' : ''}`}>{fmt(displayPrice)}</span>
            {hasDiscount && <span className="price-old"> {fmt(product.price)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
