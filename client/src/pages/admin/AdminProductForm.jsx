import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, X, Star, Trash2, Plus } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminProductForm.css';

const PRESET_SIZES  = ['XS','S','M','L','XL','XXL','XXXL','Free Size'];
const PRESET_COLORS = [
  { color:'Black',  hex:'#1a1a1a' },{ color:'White',   hex:'#f5f5f0' },
  { color:'Cream',  hex:'#f0ead6' },{ color:'Brown',   hex:'#6b4226' },
  { color:'Olive',  hex:'#6b6b3a' },{ color:'Navy',    hex:'#1a2744' },
  { color:'Grey',   hex:'#888888' },{ color:'Red',     hex:'#c0392b' },
  { color:'Green',  hex:'#2d6a4f' },{ color:'Camel',   hex:'#c19a6b' },
];

const emptyForm = {
  category_id:'', name:'', description:'', material:'', care_instructions:'',
  price:'', sale_price:'', availability:'buy', lead_time_days:'',
  is_featured:false, is_published:false,
};

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit  = id && id !== 'new';
  const navigate = useNavigate();

  const [form, setForm]             = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [existingImages, setExistImgs] = useState([]);
  const [newFiles, setNewFiles]     = useState([]);
  const [previews, setPreviews]     = useState([]);
  const [variants, setVariants]     = useState([]);
  const [newVariant, setNewVariant] = useState({ size:'', color:'', color_hex:'', stock_qty:1 });
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(isEdit);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data));
    if (isEdit) {
      api.get(`/admin/products/${id}`).then(r => {
        const d = r.data;
        setForm({
          category_id: d.category_id, name: d.name, description: d.description||'',
          material: d.material||'', care_instructions: d.care_instructions||'',
          price: d.price, sale_price: d.sale_price||'', availability: d.availability,
          lead_time_days: d.lead_time_days||'', is_featured: !!d.is_featured, is_published: !!d.is_published,
        });
        setExistImgs(d.images || []);
        setVariants(d.variants || []);
      }).catch(() => { toast.error('Product not found'); navigate('/admin/products'); })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [id]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, 8 - existingImages.length - newFiles.length);
    setNewFiles(p => [...p, ...files]);
    setPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeNewFile   = i  => { setNewFiles(p => p.filter((_,x) => x!==i)); setPreviews(p => p.filter((_,x) => x!==i)); };
  const removeExistImg  = async (imgId) => {
    await api.delete(`/admin/images/${imgId}`).catch(() => {});
    setExistImgs(p => p.filter(i => i.id !== imgId));
  };
  const setPrimaryImg   = async (imgId) => {
    await api.patch(`/admin/images/${imgId}/primary`);
    setExistImgs(p => p.map(i => ({ ...i, is_primary: i.id === imgId ? 1 : 0 })));
  };

  // Variant management
  const addVariant = () => {
    if (!newVariant.size || !newVariant.color) { toast.error('Size and color required'); return; }
    const exists = variants.find(v => v.size === newVariant.size && v.color === newVariant.color);
    if (exists) { toast.error('This size/color combo already exists'); return; }
    setVariants(p => [...p, { ...newVariant, stock_qty: Number(newVariant.stock_qty)||0 }]);
    setNewVariant({ size:'', color:'', color_hex:'', stock_qty:1 });
  };

  const removeVariant   = i => setVariants(p => p.filter((_,x) => x !== i));
  const updateVariantQty = (i, qty) => setVariants(p => p.map((v,x) => x===i ? { ...v, stock_qty: Number(qty)||0 } : v));

  const selectPresetColor = (c) => setNewVariant(p => ({ ...p, color: c.color, color_hex: c.hex }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category_id || !form.price) { toast.error('Name, category and price required'); return; }
    if (variants.length === 0) { toast.error('Add at least one size/color variant'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => {
        if (v !== '' && v !== null) fd.append(k, typeof v === 'boolean' ? (v?1:0) : v);
      });
      newFiles.forEach(f => fd.append('images', f));
      fd.append('variants', JSON.stringify(variants));

      if (isEdit) {
        await api.patch(`/admin/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product created');
      }
      navigate('/admin/products');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this product permanently?')) return;
    await api.delete(`/admin/products/${id}`);
    toast.success('Deleted'); navigate('/admin/products');
  };

  if (loading) return <div className="spinner" style={{margin:'60px auto'}} />;

  return (
    <div className="apf fade-in">
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={() => navigate('/admin/products')} style={{width:34,height:34,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--white)'}}><ChevronLeft size={18} /></button>
        <h1 style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:700}}>{isEdit ? 'Edit Product' : 'New Product'}</h1>
      </div>

      <form onSubmit={submit}>

        {/* Images */}
        <div className="form-group">
          <label>Photos <span className="form-hint">— auto-compressed to ~100KB</span></label>
          <div className="img-grid">
            {existingImages.map(img => (
              <div key={img.id} className="img-tile">
                <img src={img.url} alt="" />
                {img.is_primary
                  ? <span className="img-tile__primary"><Star size={10} fill="#000" /></span>
                  : <button type="button" className="img-tile__star" onClick={() => setPrimaryImg(img.id)}><Star size={12} /></button>
                }
                <button type="button" className="img-tile__del" onClick={() => removeExistImg(img.id)}><X size={12} /></button>
              </div>
            ))}
            {previews.map((src,i) => (
              <div key={i} className="img-tile">
                <img src={src} alt="" />
                <button type="button" className="img-tile__del" onClick={() => removeNewFile(i)}><X size={12} /></button>
              </div>
            ))}
            {existingImages.length + newFiles.length < 8 && (
              <label className="img-upload-btn">
                <Upload size={18} /><span>Add</span>
                <input type="file" accept="image/*" multiple hidden onChange={handleFiles} />
              </label>
            )}
          </div>
        </div>

        {/* Basic info */}
        <div className="form-group">
          <label>Product name</label>
          <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Oversized Linen Set" />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={form.category_id} onChange={e => setForm({...form,category_id:e.target.value})}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group" style={{marginBottom:0}}>
            <label>Price (₦)</label>
            <input type="number" value={form.price} onChange={e => setForm({...form,price:e.target.value})} placeholder="0" />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label>Sale price</label>
            <input type="number" value={form.sale_price} onChange={e => setForm({...form,sale_price:e.target.value})} placeholder="optional" />
          </div>
        </div>

        {/* Availability */}
        <div className="form-group">
          <label>Availability</label>
          <div className="seg-control">
            {[['buy','Buy Now'],['preorder','Pre-order'],['sold_out','Sold Out']].map(([v,l]) => (
              <button type="button" key={v} className={`seg-btn${form.availability===v?' active':''}`} onClick={() => setForm({...form,availability:v})}>{l}</button>
            ))}
          </div>
        </div>
        {form.availability === 'preorder' && (
          <div className="form-group">
            <label>Lead time (days)</label>
            <input type="number" value={form.lead_time_days} onChange={e => setForm({...form,lead_time_days:e.target.value})} placeholder="e.g. 7" />
          </div>
        )}

        {/* ── Variants section ── */}
        <div className="form-group">
          <label>Sizes & Colors <span className="form-hint">— add each available combination</span></label>

          {/* Existing variants list */}
          {variants.length > 0 && (
            <div className="variants-list">
              {variants.map((v, i) => (
                <div key={i} className="variant-row">
                  <span className="variant-row__color-dot" style={{background: v.color_hex || '#888'}} />
                  <span className="variant-row__label">{v.size} / {v.color}</span>
                  <div className="variant-row__qty">
                    <input type="number" min={0} value={v.stock_qty}
                      onChange={e => updateVariantQty(i, e.target.value)}
                      style={{width:54,textAlign:'center',padding:'5px 6px'}} />
                    <span style={{fontSize:10,color:'var(--gray)'}}>pcs</span>
                  </div>
                  <button type="button" onClick={() => removeVariant(i)} style={{color:'var(--gray)',padding:4}}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Add new variant */}
          <div className="variant-add-box">
            <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'var(--gray-light)',marginBottom:10}}>Add Variant</p>

            {/* Size presets */}
            <p style={{fontSize:10,color:'var(--gray)',marginBottom:6}}>Size</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
              {PRESET_SIZES.map(s => (
                <button type="button" key={s}
                  className={`size-chip${newVariant.size===s?' selected':''}`}
                  style={{minWidth:36,height:34,fontSize:11}}
                  onClick={() => setNewVariant(p => ({...p,size:s}))}>
                  {s}
                </button>
              ))}
              <input placeholder="Custom" value={!PRESET_SIZES.includes(newVariant.size) ? newVariant.size : ''} style={{width:70,padding:'6px 8px',fontSize:11}}
                onChange={e => setNewVariant(p => ({...p,size:e.target.value}))} />
            </div>

            {/* Color presets */}
            <p style={{fontSize:10,color:'var(--gray)',marginBottom:6}}>Color</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
              {PRESET_COLORS.map(c => (
                <button type="button" key={c.color}
                  className={`color-swatch${newVariant.color===c.color?' selected':''}`}
                  style={{background:c.hex}}
                  title={c.color}
                  onClick={() => selectPresetColor(c)}
                />
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <input placeholder="Custom color name" value={newVariant.color} style={{flex:1,fontSize:12}}
                onChange={e => setNewVariant(p => ({...p,color:e.target.value}))} />
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="color" value={newVariant.color_hex||'#888888'} style={{width:36,height:36,padding:2,cursor:'pointer'}}
                  onChange={e => setNewVariant(p => ({...p,color_hex:e.target.value}))} />
              </div>
            </div>

            <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
              <div style={{flex:1}}>
                <p style={{fontSize:10,color:'var(--gray)',marginBottom:4}}>Stock qty</p>
                <input type="number" min={0} value={newVariant.stock_qty} style={{padding:'8px 10px'}}
                  onChange={e => setNewVariant(p => ({...p,stock_qty:e.target.value}))} />
              </div>
              <button type="button" className="btn btn-outline" style={{padding:'9px 16px',whiteSpace:'nowrap'}} onClick={addVariant}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="form-group">
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Tell the story of this piece…" />
        </div>
        <div className="form-row">
          <div className="form-group" style={{marginBottom:0}}>
            <label>Material</label>
            <input value={form.material} onChange={e => setForm({...form,material:e.target.value})} placeholder="e.g. 100% Cotton" />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label>Care</label>
            <input value={form.care_instructions} onChange={e => setForm({...form,care_instructions:e.target.value})} placeholder="e.g. Cold wash" />
          </div>
        </div>

        {/* Toggles */}
        <div className="toggle-row" style={{marginTop:16}}>
          <label className="toggle-label">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form,is_featured:e.target.checked})} />
            Featured on homepage
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={form.is_published} onChange={e => setForm({...form,is_published:e.target.checked})} />
            Published (visible to customers)
          </label>
        </div>

        <button type="submit" className="btn btn-gold btn-full" disabled={saving} style={{marginTop:14}}>
          {saving ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : isEdit ? 'Save Changes' : 'Create Product'}
        </button>

        {isEdit && (
          <button type="button" className="btn btn-outline btn-full" style={{marginTop:10,color:'var(--danger)',borderColor:'var(--danger)'}} onClick={handleDelete}>
            <Trash2 size={15} /> Delete Product
          </button>
        )}
      </form>
    </div>
  );
}
