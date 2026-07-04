import { create } from 'zustand';
import api from '../utils/api';

export const useStore = create((set, get) => ({
  user:  JSON.parse(localStorage.getItem('jbc_user') || 'null'),
  token: localStorage.getItem('jbc_token') || null,

  setAuth: (token, user) => {
    localStorage.setItem('jbc_token', token);
    localStorage.setItem('jbc_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('jbc_token');
    localStorage.removeItem('jbc_user');
    set({ token: null, user: null, cartItems: [] });
  },

  cartItems: [],
  cartLoading: false,

  fetchCart: async () => {
    if (!get().token) return;
    set({ cartLoading: true });
    try {
      const { data } = await api.get('/cart');
      set({ cartItems: data });
    } catch {}
    finally { set({ cartLoading: false }); }
  },

  addToCart: async (product_id, variant_id, quantity = 1) => {
    await api.post('/cart', { product_id, variant_id, quantity });
    await get().fetchCart();
  },

  removeFromCart: async (id) => {
    await api.delete(`/cart/${id}`);
    set(s => ({ cartItems: s.cartItems.filter(i => i.id !== id) }));
  },

  updateCartItem: async (id, quantity) => {
    await api.patch(`/cart/${id}`, { quantity });
    if (quantity < 1) set(s => ({ cartItems: s.cartItems.filter(i => i.id !== id) }));
    else set(s => ({ cartItems: s.cartItems.map(i => i.id === id ? { ...i, quantity } : i) }));
  },

  cartCount: () => get().cartItems.reduce((s, i) => s + i.quantity, 0),
  cartTotal: () => get().cartItems.reduce((s, i) => s + parseFloat(i.sale_price || i.price) * i.quantity, 0),
}));
