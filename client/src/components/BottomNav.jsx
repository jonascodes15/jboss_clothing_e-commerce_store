import { NavLink } from 'react-router-dom';
import { Home, Grid, ShoppingBag, Heart, User } from 'lucide-react';
import { useStore } from '../context/store';
import './BottomNav.css';

const tabs = [
  { to: '/',         icon: Home,        label: 'Home' },
  { to: '/shop',     icon: Grid,        label: 'Shop' },
  { to: '/cart',     icon: ShoppingBag, label: 'Cart' },
  { to: '/wishlist', icon: Heart,       label: 'Saved' },
  { to: '/account',  icon: User,        label: 'Me' },
];

export default function BottomNav() {
  const cartCount = useStore(s => s.cartCount());
  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to==='/'} className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
          <span className="tab-icon-wrap">
            <Icon size={21} strokeWidth={1.8} />
            {label === 'Cart' && cartCount > 0 && (
              <span className="cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </span>
          <span className="tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
