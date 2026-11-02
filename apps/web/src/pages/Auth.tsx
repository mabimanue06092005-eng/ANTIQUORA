import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Notice, PageLoader, SubmitButton, TextField } from '../components/ui';
import { Emblem } from '../components/layout/Logo';

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-104px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-walnut-dark lg:block">
        <img src="/images/products/book-of-hours-2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" onError={(e) => ((e.target as HTMLImageElement).src = '/images/products/book-of-hours-1.jpg')} />
        <div className="absolute inset-0 bg-gradient-to-t from-walnut-dark via-walnut-dark/40 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-12 text-ivory">
          <Emblem className="h-10 w-10 text-gold-light" />
          <p className="mt-6 max-w-md font-serif text-3xl italic leading-snug">“To collect is to become, for a while, a custodian of someone else’s craft.”</p>
          <p className="mt-3 text-xs uppercase tracking-caps text-gold-light">The ANTIQUORA collectors’ circle</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-14 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          <p className="mt-2 text-ink-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">{footer}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, error, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField label={label} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} error={error} autoComplete={autoComplete} hint={hint} required />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-0 top-[26px] flex h-11 w-11 items-center justify-center text-ink-muted hover:text-walnut" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Login() {
  useSeo({ title: 'Sign in', noindex: true });
  const { login, user, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/account';
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return <PageLoader />;
  if (user) return <Navigate to={user.role === 'ADMIN' && from === '/account' ? '/admin' : from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Enter your password';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast(`Welcome back, ${u.name.split(' ')[0]}.`);
      navigate(u.role === 'ADMIN' && from === '/account' ? '/admin' : from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length ? '' : err.message);
      } else setFormError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to view orders, saved addresses and your wishlist."
      footer={<>New to ANTIQUORA? <Link to="/register" state={location.state} className="font-medium text-walnut underline underline-offset-4 hover:text-gold-dark">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {formError && <Notice tone="error">{formError}</Notice>}
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
        <PasswordField label="Password" autoComplete="current-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors.password} />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
        <p className="text-xs text-ink-muted">Forgotten your password? This demo has no email provider configured — ask the store administrator to reset it, or see the README for the development reset command.</p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  useSeo({ title: 'Create account', noindex: true });
  const { register, user, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/account';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return <PageLoader />;
  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errs.password = 'Include at least one letter and one number';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await register(form);
      toast('Welcome to ANTIQUORA. Your account is ready.');
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length ? '' : err.message);
      } else setFormError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Track orders, save addresses and keep a wishlist across devices."
      footer={<>Already have an account? <Link to="/login" state={location.state} className="font-medium text-walnut underline underline-offset-4 hover:text-gold-dark">Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {formError && <Notice tone="error">{formError}</Notice>}
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
        <PasswordField label="Password" autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors.password} hint="At least 8 characters, with a letter and a number." />
        <PasswordField label="Confirm password" autoComplete="new-password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} error={errors.confirmPassword} />
        <SubmitButton loading={loading}>Create account</SubmitButton>
        <p className="text-xs text-ink-muted">By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </form>
    </AuthShell>
  );
}
