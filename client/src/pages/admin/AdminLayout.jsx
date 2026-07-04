import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, FolderTree, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { useStore } from '../../context/store';
import './Admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useStore();

  if (!user || user.role !== 'admin') return (
    <div className="empty-state page">
      <h2>Admin access only</h2>
      <button className="btn btn-gold" onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  const tabs = [
    { to: '/admin',            icon: LayoutDashboard, label: 'Home',       end: true },
    { to: '/admin/products',   icon: Package,         label: 'Products' },
    { to: '/admin/categories', icon: FolderTree,       label: 'Categories' },
    { to: '/admin/orders',     icon: ShoppingCart,     label: 'Orders' },
    { to: '/admin/settings',   icon: Settings,         label: 'Settings' },
  ];

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <button onClick={() => navigate('/')} className="admin-header__back"><ArrowLeft size={18} /></button>
        <span className="admin-header__title">JBOSS Admin</span>
        <button onClick={() => { logout(); navigate('/'); }} className="admin-header__out"><LogOut size={18} /></button>
      </header>
      <main className="admin-main"><Outlet /></main>
      <nav className="admin-tabs">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-tab${isActive ? ' active' : ''}`}>
            <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
