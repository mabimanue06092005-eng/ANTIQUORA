import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  message: string;
  action?: { label: string; onClick: () => void };
}

const ToastCtx = createContext<(message: string, tone?: Tone, action?: Toast['action']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((message: string, tone: Tone = 'success', action?: Toast['action']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, message, action }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        <AnimatePresence>
          {toasts.map((t) => {
            const I = Icon[t.tone];
            return (
              <motion.div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 border border-gold/40 bg-walnut-dark px-4 py-3 text-sm text-ivory shadow-lift"
              >
                <I className={`mt-0.5 h-4 w-4 shrink-0 ${t.tone === 'error' ? 'text-red-300' : 'text-gold-light'}`} aria-hidden />
                <p className="flex-1 leading-snug">{t.message}</p>
                {t.action && (
                  <button onClick={t.action.onClick} className="shrink-0 text-xs font-medium uppercase tracking-wider text-gold-light hover:text-ivory">
                    {t.action.label}
                  </button>
                )}
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="shrink-0 text-ivory/60 hover:text-ivory">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
