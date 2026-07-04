// ─── Account ──────────────────────────────────────────────────────────────────
import { Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, Heart, LogOut, ChevronRight, ShieldCheck, Instagram } from 'lucide-react';
import { useStore } from '../context/store';
import './Account.css';

export default function Account() {
  const navigate = useNavigate();
  const { user, logout } = useStore();

  if (!user) return (
    <div className="empty-state page">
      <ShieldCheck size={48} strokeWidth={1} />
      <h2>Sign in to your account</h2>
      <p>Track orders, save favourites & more</p>
      <Link to="/login" className="btn btn-gold">Sign In</Link>
    </div>
  );

  const links = [
    { to: '/account/orders',    icon: Package, label: 'My Orders' },
    { to: '/account/addresses', icon: MapPin,  label: 'Addresses' },
    { to: '/wishlist',          icon: Heart,   label: 'Wishlist' },
    { to: '/about',             icon: null,    label: 'About Jboss' },
  ];

  return (
    <div className="account page">
      <div className="container">
        <div className="account-profile">
          <div className="account-avatar">{user.full_name?.[0] || 'J'}</div>
          <div>
            <p className="account-name">{user.full_name}</p>
            <p className="account-email">{user.email}</p>
          </div>
          {user.role === 'admin' && <span className="badge badge-gold" style={{marginLeft:'auto'}}>Admin</span>}
        </div>

        {user.role === 'admin' && (
          <Link to="/admin" className="account-admin-link">
            Go to Admin Dashboard <ChevronRight size={16} />
          </Link>
        )}

        <div className="account-links">
          {links.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="account-link">
              {Icon && <Icon size={17} strokeWidth={1.7} />}
              <span>{label}</span>
              <ChevronRight size={15} className="account-link__chev" />
            </Link>
          ))}
        </div>

        <a href="https://instagram.com" target="_blank" rel="noreferrer" className="account-ig">
          <Instagram size={17} /><span>Follow us on Instagram</span>
        </a>

        <button className="account-logout" onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={15} /> Log out
        </button>

        <p className="account-tag">"Wear what you are."</p>
      </div>
    </div>
  );
}
