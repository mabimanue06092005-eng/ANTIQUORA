import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';

export function NewsletterForm({ source = 'website', dark = false }: { source?: string; dark?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; message?: string }>({ status: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setState({ status: 'error', message: 'Enter a valid email address.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const res = await api.post<{ status: string; message: string }>('/api/newsletter', { email, source });
      setState({ status: 'done', message: res.message });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: err instanceof ApiError ? err.fields.email ?? err.message : 'Something went wrong.' });
    }
  };

  const id = `nl-${source}`;
  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div className={`flex border-b ${dark ? 'border-ivory/40 focus-within:border-gold-light' : 'border-walnut/40 focus-within:border-gold-dark'} transition-colors`}>
        <input
          id={id}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.status === 'error') setState({ status: 'idle' });
          }}
          placeholder="Your email address"
          autoComplete="email"
          aria-invalid={state.status === 'error'}
          aria-describedby={`${id}-msg`}
          className={`min-h-[48px] min-w-0 flex-1 bg-transparent text-[15px] focus:outline-none ${dark ? 'text-ivory placeholder:text-ivory/50' : 'text-walnut placeholder:text-ink-muted'}`}
        />
        <button type="submit" disabled={state.status === 'loading'} className={`flex items-center gap-2 px-2 text-[12px] font-medium uppercase tracking-[0.16em] ${dark ? 'text-gold-light hover:text-ivory' : 'text-gold-dark hover:text-walnut'}`}>
          {state.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : state.status === 'done' ? <Check className="h-4 w-4" /> : null}
          Subscribe {state.status === 'idle' && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
      <p id={`${id}-msg`} role="status" className={`mt-2 min-h-[20px] text-sm ${state.status === 'error' ? (dark ? 'text-red-300' : 'text-danger') : dark ? 'text-ivory/70' : 'text-ink-muted'}`}>
        {state.message}
      </p>
    </form>
  );
}
