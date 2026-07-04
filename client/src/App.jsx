import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import BottomNav from './components/BottomNav';

import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import { Login, Register } from './pages/Auth';
import {
  Orders, OrderDetail, OrderVerify,
  Wishlist, Addresses, About,
} from './pages/SubPages';

import AdminLayout from './pages/admin/AdminLayout';
import AdminProductForm from './pages/admin/AdminProductForm';
import {
  AdminDashboard, AdminProducts,
  AdminCategories, AdminOrders, AdminSettings,
} from './pages/admin/AdminPages';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ShowNav() {
  const { pathname } = useLocation();
  const hide = ['/login', '/register', '/checkout', '/admin'].some(p => pathname === p || pathname.startsWith('/admin'));
  return hide ? null : <BottomNav />;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#f0f0ec',
            border: '1px solid #2a2a2a',
            fontSize: '13px',
            borderRadius: '10px',
          },
        }}
      />

      <Routes>
        {/* Customer routes */}
        <Route path="/"                element={<Home />} />
        <Route path="/shop"            element={<Shop />} />
        <Route path="/product/:slug"   element={<ProductDetail />} />
        <Route path="/cart"            element={<Cart />} />
        <Route path="/checkout"        element={<Checkout />} />
        <Route path="/order/verify"    element={<OrderVerify />} />
        <Route path="/wishlist"        element={<Wishlist />} />
        <Route path="/about"           element={<About />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/account"         element={<Account />} />
        <Route path="/account/orders"          element={<Orders />} />
        <Route path="/account/orders/:ref"     element={<OrderDetail />} />
        <Route path="/account/addresses"       element={<Addresses />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index              element={<AdminDashboard />} />
          <Route path="products"   element={<AdminProducts />} />
          <Route path="products/:id" element={<AdminProductForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders"     element={<AdminOrders />} />
          <Route path="settings"   element={<AdminSettings />} />
        </Route>
      </Routes>

      <ShowNav />
    </>
  );
}
