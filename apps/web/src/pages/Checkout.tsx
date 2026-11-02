import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, CreditCard, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import type { Address, Cart, StoreInfo } from '../lib/types';
import { INDIAN_STATES } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { OrderTotals } from '../components/OrderTotals';
import { Checkbox, DemoBadge, Img, Notice, PageLoader, SelectField, Spinner, SubmitButton, TextAreaField, TextField, formatINR } from '../components/ui';
import { useAsync } from '../lib/useAsync';

const STEPS = ['Information', 'Shipping', 'Delivery', 'Review', 'Payment'] as const;

type AddressForm = Omit<Address, 'id' | 'isDefault' | 'label' | 'line2'> & { line2: string };
const emptyAddress: AddressForm = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' };

const phoneOk = (p: string) => /^(\+91)?[6-9]\d{9}$/.test(p.replace(/[\s-]/g, ''));

function validateAddress(a: AddressForm) {
  const e: Record<string, string> = {};
  if (a.fullName.trim().length < 2) e.fullName = 'Enter the recipient’s full name';
  if (!phoneOk(a.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';
  if (a.line1.trim().length < 3) e.line1 = 'Enter the street address';
  if (a.city.trim().length < 2) e.city = 'Enter a city';
  if (!a.state) e.state = 'Select a state';
  if (!/^[1-9]\d{5}$/.test(a.postalCode.trim())) e.postalCode = 'Enter a valid 6-digit PIN code';
  return e;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="mb-10 flex items-center gap-1 overflow-x-auto pb-1 text-[11px] uppercase tracking-[0.12em] sm:gap-2" aria-label="Checkout progress">
      {STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s} className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!done}
              onClick={() => onJump(i)}
              aria-current={current ? 'step' : undefined}
              className={`flex items-center gap-2 py-1 ${current ? 'text-walnut' : done ? 'text-gold-dark hover:text-walnut' : 'text-ink-muted'}`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${current ? 'border-walnut bg-walnut text-ivory' : done ? 'border-gold-dark bg-gold-dark text-ivory' : 'border-line'}`}>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={current ? '' : 'hidden sm:inline'}>{s}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-line sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export default function Checkout() {
  useSeo({ title: 'Checkout', noindex: true });
  const { user, loading: authLoading } = useAuth();
  const { cart, refreshCart, store } = useShop();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [saveAddress, setSaveAddress] = useState(true);
  const [delivery, setDelivery] = useState<'standard' | 'express'>('standard');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Cart | null>(null);
  const [placing, setPlacing] = useState(false);
  const [formError, setFormError] = useState('');
  const [payment, setPayment] = useState<{ orderNumber: string; totalPaise: number; paymentId: string; provider: string; keyId?: string; providerOrderId?: string } | null>(null);
  const [payState, setPayState] = useState<'idle' | 'processing' | 'failed'>('idle');
  const [payMessage, setPayMessage] = useState('');

  const { data: addresses } = useAsync(() => (user ? api.get<Address[]>('/api/account/addresses') : Promise.resolve([])), [user?.id]);

  useEffect(() => {
    if (user) setCustomer((c) => ({ name: c.name || user.name, email: c.email || user.email, phone: c.phone || user.phone || '' }));
  }, [user]);
  useEffect(() => {
    const def = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
    if (def && selectedAddressId === 'new' && address === emptyAddress) {
      setSelectedAddressId(def.id);
      setAddress({ ...def, line2: def.line2 ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  // Server-calculated totals for the chosen delivery method.
  useEffect(() => {
    if (step >= 2 && !payment) api.get<Cart>(`/api/cart?delivery=${delivery}`).then(setReview).catch(() => undefined);
  }, [step, delivery, payment]);

  if (authLoading || !cart) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: '/checkout' }} />;
  if (cart.items.length === 0 && !payment)
    return (
      <div className="container-site py-24 text-center">
        <h1 className="text-4xl">Your bag is empty</h1>
        <p className="mt-3 text-ink-muted">Add an artifact to your bag to begin checkout.</p>
        <Link to="/shop" className="btn-primary mt-8">Explore the collection</Link>
      </div>
    );

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    let errs: Record<string, string> = {};
    if (step === 0) {
      if (customer.name.trim().length < 2) errs.name = 'Enter your full name';
      if (!/^\S+@\S+\.\S+$/.test(customer.email)) errs.email = 'Enter a valid email address';
      if (!phoneOk(customer.phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';
      if (!errs.name && !address.fullName) setAddress((a) => ({ ...a, fullName: customer.name, phone: a.phone || customer.phone }));
    }
    if (step === 1) errs = validateAddress(address);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrder = async () => {
    if (!review) return;
    setPlacing(true);
    setFormError('');
    try {
      const res = await api.post<{ order: { orderNumber: string; totalPaise: number }; payment: { id: string; provider: string; keyId?: string; providerOrderId?: string } }>('/api/checkout', {
        customer,
        address: { ...address, line2: address.line2 || null },
        saveAddress: selectedAddressId === 'new' && saveAddress,
        deliveryMethod: delivery,
        notes: notes || null,
        expectedTotalPaise: review.totals.totalPaise,
      });
      setPayment({ orderNumber: res.order.orderNumber, totalPaise: res.order.totalPaise, paymentId: res.payment.id, provider: res.payment.provider, keyId: res.payment.keyId, providerOrderId: res.payment.providerOrderId });
      setStep(4);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && Object.keys(err.fields).length) {
          const f = err.fields;
          const stepFor = Object.keys(f).some((k) => k.startsWith('customer')) ? 0 : Object.keys(f).some((k) => k.startsWith('address')) ? 1 : step;
          setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.split('.').pop()!, v])));
          setStep(stepFor);
        }
        setFormError(err.message);
        if (err.status === 409) {
          await refreshCart();
          api.get<Cart>(`/api/cart?delivery=${delivery}`).then(setReview).catch(() => undefined);
        }
      } else setFormError('Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const demoPay = async (outcome: 'success' | 'failure') => {
    if (!payment) return;
    setPayState('processing');
    await new Promise((r) => setTimeout(r, 1200)); // simulate gateway latency
    try {
      const res = await api.post<{ orderNumber: string; status: string }>(`/api/checkout/payments/${payment.paymentId}/demo`, { outcome });
      if (res.status === 'CONFIRMED') {
        await refreshCart();
        navigate(`/order-confirmation/${res.orderNumber}`, { replace: true });
      } else {
        setPayState('failed');
        setPayMessage('The demo gateway declined this payment. No order was charged and the reserved items have been released. Your bag is unchanged, so you can try again.');
      }
    } catch (err) {
      setPayState('failed');
      setPayMessage(err instanceof ApiError ? err.message : 'Payment could not be processed.');
    }
  };

  const razorpayPay = async () => {
    if (!payment?.keyId) return;
    setPayState('processing');
    if (!window.Razorpay) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve();
        s.onerror = () => reject();
        document.body.appendChild(s);
      }).catch(() => {
        setPayState('failed');
        setPayMessage('Could not load the payment window. Check your connection and try again.');
      });
    }
    if (!window.Razorpay) return;
    const rz = new window.Razorpay({
      key: payment.keyId,
      amount: payment.totalPaise,
      currency: 'INR',
      name: 'ANTIQUORA',
      order_id: payment.providerOrderId,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      theme: { color: '#1F3B2D' },
      handler: async (r: Record<string, string>) => {
        try {
          const res = await api.post<{ orderNumber: string; status: string }>(`/api/checkout/payments/${payment.paymentId}/razorpay/verify`, r);
          await refreshCart();
          navigate(`/order-confirmation/${res.orderNumber}`, { replace: true });
        } catch (err) {
          setPayState('failed');
          setPayMessage(err instanceof ApiError ? err.message : 'Payment verification failed.');
        }
      },
      modal: { ondismiss: () => setPayState('idle') },
    });
    rz.open();
  };

  const cancelPayment = async () => {
    if (payment && payState !== 'failed') await api.post(`/api/checkout/payments/${payment.paymentId}/cancel`).catch(() => undefined);
    navigate('/cart');
  };

  const shipping = store?.shipping as StoreInfo['shipping'] | undefined;
  const summaryCart = review ?? cart;

  return (
    <div className="container-site py-10 md:py-14">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl md:text-5xl">Checkout</h1>
        <p className="hidden items-center gap-2 text-xs uppercase tracking-wider text-ink-muted sm:flex"><Lock className="h-3.5 w-3.5" /> Secure checkout</p>
      </div>
      <Stepper step={step} onJump={(i) => !payment && setStep(i)} />

      <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
        <div>
          {formError && <Notice tone="error" className="mb-6">{formError}</Notice>}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              {step === 0 && (
                <form onSubmit={next} noValidate className="space-y-5">
                  <h2 className="text-3xl">Customer information</h2>
                  <p className="text-sm text-ink-muted">Signed in as {user.email}. We’ll send order updates to the email below.</p>
                  <TextField label="Full name" autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} error={errors.name} required />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Email" type="email" autoComplete="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} error={errors.email} required />
                    <TextField label="Mobile number" type="tel" autoComplete="tel" placeholder="98XXXXXXXX" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} error={errors.phone} required />
                  </div>
                  <div className="flex justify-between pt-4">
                    <Link to="/cart" className="btn-ghost px-0"><ChevronLeft className="h-4 w-4" /> Back to bag</Link>
                    <SubmitButton className="btn-primary">Continue to shipping</SubmitButton>
                  </div>
                </form>
              )}

              {step === 1 && (
                <form onSubmit={next} noValidate className="space-y-5">
                  <h2 className="text-3xl">Shipping address</h2>
                  {addresses && addresses.length > 0 && (
                    <fieldset>
                      <legend className="field-label">Saved addresses</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {addresses.map((a) => (
                          <label key={a.id} className={`cursor-pointer border p-4 text-sm transition-colors ${selectedAddressId === a.id ? 'border-walnut bg-parchment/60' : 'border-line hover:border-walnut/50'}`}>
                            <input type="radio" name="addr" className="sr-only" checked={selectedAddressId === a.id} onChange={() => { setSelectedAddressId(a.id); setAddress({ ...a, line2: a.line2 ?? '' }); setErrors({}); }} />
                            <span className="font-medium text-walnut">{a.fullName}</span>{a.isDefault && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold-dark">Default</span>}
                            <span className="mt-1 block text-ink-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}</span>
                          </label>
                        ))}
                        <label className={`flex cursor-pointer items-center justify-center border border-dashed p-4 text-sm ${selectedAddressId === 'new' ? 'border-walnut bg-parchment/60' : 'border-line hover:border-walnut/50'}`}>
                          <input type="radio" name="addr" className="sr-only" checked={selectedAddressId === 'new'} onChange={() => { setSelectedAddressId('new'); setAddress({ ...emptyAddress, fullName: customer.name, phone: customer.phone }); }} />
                          + Use a new address
                        </label>
                      </div>
                    </fieldset>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Recipient name" autoComplete="shipping name" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} error={errors.fullName} required />
                    <TextField label="Recipient mobile" type="tel" autoComplete="shipping tel" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} error={errors.phone} required />
                  </div>
                  <TextField label="Address line 1" autoComplete="shipping address-line1" placeholder="House / flat no., street" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} error={errors.line1} required />
                  <TextField label="Address line 2 (optional)" autoComplete="shipping address-line2" placeholder="Area, landmark" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
                  <div className="grid gap-5 sm:grid-cols-3">
                    <TextField label="City" autoComplete="shipping address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} error={errors.city} required />
                    <SelectField label="State" autoComplete="shipping address-level1" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} error={errors.state} required>
                      <option value="">Select…</option>
                      {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                    </SelectField>
                    <TextField label="PIN code" inputMode="numeric" maxLength={6} autoComplete="shipping postal-code" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value.replace(/\D/g, '') })} error={errors.postalCode} required />
                  </div>
                  <TextField label="Country" value="India" disabled hint="We currently ship within India only." />
                  {selectedAddressId === 'new' && <Checkbox label="Save this address to my account" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />}
                  <div className="flex justify-between pt-4">
                    <button type="button" onClick={() => setStep(0)} className="btn-ghost px-0"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <SubmitButton className="btn-primary">Continue to delivery</SubmitButton>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={next} className="space-y-5">
                  <h2 className="text-3xl">Delivery method</h2>
                  <fieldset className="space-y-3">
                    <legend className="sr-only">Choose a delivery method</legend>
                    {(['standard', 'express'] as const).map((m) => {
                      const free = m === 'standard' && review && review.totals.freeShippingApplied;
                      const price = m === 'standard' ? shipping?.standardPaise : shipping?.expressPaise;
                      return (
                        <label key={m} className={`flex cursor-pointer items-center justify-between gap-4 border p-5 transition-colors ${delivery === m ? 'border-walnut bg-parchment/60' : 'border-line hover:border-walnut/50'}`}>
                          <span className="flex items-center gap-3">
                            <input type="radio" name="delivery" value={m} checked={delivery === m} onChange={() => setDelivery(m)} className="h-4 w-4 accent-forest" />
                            <span>
                              <span className="block font-medium capitalize text-walnut">{m} insured delivery</span>
                              <span className="text-sm text-ink-muted">{m === 'standard' ? shipping?.standardDays : shipping?.expressDays} · packed in archival materials</span>
                            </span>
                          </span>
                          <span className="text-sm font-medium text-walnut">{free ? 'Complimentary' : price != null ? formatINR(price) : '—'}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                  <p className="text-xs text-ink-muted">Demo shipping rule: standard shipping is free when your discounted subtotal reaches {shipping ? formatINR(shipping.freeShippingThresholdPaise) : ''}; express is a flat fee. Delivery estimates are indicative — no live courier tracking is connected.</p>
                  <TextAreaField label="Order notes (optional)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, gift message…" />
                  <div className="flex justify-between pt-4">
                    <button type="button" onClick={() => setStep(1)} className="btn-ghost px-0"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <SubmitButton className="btn-primary">Review order</SubmitButton>
                  </div>
                </form>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <h2 className="text-3xl">Review your order</h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="border border-line p-4 text-sm">
                      <div className="flex justify-between"><p className="field-label">Contact</p><button className="text-xs text-gold-dark underline" onClick={() => setStep(0)}>Edit</button></div>
                      <p className="text-walnut">{customer.name}</p>
                      <p className="text-ink-muted">{customer.email}</p>
                      <p className="text-ink-muted">{customer.phone}</p>
                    </div>
                    <div className="border border-line p-4 text-sm">
                      <div className="flex justify-between"><p className="field-label">Ship to</p><button className="text-xs text-gold-dark underline" onClick={() => setStep(1)}>Edit</button></div>
                      <p className="text-walnut">{address.fullName}</p>
                      <p className="text-ink-muted">{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                      <p className="text-ink-muted">{address.city}, {address.state} {address.postalCode}</p>
                    </div>
                    <div className="border border-line p-4 text-sm">
                      <div className="flex justify-between"><p className="field-label">Delivery</p><button className="text-xs text-gold-dark underline" onClick={() => setStep(2)}>Edit</button></div>
                      <p className="capitalize text-walnut">{delivery}</p>
                      <p className="text-ink-muted">{delivery === 'standard' ? shipping?.standardDays : shipping?.expressDays}</p>
                    </div>
                  </div>
                  {review?.warnings.length ? <Notice tone="warn">{review.warnings.join(' ')}</Notice> : null}
                  <Notice tone="demo">
                    <strong>Demo store:</strong> the next step uses a simulated payment gateway. No real payment is taken and no card details are requested or stored.
                  </Notice>
                  <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
                    <button type="button" onClick={() => setStep(2)} className="btn-ghost px-0"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <button onClick={placeOrder} disabled={placing || !review} className="btn-primary">
                      {placing && <Spinner className="h-4 w-4 text-ivory" />} Place order & continue to payment
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && payment && (
                <div className="space-y-6">
                  <h2 className="text-3xl">Payment</h2>
                  <p className="text-sm text-ink-muted">
                    Order <strong className="text-walnut">{payment.orderNumber}</strong> has been created and the items are reserved for 30 minutes while you complete payment.
                  </p>

                  {payState === 'failed' ? (
                    <div className="border border-danger/40 bg-red-50 p-6" role="alert">
                      <p className="flex items-center gap-2 font-medium text-danger"><XCircle className="h-5 w-5" /> Payment failed</p>
                      <p className="mt-2 text-sm text-ink-soft">{payMessage}</p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link to="/cart" className="btn-primary">Return to bag & try again</Link>
                        <Link to="/account/orders" className="btn-outline">View my orders</Link>
                      </div>
                    </div>
                  ) : payment.provider === 'DEMO' ? (
                    <div className="border-2 border-dashed border-gold-dark/60 bg-white/70 p-6 md:p-8">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 font-serif text-2xl text-walnut"><CreditCard className="h-5 w-5 text-gold-dark" /> ANTIQUORA Demo Gateway</p>
                        <DemoBadge />
                      </div>
                      <p className="mt-3 text-sm text-ink-soft">This is a <strong>simulated</strong> payment for demonstration. Choose a scenario below. No card number, UPI ID or bank detail is collected.</p>
                      <p className="mt-5 text-sm text-ink-muted">Amount to pay</p>
                      <p className="font-serif text-4xl text-walnut">{formatINR(payment.totalPaise)}</p>
                      {payState === 'processing' ? (
                        <div className="mt-6 flex items-center gap-3 text-sm text-ink-soft" role="status"><Spinner /> Contacting demo gateway…</div>
                      ) : (
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          <button onClick={() => demoPay('success')} className="btn bg-success text-white hover:bg-emerald-800">
                            <CheckCircle2 className="h-4 w-4" /> Simulate successful payment
                          </button>
                          <button onClick={() => demoPay('failure')} className="btn border border-danger text-danger hover:bg-danger hover:text-white">
                            <AlertTriangle className="h-4 w-4" /> Simulate failed payment
                          </button>
                        </div>
                      )}
                      <button onClick={cancelPayment} disabled={payState === 'processing'} className="mt-5 text-xs uppercase tracking-wider text-ink-muted underline-offset-4 hover:text-walnut hover:underline">
                        Cancel payment and return to bag
                      </button>
                    </div>
                  ) : (
                    <div className="border border-line bg-white/70 p-6">
                      <p className="font-serif text-2xl text-walnut">Pay securely with Razorpay</p>
                      <p className="mt-2 text-sm text-ink-muted">You’ll complete payment in Razorpay’s secure window. Payment is confirmed only after server-side signature verification.</p>
                      <p className="mt-4 font-serif text-4xl text-walnut">{formatINR(payment.totalPaise)}</p>
                      <button onClick={razorpayPay} disabled={payState === 'processing'} className="btn-primary mt-6">
                        {payState === 'processing' && <Spinner className="h-4 w-4 text-ivory" />} Pay {formatINR(payment.totalPaise)}
                      </button>
                    </div>
                  )}
                  <p className="flex items-center gap-2 text-xs text-ink-muted"><ShieldCheck className="h-4 w-4" /> Your order total was calculated on our server; the browser cannot change it.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Order summary">
          <div className="card p-6">
            <h2 className="mb-5 text-2xl">Summary</h2>
            <ul className="mb-5 max-h-[320px] space-y-4 overflow-y-auto">
              {summaryCart.items.map((i) => (
                <li key={i.id} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 bg-parchment">
                    <Img src={i.product.image?.url} alt="" className="h-full w-full object-cover" />
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-walnut text-[10px] text-ivory">{i.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-serif text-base text-walnut">{i.product.name}</p>
                    <p className="text-xs text-ink-muted">{i.product.sku}</p>
                  </div>
                  <p className="text-sm tabular-nums text-walnut">{formatINR(i.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>
            <OrderTotals totals={payment ? { ...summaryCart.totals, totalPaise: payment.totalPaise } : summaryCart.totals} deliveryLabel={step >= 2 ? delivery : undefined} />
            {step < 2 && <p className="mt-3 text-xs text-ink-muted">Shipping is finalised when you choose a delivery method.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
