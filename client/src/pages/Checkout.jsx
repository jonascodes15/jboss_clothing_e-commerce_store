import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, ChevronLeft } from 'lucide-react';
import api from '../utils/api';
import { useStore } from '../context/store';
import toast from 'react-hot-toast';
import './Checkout.css';

const fmt = n => `₦${Number(n).toLocaleString()}`;

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, fetchCart } = useStore();
  const [addresses, setAddresses]     = useState([]);
  const [selected, setSelected]       = useState(null);
  const [showForm, setShowForm]       = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [note, setNote]               = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm] = useState({ full_name:'', phone:'', street:'', city:'', state:'', label:'Home' });

  useEffect(() => {
    fetchCart();
    api.get('/addresses').then(r => {
      setAddresses(r.data);
      const def = r.data.find(a => a.is_default) || r.data[0];
      if (def) setSelected(def.id);
      if (!r.data.length) setShowForm(true);
    });
    api.get('/settings').then(r => setDeliveryFee(parseFloat(r.data.delivery_fee || 0)));
  }, []);

  const saveAddress = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.street || !form.city || !form.state) {
      toast.error('Please fill all fields'); return;
    }
    try {
      const { data } = await api.post('/addresses', { ...form, is_default: addresses.length === 0 });
      const newAddr = { ...form, id: data.id };
      setAddresses(p => [...p, newAddr]);
      setSelected(data.id);
      setShowForm(false);
      toast.success('Address saved');
    } catch { toast.error('Could not save address'); }
  };

  const handlePay = async () => {
    if (!selected) { toast.error('Select a delivery address'); return; }
    setSubmitting(true);
    try {
      const items = cartItems.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity }));
      const { data } = await api.post('/orders/initialize', { items, address_id: selected, delivery_note: note });
      window.location.href = data.authorization_url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not initiate payment');
      setSubmitting(false);
    }
  };

  const subtotal = cartTotal();
  const total = subtotal + deliveryFee;

  return (
    <div className="checkout page">
      <div style={{padding:'14px 16px 0', display:'flex', alignItems:'center', gap:12}}>
        <button className="pd-icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1 className="page-title" style={{padding:0}}>Checkout</h1>
      </div>

      <div className="container">
        {/* Address */}
        <section className="checkout-section">
          <p className="section-label">Delivery Address</p>
          {addresses.map(a => (
            <button key={a.id} className={`addr-card${selected === a.id ? ' selected' : ''}`} onClick={() => setSelected(a.id)}>
              <MapPin size={15} className="addr-card__icon" />
              <div>
                <p className="addr-card__name">{a.full_name} · {a.label}</p>
                <p className="addr-card__line">{a.street}, {a.city}, {a.state}</p>
                <p className="addr-card__phone">{a.phone}</p>
              </div>
            </button>
          ))}
          {!showForm && (
            <button className="addr-add" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add new address
            </button>
          )}
          {showForm && (
            <form className="addr-form" onSubmit={saveAddress}>
              <input placeholder="Full name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
              <input placeholder="Phone number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <input placeholder="Street address" value={form.street} onChange={e => setForm({...form, street: e.target.value})} />
              <div className="addr-form__row">
                <input placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                <input placeholder="State" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-outline btn-full">Save Address</button>
            </form>
          )}
        </section>

        {/* Note */}
        <section className="checkout-section">
          <p className="section-label">Note (optional)</p>
          <textarea rows={3} placeholder="Any delivery instructions..." value={note} onChange={e => setNote(e.target.value)} />
        </section>

        {/* Summary */}
        <section className="checkout-section">
          <p className="section-label">Order Summary</p>
          <div className="checkout-summary">
            {cartItems.map(i => (
              <div key={i.id} className="checkout-summary__row">
                <span>{i.name} {i.size && `(${i.size})`} × {i.quantity}</span>
                <span>{fmt(parseFloat(i.sale_price || i.price) * i.quantity)}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="checkout-summary__row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="checkout-summary__row"><span>Delivery</span><span>{fmt(deliveryFee)}</span></div>
            <div className="divider" />
            <div className="checkout-summary__row checkout-summary__row--total">
              <span>Total</span><span className="price">{fmt(total)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="cart-cta" style={{bottom:0}}>
        <button className="btn btn-white btn-full" onClick={handlePay} disabled={submitting}>
          {submitting ? <span className="spinner" style={{width:18,height:18,borderWidth:2,borderTopColor:'#000'}} /> : `Pay ${fmt(total)} via Paystack`}
        </button>
      </div>
    </div>
  );
}
