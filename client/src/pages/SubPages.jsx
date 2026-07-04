import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Package, Heart, X, MapPin, Trash2, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../utils/api';
import { useStore } from '../context/store';
import toast from 'react-hot-toast';

const fmt = n => `₦${Number(n).toLocaleString()}`;

const STATUS_BADGE = {
  pending_payment: 'badge-gray', payment_failed: 'badge-danger',
  paid: 'badge-gold', confirmed: 'badge-gold', processing: 'badge-gold',
  shipped: 'badge-green', delivered: 'badge-green',
  cancelled: 'badge-danger', refunded: 'badge-danger',
};
const STATUS_LABEL = {
  pending_payment: 'Pending', payment_failed: 'Failed',
  paid: 'Paid', confirmed: 'Confirmed', processing: 'Processing',
  shipped: 'Shipped', delivered: 'Delivered',
  cancelled: 'Cancelled', refunded: 'Refunded',
};
const TIMELINE = ['paid','confirmed','processing','shipped','delivered'];

// ── Orders list ───────────────────────────────────────────────────────────────
export function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/orders/mine').then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px 0'}}>
        <button className="pd-icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1 className="page-title" style={{padding:0}}>My Orders</h1>
      </div>
      <div className="container" style={{paddingTop:16}}>
        {loading
          ? Array(3).fill(0).map((_,i) => <div key={i} className="skeleton" style={{height:76,borderRadius:'var(--radius)',marginBottom:10}} />)
          : orders.length === 0
            ? <div className="empty-state" style={{minHeight:'50dvh'}}>
                <Package size={44} strokeWidth={1} />
                <h2>No orders yet</h2>
                <Link to="/shop" className="btn btn-gold">Start Shopping</Link>
              </div>
            : orders.map(o => (
              <Link key={o.id} to={`/account/orders/${o.order_ref}`} className="order-card">
                <div className="order-card__top">
                  <span className="order-card__ref">{o.order_ref}</span>
                  <span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </div>
                <div className="order-card__bottom">
                  <span>{o.item_count} item{o.item_count > 1 ? 's' : ''} · {new Date(o.created_at).toLocaleDateString()}</span>
                  <span className="price">{fmt(o.total_amount)}</span>
                </div>
              </Link>
            ))
        }
      </div>
    </div>
  );
}

// ── Order detail ─────────────────────────────────────────────────────────────
export function OrderDetail() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  useEffect(() => { api.get(`/orders/${ref}`).then(r => setOrder(r.data)); }, [ref]);

  if (!order) return <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80dvh'}}><div className="spinner" /></div>;

  const idx = TIMELINE.indexOf(order.status);
  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px 0'}}>
        <button className="pd-icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1 className="page-title" style={{padding:0,fontSize:16}}>{order.order_ref}</h1>
      </div>
      <div className="container" style={{paddingTop:16}}>
        {idx >= 0 && (
          <div style={{padding:'16px 0'}}>
            {TIMELINE.map((step, i) => (
              <div key={step} style={{display:'flex',alignItems:'center',gap:12,paddingBottom:i<TIMELINE.length-1?20:0,position:'relative',color:i<=idx?'var(--white)':'var(--gray)'}}>
                {i < TIMELINE.length-1 && <div style={{position:'absolute',left:5,top:14,bottom:0,width:1,background:'var(--border)'}} />}
                <div style={{width:11,height:11,borderRadius:'50%',background:i<=idx?'var(--gold)':'var(--border)',flexShrink:0,zIndex:1}} />
                <span style={{fontSize:13,fontWeight:600,textTransform:'capitalize'}}>{step.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{padding:16,marginTop:16,background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)'}}>
          <p className="section-label">Items</p>
          {order.items?.map(i => (
            <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',color:'var(--gray-light)'}}>
              <span>{i.product_name} {i.size && `(${i.size}${i.color ? ` / ${i.color}` : ''})`} × {i.quantity}</span>
              <span>{fmt(i.line_total)}</span>
            </div>
          ))}
          <div className="divider" />
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:700}}>
            <span>Total</span><span className="price">{fmt(order.total_amount)}</span>
          </div>
        </div>

        {order.street && (
          <div style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,marginTop:12}}>
            <p className="section-label">Delivery Address</p>
            <p style={{fontSize:13,color:'var(--gray-light)',marginTop:6}}>{order.street}, {order.city}, {order.state}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order verify ─────────────────────────────────────────────────────────────
export function OrderVerify() {
  const [params] = useSearchParams();
  const ref = params.get('ref') || params.get('reference');
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (!ref) { setStatus('failed'); return; }
    api.get(`/orders/verify?ref=${ref}`).then(() => setStatus('success')).catch(() => setStatus('failed'));
  }, [ref]);

  return (
    <div className="page" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'90dvh',textAlign:'center',padding:'0 24px',gap:12}}>
      {status === 'loading' && <><div className="spinner" style={{width:40,height:40,borderWidth:3}} /><p style={{color:'var(--gray)'}}>Confirming payment…</p></>}
      {status === 'success' && (
        <>
          <CheckCircle2 size={60} color="var(--gold)" strokeWidth={1.5} />
          <h2 style={{fontFamily:'var(--font-head)',fontSize:22}}>Order Confirmed!</h2>
          <p style={{color:'var(--gray-light)',fontSize:13}}>Your order <strong>{ref}</strong> is placed. We'll get it ready for you.</p>
          <div style={{display:'flex',flexDirection:'column',gap:10,width:'100%',marginTop:16}}>
            <Link to="/account/orders" className="btn btn-white btn-full">View Order</Link>
            <Link to="/shop" className="btn btn-outline btn-full">Keep Shopping</Link>
          </div>
        </>
      )}
      {status === 'failed' && (
        <>
          <XCircle size={60} color="var(--danger)" strokeWidth={1.5} />
          <h2 style={{fontFamily:'var(--font-head)',fontSize:22}}>Payment Failed</h2>
          <p style={{color:'var(--gray-light)',fontSize:13}}>We couldn't confirm payment for <strong>{ref}</strong>. Contact us if you were charged.</p>
          <Link to="/cart" className="btn btn-white btn-full" style={{marginTop:16}}>Back to Cart</Link>
        </>
      )}
    </div>
  );
}

// ── Wishlist ──────────────────────────────────────────────────────────────────
export function Wishlist() {
  const { user } = useStore();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) api.get('/wishlist').then(r => setItems(r.data)).finally(() => setLoading(false));
    else setLoading(false);
  }, [user]);

  const remove = async (productId) => {
    await api.delete(`/wishlist/${productId}`);
    setItems(p => p.filter(i => i.product_id !== productId));
    toast.success('Removed');
  };

  if (!user) return (
    <div className="empty-state page">
      <Heart size={48} strokeWidth={1} />
      <h2>Sign in to view wishlist</h2>
      <Link to="/login" className="btn btn-gold">Sign In</Link>
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Wishlist</h1>
        {loading
          ? Array(3).fill(0).map((_,i) => <div key={i} className="skeleton" style={{height:72,borderRadius:'var(--radius)',marginBottom:10}} />)
          : items.length === 0
            ? <div className="empty-state" style={{minHeight:'50dvh'}}>
                <Heart size={44} strokeWidth={1} />
                <h2>Nothing saved</h2>
                <p>Tap the heart on any piece</p>
                <Link to="/shop" className="btn btn-gold">Browse Shop</Link>
              </div>
            : items.map(item => (
              <div key={item.id} style={{display:'flex',alignItems:'center',gap:12,background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:10,marginBottom:10}}>
                <Link to={`/product/${item.slug}`} style={{width:56,height:70,borderRadius:'var(--radius-sm)',overflow:'hidden',background:'var(--surface)',flexShrink:0}}>
                  {item.image ? <img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <span style={{display:'flex',height:'100%',alignItems:'center',justifyContent:'center',fontSize:20}}>👕</span>}
                </Link>
                <Link to={`/product/${item.slug}`} style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</p>
                  <p className="price">{fmt(item.sale_price || item.price)}</p>
                </Link>
                <button onClick={() => remove(item.product_id)} style={{color:'var(--gray)',padding:6}}><X size={17} /></button>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── Addresses ─────────────────────────────────────────────────────────────────
export function Addresses() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ full_name:'', phone:'', street:'', city:'', state:'', label:'Home' });

  const load = () => api.get('/addresses').then(r => setAddresses(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/addresses', form);
    setForm({ full_name:'', phone:'', street:'', city:'', state:'', label:'Home' });
    setShowForm(false); load(); toast.success('Saved');
  };

  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px 0'}}>
        <button className="pd-icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1 className="page-title" style={{padding:0}}>Addresses</h1>
      </div>
      <div className="container" style={{paddingTop:16}}>
        {addresses.map(a => (
          <div key={a.id} style={{display:'flex',gap:10,alignItems:'flex-start',background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:14,marginBottom:10}}>
            <MapPin size={15} style={{color:'var(--gold)',marginTop:2,flexShrink:0}} />
            <div style={{flex:1}}>
              <p style={{fontSize:13,fontWeight:700,marginBottom:3}}>{a.full_name} · {a.label}</p>
              <p style={{fontSize:12,color:'var(--gray-light)'}}>{a.street}, {a.city}, {a.state}</p>
              <p style={{fontSize:12,color:'var(--gray)'}}>{a.phone}</p>
            </div>
            <button onClick={() => api.delete(`/addresses/${a.id}`).then(load)} style={{color:'var(--gray)'}}><Trash2 size={15} /></button>
          </div>
        ))}
        {!showForm
          ? <button style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'var(--gold)',padding:'8px 0'}} onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add new address
            </button>
          : <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:10,marginTop:10}}>
              <input placeholder="Full name" value={form.full_name} onChange={e => setForm({...form,full_name:e.target.value})} />
              <input placeholder="Phone number" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} />
              <input placeholder="Street address" value={form.street} onChange={e => setForm({...form,street:e.target.value})} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <input placeholder="City" value={form.city} onChange={e => setForm({...form,city:e.target.value})} />
                <input placeholder="State" value={form.state} onChange={e => setForm({...form,state:e.target.value})} />
              </div>
              <button type="submit" className="btn btn-outline btn-full">Save Address</button>
            </form>
        }
      </div>
    </div>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────
export function About() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div style={{padding:'14px 16px 0',display:'flex',alignItems:'center',gap:12}}>
        <button className="pd-icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
      </div>
      <div style={{padding:'24px 20px 40px',textAlign:'center',background:'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(201,168,76,.08) 0%, transparent 60%)'}}>
        <p style={{fontFamily:'var(--font-head)',fontSize:40,fontWeight:800,letterSpacing:8,marginBottom:8}}>JBOSS</p>
        <p style={{fontSize:13,color:'var(--gold)',fontStyle:'italic'}}>Wear what you are.</p>
      </div>
      <div className="container">
        {[
          "Jboss Clothing started as a personal thing. Not a business plan, not a mood board — just a clear sense of what was missing and the decision to make it.",
          "No hype. No gatekeeping. Just clean clothes made with intention, for people who know what they want before the world tells them. Every piece is chosen with care, cut for fit, and released when it's ready — not when the algorithm says so.",
          "The name is personal. The clothes are for everyone who's ever worn something and felt exactly like themselves.",
        ].map((t, i) => (
          <p key={i} style={{fontSize:14,lineHeight:1.85,color:'var(--gray-light)',marginBottom:16}}>{t}</p>
        ))}

        <div style={{display:'flex',flexDirection:'column',gap:10,margin:'24px 0'}}>
          {[
            { icon:'✦', label:'Quality over quantity', sub:'Every piece earns its place' },
            { icon:'↩', label:'7-day returns',         sub:'No questions asked' },
            { icon:'📦', label:'Lagos delivery',       sub:'Fast and reliable' },
          ].map(v => (
            <div key={v.label} style={{display:'flex',alignItems:'center',gap:14,background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'14px 16px'}}>
              <span style={{fontSize:18,color:'var(--gold)'}}>{v.icon}</span>
              <div>
                <p style={{fontSize:13,fontWeight:700}}>{v.label}</p>
                <p style={{fontSize:11,color:'var(--gray)',marginTop:2}}>{v.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <a href="https://instagram.com" target="_blank" rel="noreferrer"
          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'16px',background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',fontSize:13,fontWeight:600,color:'var(--gold)'}}>
          Follow us on Instagram
        </a>
      </div>
    </div>
  );
}

// ── Order card style (shared) ─────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
.order-card { display:block; background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px; margin-bottom:10px; }
.order-card__top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.order-card__ref { font-size:13px; font-weight:700; }
.order-card__bottom { display:flex; align-items:center; justify-content:space-between; font-size:12px; color:var(--gray); }
.pd-icon-btn { width:36px; height:36px; background:var(--surface); border:1px solid var(--border); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--white); flex-shrink:0; }
`;
if (!document.head.querySelector('#shared-styles')) {
  style.id = 'shared-styles';
  document.head.appendChild(style);
}
