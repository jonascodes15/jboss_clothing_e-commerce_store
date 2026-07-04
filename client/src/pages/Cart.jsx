import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/store';
import toast from 'react-hot-toast';
import './Cart.css';

const fmt = n => `₦${Number(n).toLocaleString()}`;

export default function Cart() {
  const navigate = useNavigate();
  const { user, cartItems, fetchCart, updateCartItem, removeFromCart, cartTotal } = useStore();

  useEffect(() => { if (user) fetchCart(); }, [user]);

  if (!user) return (
    <div className="empty-state page">
      <ShoppingBag size={52} strokeWidth={1} />
      <h2>Sign in to view your cart</h2>
      <p>Your saved items will be waiting</p>
      <Link to="/login" className="btn btn-gold">Sign In</Link>
    </div>
  );

  if (cartItems.length === 0) return (
    <div className="empty-state page">
      <ShoppingBag size={52} strokeWidth={1} />
      <h2>Your cart is empty</h2>
      <p>Find something you love</p>
      <Link to="/shop" className="btn btn-gold">Browse Shop</Link>
    </div>
  );

  const total = cartTotal();
  const hasPreorder = cartItems.some(i => i.availability === 'preorder');

  return (
    <div className="cart page">
      <div className="container">
        <h1 className="page-title">Cart</h1>

        <div className="cart-list">
          {cartItems.map(item => {
            const price = parseFloat(item.sale_price || item.price);
            return (
              <div key={item.id} className="cart-item">
                <Link to={`/product/${item.slug}`} className="cart-item__img">
                  {item.image ? <img src={item.image} alt={item.name} /> : <ShoppingBag size={18} strokeWidth={1} />}
                </Link>
                <div className="cart-item__body">
                  <p className="cart-item__name">{item.name}</p>
                  <div className="cart-item__variant">
                    {item.color && (
                      <span className="cart-item__variant-dot"
                        style={{ background: item.color_hex || '#888' }} />
                    )}
                    <span>{[item.color, item.size].filter(Boolean).join(' · ')}</span>
                  </div>
                  <p className="price cart-item__price">{fmt(price)}</p>
                  <div className="cart-item__controls">
                    <div className="qty-control">
                      <button onClick={() => updateCartItem(item.id, item.quantity - 1).catch(() => toast.error('Error'))}><Minus size={12} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartItem(item.id, item.quantity + 1).catch(() => toast.error('Error'))}><Plus size={12} /></button>
                    </div>
                    <button className="cart-item__remove" onClick={() => removeFromCart(item.id).then(() => toast.success('Removed')).catch(() => {})}>
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasPreorder && (
          <p className="cart-note">
            Your cart includes pre-order items — these will ship once ready.
          </p>
        )}

        <div className="cart-summary">
          <div className="cart-summary__row">
            <span>Subtotal</span><span>{fmt(total)}</span>
          </div>
          <div className="cart-summary__row" style={{fontSize:11, color:'var(--gray)'}}>
            <span>Delivery fee calculated at checkout</span>
          </div>
          <div className="divider" />
          <div className="cart-summary__row cart-summary__row--total">
            <span>Total</span><span className="price">{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div className="cart-cta">
        <button className="btn btn-white btn-full" onClick={() => navigate('/checkout')}>
          Checkout <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
