import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import { useStore } from '../context/store';
import toast from 'react-hot-toast';
import './Auth.css';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth  = useStore(s => s.setAuth);
  const [form, setForm]     = useState({ email:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.token, data.user);
      toast.success(`Welcome back!`);
      navigate(location.state?.from || '/');
    } catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth page">
      <div className="auth-header">
        <p className="auth-logo">JBOSS</p>
        <p className="auth-tag">Wear what you are.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <h1 className="auth-title">Welcome back</h1>
        <div className="input-wrap">
          <Mail size={15} className="input-icon" />
          <input type="email" placeholder="Email address" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <div className="input-wrap">
          <Lock size={15} className="input-icon" />
          <input type={showPw ? 'text' : 'password'} placeholder="Password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <button type="button" className="input-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button className="btn btn-white btn-full" type="submit" disabled={loading}>
          {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2,borderTopColor:'#000'}} /> : 'Sign In'}
        </button>
      </form>
      <p className="auth-switch">New here? <Link to="/register">Create account</Link></p>
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
  const setAuth  = useStore(s => s.setAuth);
  const [form, setForm]     = useState({ full_name:'', email:'', phone:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.token, data.user);
      toast.success('Welcome to Jboss Clothing!');
      navigate('/');
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth page">
      <div className="auth-header">
        <p className="auth-logo">JBOSS</p>
        <p className="auth-tag">Wear what you are.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <h1 className="auth-title">Create account</h1>
        {[
          { name:'full_name', placeholder:'Full name', type:'text', icon: null },
          { name:'email',     placeholder:'Email address', type:'email', icon: null },
          { name:'phone',     placeholder:'Phone number (optional)', type:'tel', icon: null },
        ].map(f => (
          <div key={f.name} className="input-wrap">
            <input type={f.type} placeholder={f.placeholder} value={form[f.name]} onChange={e => setForm({...form, [f.name]: e.target.value})} />
          </div>
        ))}
        <div className="input-wrap">
          <input type={showPw ? 'text' : 'password'} placeholder="Password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <button type="button" className="input-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button className="btn btn-white btn-full" type="submit" disabled={loading}>
          {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2,borderTopColor:'#000'}} /> : 'Create Account'}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
