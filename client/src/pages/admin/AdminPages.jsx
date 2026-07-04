import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, FolderTree, Package } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './Admin.css';

const fmt = n => `₦${Number(n).toLocaleString()}`;

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)); }, []);
  if (!stats) return <div className="spinner" style={{margin:'60px auto'}} />;
  return (
    <div className="fade-in">
      <h1 className="admin-title">Dashboard</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:28}}>
        {[
          { label:'Products', value: stats.total_products },
          { label:'Orders',   value: stats.total_orders },
          { label:'Customers',value: stats.total_users },
          { label:'Revenue',  value: fmt(stats.total_revenue) },
        ].map(s => (
          <div key={s.label} style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16}}>
            <p style={{fontFamily:'var(--font-head)',fontSize:22,fontWeight:800}}>{s.value}</p>
            <p style={{fontSize:11,color:'var(--gray)',marginTop:4}}>{s.label}</p>
          </div>
        ))}
      </div>
      <h2 style={{fontFamily:'var(--font-head)',fontSize:15,marginBottom:12}}>Recent Orders</h2>
      {stats.recent_orders.map(o => (
        <div key={o.order_ref} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'12px 14px',marginBottom:8}}>
          <div>
            <p style={{fontSize:13,fontWeight:700}}>{o.order_ref}</p>
            <p style={{fontSize:11,color:'var(--gray)',marginTop:2}}>{o.full_name}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p className="price" style={{fontSize:13}}>{fmt(o.total_amount)}</p>
            <span className="badge badge-gray" style={{marginTop:4}}>{o.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Products list ─────────────────────────────────────────────────────────────
export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  const load = (q='') => {
    setLoading(true);
    api.get(`/admin/products?search=${q}`).then(r => setProducts(r.data.products)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const togglePublish = async (p) => {
    await api.patch(`/admin/products/${p.id}`, { is_published: p.is_published ? 0 : 1 });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_published: !p.is_published } : x));
  };

  return (
    <div className="fade-in">
      <div className="admin-head">
        <h1 className="admin-title" style={{marginBottom:0}}>Products</h1>
        <Link to="/admin/products/new" className="admin-add-btn"><Plus size={18} /></Link>
      </div>
      <div style={{position:'relative',marginBottom:14}}>
        <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--gray)',pointerEvents:'none'}} />
        <input placeholder="Search…" value={search} style={{paddingLeft:36}} onChange={e => { setSearch(e.target.value); load(e.target.value); }} />
      </div>
      {loading
        ? Array(4).fill(0).map((_,i) => <div key={i} className="skeleton" style={{height:64,borderRadius:'var(--radius)',marginBottom:8}} />)
        : products.map(p => (
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:10,marginBottom:8}}>
            <Link to={`/admin/products/${p.id}`} style={{width:48,height:56,borderRadius:'var(--radius-sm)',overflow:'hidden',background:'var(--surface)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--border)',fontSize:18}}>
              {p.primary_image ? <img src={p.primary_image} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : '👕'}
            </Link>
            <Link to={`/admin/products/${p.id}`} style={{flex:1,minWidth:0}}>
              <p style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
              <p style={{fontSize:11,color:'var(--gray)',marginTop:2}}>{p.category_name} · {fmt(p.price)} · {p.variant_count} variants</p>
            </Link>
            <button
              style={{fontSize:10,fontWeight:700,padding:'5px 10px',borderRadius:50,background:p.is_published?'rgba(201,168,76,.15)':'var(--surface)',color:p.is_published?'var(--gold)':'var(--gray)',flexShrink:0}}
              onClick={() => togglePublish(p)}
            >{p.is_published ? 'Live' : 'Draft'}</button>
          </div>
        ))
      }
      {!loading && products.length === 0 && <p style={{textAlign:'center',color:'var(--gray)',padding:'40px 0'}}>No products yet.</p>}
    </div>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────
export function AdminCategories() {
  const [cats, setCats]       = useState([]);
  const [showForm, setShow]   = useState(false);
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const load = () => api.get('/categories').then(r => setCats(r.data));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    await api.post('/admin/categories', { name, description: desc });
    setName(''); setDesc(''); setShow(false); load(); toast.success('Added');
  };
  return (
    <div className="fade-in">
      <div className="admin-head">
        <h1 className="admin-title" style={{marginBottom:0}}>Categories</h1>
        <button className="admin-add-btn" onClick={() => setShow(!showForm)}><Plus size={18} /></button>
      </div>
      {showForm && (
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:10,background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,marginBottom:16}}>
          <input placeholder="Category name" value={name} onChange={e => setName(e.target.value)} />
          <textarea placeholder="Description (optional)" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          <button className="btn btn-gold btn-full" type="submit">Add Category</button>
        </form>
      )}
      {cats.map(c => (
        <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'12px 14px',marginBottom:8}}>
          <FolderTree size={16} style={{color:'var(--gold)',flexShrink:0}} />
          <div style={{flex:1}}>
            <p style={{fontSize:13,fontWeight:600}}>{c.name}</p>
            <p style={{fontSize:11,color:'var(--gray)',marginTop:2}}>{c.product_count} product{c.product_count !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => api.delete(`/admin/categories/${c.id}`).then(load).catch(e => toast.error(e.response?.data?.message||'Error'))} style={{color:'var(--gray)'}}><Trash2 size={15} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Orders ────────────────────────────────────────────────────────────────────
const STATUSES = ['confirmed','processing','shipped','delivered','cancelled','refunded'];
export function AdminOrders() {
  const [orders, setOrders]   = useState([]);
  const [filter, setFilter]   = useState('');
  const [loading, setLoading] = useState(true);
  const load = (s='') => {
    setLoading(true);
    api.get(`/admin/orders${s ? `?status=${s}` : ''}`).then(r => setOrders(r.data.orders)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const updateStatus = async (ref, status) => {
    await api.patch(`/admin/orders/${ref}`, { status });
    setOrders(p => p.map(o => o.order_ref === ref ? { ...o, status } : o));
    toast.success('Updated');
  };
  return (
    <div className="fade-in">
      <h1 className="admin-title">Orders</h1>
      <div className="cat-scroll" style={{marginBottom:16}}>
        {[['','All'],['paid','Paid'],['processing','Processing'],['shipped','Shipped'],['delivered','Delivered']].map(([v,l]) => (
          <button key={v} className={`cat-chip${filter===v?' active':''}`} onClick={() => { setFilter(v); load(v); }}>{l}</button>
        ))}
      </div>
      {loading
        ? Array(3).fill(0).map((_,i) => <div key={i} className="skeleton" style={{height:90,borderRadius:'var(--radius)',marginBottom:10}} />)
        : orders.map(o => (
          <div key={o.order_ref} style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:14,marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:700}}>{o.order_ref}</span>
              <span className="price" style={{fontSize:13}}>{fmt(o.total_amount)}</span>
            </div>
            <p style={{fontSize:12,color:'var(--gray-light)',marginBottom:2}}>{o.full_name} · {o.phone||o.email}</p>
            <p style={{fontSize:11,color:'var(--gray)',marginBottom:10}}>{new Date(o.created_at).toLocaleString()}</p>
            <select value={o.status} style={{fontSize:12,fontWeight:600,padding:'8px 10px',textTransform:'capitalize'}}
              onChange={e => updateStatus(o.order_ref, e.target.value)}>
              <option value={o.status} disabled>{o.status.replace('_',' ')}</option>
              {STATUSES.filter(s => s !== o.status).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        ))
      }
      {!loading && orders.length === 0 && <p style={{textAlign:'center',color:'var(--gray)',padding:'40px 0'}}>No orders found</p>}
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
export function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving]     = useState(false);
  useEffect(() => { api.get('/settings').then(r => setSettings(r.data)); }, []);
  const save = async () => {
    setSaving(true);
    await api.patch('/admin/settings', settings).then(() => toast.success('Saved')).catch(() => toast.error('Failed'));
    setSaving(false);
  };
  const set = (k,v) => setSettings(p => ({ ...p, [k]: v }));
  return (
    <div className="fade-in">
      <h1 className="admin-title">Settings</h1>
      {[
        { key:'site_name',        label:'Site name' },
        { key:'tagline',          label:'Tagline' },
        { key:'instagram_handle', label:'Instagram handle' },
        { key:'whatsapp_number',  label:'WhatsApp number' },
        { key:'delivery_fee',     label:'Delivery fee (₦)' },
      ].map(f => (
        <div key={f.key} className="form-group">
          <label>{f.label}</label>
          <input value={settings[f.key]||''} onChange={e => set(f.key, e.target.value)} />
        </div>
      ))}
      <div className="form-group">
        <label>About text</label>
        <textarea rows={4} value={settings.about_text||''} onChange={e => set('about_text', e.target.value)} />
      </div>
      <button className="btn btn-gold btn-full" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
      <p style={{fontSize:11,color:'var(--gray)',marginTop:16,background:'var(--surface)',borderRadius:'var(--radius-sm)',padding:12,lineHeight:1.7}}>
        Paystack keys are stored in the server <code style={{color:'var(--gold)',background:'var(--bg-3)',padding:'1px 5px',borderRadius:3}}>.env</code> file for security.
      </p>
    </div>
  );
}
