import { useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ImgHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, X } from 'lucide-react';
import { formatINR, ORDER_STATUS_LABEL } from '../../lib/format';

/* ───────── Feedback ───────── */

export function Spinner({ className = 'h-5 w-5', label = 'Loading' }: { className?: string; label?: string }) {
  return <Loader2 className={`animate-spin text-gold-dark ${className}`} aria-label={label} role="status" />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-parchment-deep/60 ${className}`} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md border border-danger/30 bg-red-50/60 p-6 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      {icon && <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 text-gold-dark">{icon}</div>}
      <h2 className="text-3xl">{title}</h2>
      {children && <div className="mt-3 text-ink-muted">{children}</div>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', children, className = '' }: { tone?: 'info' | 'warn' | 'error' | 'success' | 'demo'; children: ReactNode; className?: string }) {
  const styles = {
    info: 'border-gold/40 bg-parchment/70 text-ink-soft',
    warn: 'border-amber-600/30 bg-amber-50 text-amber-900',
    error: 'border-danger/30 bg-red-50 text-danger',
    success: 'border-success/30 bg-emerald-50 text-success',
    demo: 'border-dashed border-gold-dark/60 bg-gold-light/15 text-walnut',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={`border px-4 py-3 text-sm leading-relaxed ${styles} ${className}`}>
      {children}
    </div>
  );
}

/* ───────── Form fields ───────── */

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
}

export function TextField({ label, error, hint, className = '', ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {props.required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      <input id={id} className="field-input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({ label, error, className = '', children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {props.required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      <select id={id} className="field-input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235C4536%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props}>
        {children}
      </select>
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({ label, error, className = '', ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {props.required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      <textarea id={id} className="field-input min-h-[120px] resize-y" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, ...props }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-forest" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function SubmitButton({ loading, children, className = 'btn-primary w-full' }: { loading?: boolean; children: ReactNode; className?: string }) {
  return (
    <button type="submit" className={className} disabled={loading} aria-busy={loading}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ───────── Commerce ───────── */

export function Price({ paise, compareAt, className = '', size = 'md' }: { paise: number; compareAt?: number | null; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'text-sm', md: 'text-base', lg: 'text-3xl font-serif' }[size];
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`font-medium text-walnut ${s}`}>{formatINR(paise)}</span>
      {compareAt && compareAt > paise && (
        <>
          <span className="sr-only">, reduced from</span>
          <s className={`text-ink-muted ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>{formatINR(compareAt)}</s>
        </>
      )}
    </span>
  );
}

export function QuantityStepper({ value, min = 1, max, onChange, disabled, label = 'Quantity' }: { value: number; min?: number; max: number; onChange: (n: number) => void; disabled?: boolean; label?: string }) {
  return (
    <div className="inline-flex h-11 items-center border border-line bg-white/70" role="group" aria-label={label}>
      <button type="button" className="flex h-full w-10 items-center justify-center text-walnut hover:bg-parchment disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-9 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className="flex h-full w-10 items-center justify-center text-walnut hover:bg-parchment disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    PENDING_PAYMENT: 'bg-amber-50 text-amber-800 border-amber-200',
    CONFIRMED: 'bg-sky-50 text-sky-800 border-sky-200',
    PROCESSING: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    SHIPPED: 'bg-violet-50 text-violet-800 border-violet-200',
    DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-stone-100 text-stone-700 border-stone-300',
    PAYMENT_FAILED: 'bg-red-50 text-red-800 border-red-200',
    SUCCEEDED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    FAILED: 'bg-red-50 text-red-800 border-red-200',
    REFUNDED: 'bg-stone-100 text-stone-700 border-stone-300',
    CREATED: 'bg-amber-50 text-amber-800 border-amber-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    DRAFT: 'bg-amber-50 text-amber-800 border-amber-200',
    ARCHIVED: 'bg-stone-100 text-stone-700 border-stone-300',
  };
  const label = ORDER_STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
  return <span className={`inline-flex whitespace-nowrap border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${tone[status] ?? 'border-line bg-parchment'}`}>{label}</span>;
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return <span className={`inline-flex border border-dashed border-gold-dark/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-dark ${className}`}>Demo</span>;
}

/* ───────── Media ───────── */

const FALLBACK = '/images/placeholder-artifact.svg';

export function Img({ src, alt, className = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={failed || !src ? FALLBACK : src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      {...rest}
    />
  );
}

/* ───────── Layout helpers ───────── */

export function Reveal({ children, delay = 0, className = '', y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({ eyebrow, title, children, align = 'left', action }: { eyebrow?: string; title: ReactNode; children?: ReactNode; align?: 'left' | 'center'; action?: ReactNode }) {
  return (
    <div className={`mb-10 flex flex-col gap-4 md:mb-14 ${align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <div className={`mb-4 flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
            <span className="rule-gold" aria-hidden />
            <p className="eyebrow">{eyebrow}</p>
            {align === 'center' && <span className="rule-gold" aria-hidden />}
          </div>
        )}
        <h2 className="text-4xl leading-[1.05] md:text-5xl">{title}</h2>
        {children && <div className="mt-4 text-[15px] leading-relaxed text-ink-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, crumbs }: { eyebrow?: string; title: string; children?: ReactNode; crumbs?: { label: string; to?: string }[] }) {
  return (
    <header className="border-b border-line/70 bg-parchment/50">
      <div className="container-site py-10 md:py-14">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-4xl md:text-6xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-ink-muted">{children}</div>}
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />}
            {c.to ? (
              <Link to={c.to} className="hover:text-walnut">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-soft">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      <button className="flex h-10 w-10 items-center justify-center border border-line hover:border-walnut disabled:opacity-40" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-muted">…</span>}
          <button
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`h-10 min-w-10 px-3 text-sm ${p === page ? 'bg-walnut text-ivory' : 'border border-line hover:border-walnut'}`}
          >
            {p}
          </button>
        </span>
      ))}
      <button className="flex h-10 w-10 items-center justify-center border border-line hover:border-walnut disabled:opacity-40" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

/* ───────── Overlays ───────── */

export function Modal({ open, onClose, title, children, size = 'md', labelledBy }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: 'md' | 'lg' | 'xl'; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus],button,a,input')?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  const width = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-walnut-dark/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-labelledby={labelledBy}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`glass relative max-h-[92vh] w-full ${width} overflow-y-auto !bg-ivory/85`}
          >
            <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center bg-ivory/80 text-walnut hover:text-gold-dark" aria-label="Close dialog">
              <X className="h-5 w-5" />
            </button>
            {title && <h2 className="border-b border-line px-6 py-5 pr-14 text-2xl">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose, busy }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary'; onConfirm: () => void; onClose: () => void; busy?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="px-6 py-5 text-sm text-ink-soft">{message}</div>
      <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className={tone === 'danger' ? 'btn bg-danger text-white hover:bg-red-800' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export { formatINR };
