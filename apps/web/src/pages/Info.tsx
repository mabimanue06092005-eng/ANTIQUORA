import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { useShop } from '../context/ShopContext';
import { Img, Notice, PageHeader, Reveal, SubmitButton, TextAreaField, TextField, formatINR } from '../components/ui';
import { SpotlightCard } from '@/components/fx';

export function OurStory() {
  useSeo({ title: 'Our Story', description: 'ANTIQUORA connects collectors with remarkable objects, described candidly and handled with care.' });
  return (
    <>
      <section className="relative overflow-hidden bg-walnut-dark text-ivory">
        <Img src="/images/products/mahogany-chest-on-chest-1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover !opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-walnut-dark via-walnut-dark/80 to-transparent" aria-hidden />
        <div className="container-site relative py-24 md:py-36">
          <p className="text-[11px] uppercase tracking-caps text-gold-light">Our story</p>
          <h1 className="mt-4 max-w-3xl text-5xl leading-[1.02] text-ivory md:text-7xl">We believe old things deserve new attention.</h1>
          <p className="mt-6 max-w-xl text-lg text-ivory/75">ANTIQUORA began with a simple idea: that buying a piece of history should feel as considered as the object itself.</p>
        </div>
      </section>
      <section className="container-site grid gap-16 py-20 md:grid-cols-2 md:py-28">
        <Reveal>
          <p className="eyebrow">Why we exist</p>
          <h2 className="mt-3 text-4xl">Craft, carried forward</h2>
          <div className="prose-antique mt-6">
            <p>The hands that struck an Athenian coin, carved a Gandhāran Buddha or veneered a Georgian chest are long gone. What remains is their skill — preserved in metal, stone and wood. We think that is worth celebrating.</p>
            <p>Our marketplace brings together collectible objects from many fields so that new collectors can find their way in, and experienced ones can find the piece they have been waiting for.</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="eyebrow">How we describe objects</p>
          <h2 className="mt-3 text-4xl">Candour over romance</h2>
          <div className="prose-antique mt-6">
            <p>Every listing separates what is documented from what is illustrative. We never invent certificates, appraisals, archaeological findspots or export permissions. If something is uncertain, we say so.</p>
            <p>In this demonstration store, photographs are public-domain reference images from The Metropolitan Museum of Art’s Open Access programme, and the listing details — prices, stock, condition and provenance notes — are illustrative.</p>
          </div>
        </Reveal>
      </section>
      <section className="border-y border-line bg-parchment/50">
        <div className="container-site grid gap-10 py-16 md:grid-cols-3">
          {[
            ['Curate', 'We select objects for craftsmanship, character and condition — not for hype.'],
            ['Describe', 'Clear photographs, measured language and honest condition notes for every piece.'],
            ['Deliver', 'Archival packing, insured shipping and a returns policy written in plain English.'],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.08} className="h-full">
              <SpotlightCard className="h-full border border-line bg-ivory/70 p-8">
                <p className="font-serif text-5xl text-gold/60 transition-colors duration-500 group-hover/spot:text-gold-dark">0{i + 1}</p>
                <h3 className="mt-2 text-2xl">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{d}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="container-site py-20 text-center">
        <h2 className="text-4xl">Begin your own collection</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-primary">Explore the collection</Link>
          <Link to="/contact" className="btn-outline">Speak with us</Link>
        </div>
      </section>
    </>
  );
}

export function Contact() {
  useSeo({ title: 'Contact', description: 'Questions about an object, delivery or an order? Write to the ANTIQUORA team.' });
  const { store } = useShop();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.subject.trim().length < 3) errs.subject = 'Enter a subject';
    if (form.message.trim().length < 20) errs.message = 'Please write at least 20 characters';
    setErrors(errs);
    setStatus(null);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/api/contact', form);
      setStatus({ tone: 'success', message: res.message });
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setStatus({ tone: 'error', message: err.message });
      } else setStatus({ tone: 'error', message: 'Could not send your message. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Customer care" title="Contact us" crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}>
        Questions about an object, delivery or an existing order? We reply within two business days.
      </PageHeader>
      <div className="container-site grid gap-14 py-14 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} noValidate className="space-y-5">
          {status && <Notice tone={status.tone}>{status.message}</Notice>}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Full name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
            <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
          </div>
          <TextField label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} error={errors.subject} required />
          <TextAreaField label="Message" rows={7} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} error={errors.message} required />
          {/* Honeypot — hidden from people and assistive tech */}
          <div className="hidden" aria-hidden>
            <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
          </div>
          <SubmitButton loading={loading} className="btn-primary">Send message</SubmitButton>
        </form>
        <aside className="space-y-6 border-t border-line pt-8 text-sm lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div>
            <p className="field-label">Visit (by appointment)</p>
            <p className="flex gap-2 text-ink-soft"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" /> {store?.store.address}</p>
          </div>
          <div>
            <p className="field-label">Call</p>
            <p className="flex gap-2 text-ink-soft"><Phone className="mt-0.5 h-4 w-4 text-gold-dark" /> {store?.store.supportPhone} (placeholder)</p>
          </div>
          <div>
            <p className="field-label">Email</p>
            <p className="flex gap-2 text-ink-soft"><Mail className="mt-0.5 h-4 w-4 text-gold-dark" /> {store?.store.supportEmail} (placeholder)</p>
          </div>
          <Notice tone="demo">Contact details shown are placeholders for this demonstration store. Messages are saved for the store team to review in the admin dashboard.</Notice>
        </aside>
      </div>
    </>
  );
}

const FAQS: [string, ReactNode][] = [
  ['Are your objects authenticated?', 'We describe each object carefully and separate documented facts from illustrative information. ANTIQUORA does not claim third-party authentication or certified authenticity for demo listings, and we never issue certificates we cannot support.'],
  ['What does “illustrative marketplace data” mean?', 'In this demonstration store, photographs are public-domain museum reference images. Prices, stock, condition notes and provenance text are invented for demonstration and are labelled as such on every product page.'],
  ['How is shipping calculated?', 'Standard insured shipping is a flat fee and becomes complimentary once your discounted subtotal reaches the free-shipping threshold. Express delivery is a flat fee. Both are shown before you pay.'],
  ['Can I cancel an order?', 'Yes — orders that are awaiting payment or confirmed (not yet processing) can be cancelled from your account. Once an order is being prepared, please contact us.'],
  ['Is the payment real?', 'Not in demo mode. Checkout uses a clearly labelled simulated gateway with success and failure scenarios. No card or bank details are requested or stored. The codebase is ready for a real provider such as Razorpay.'],
  ['Do you ship outside India?', 'Not at present. Antiquities can also be subject to export and import restrictions, and buyers are responsible for compliance with the laws that apply to them.'],
  ['Which discount codes can I try?', 'WELCOME10 (10% off, max ₹5,000), HERITAGE2000 (₹2,000 off orders above ₹20,000) and COLLECTOR15 (15% off orders above ₹1,00,000).'],
];

export function FAQ() {
  useSeo({ title: 'Frequently asked questions', description: 'Answers about authenticity, shipping, payment, returns and ordering at ANTIQUORA.' });
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <PageHeader eyebrow="Help" title="Frequently asked questions" crumbs={[{ label: 'Home', to: '/' }, { label: 'FAQ' }]} />
      <div className="container-site max-w-3xl py-14">
        <ul className="border-t border-line">
          {FAQS.map(([q, a], i) => (
            <li key={q} className="border-b border-line">
              <h2 className="font-sans text-base">
                <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 py-5 text-left font-serif text-xl text-walnut md:text-2xl">
                  {q}
                  <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden />
                </button>
              </h2>
              {open === i && <p className="pb-6 leading-relaxed text-ink-soft">{a}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-10 text-ink-muted">Still have a question? <Link to="/contact" className="underline hover:text-walnut">Contact our team</Link>.</p>
      </div>
    </>
  );
}

function Policy({ title, children, seo }: { title: string; children: ReactNode; seo: string }) {
  useSeo({ title, description: seo });
  return (
    <>
      <PageHeader eyebrow="Policies" title={title} crumbs={[{ label: 'Home', to: '/' }, { label: title }]} />
      <div className="container-site max-w-3xl py-14">
        <Notice tone="demo" className="mb-8">This is template policy text for a demonstration store and is not legal advice. Have a qualified professional review policies before going live.</Notice>
        <div className="prose-antique">{children}</div>
      </div>
    </>
  );
}

export function ShippingReturns() {
  const { store } = useShop();
  const s = store?.shipping;
  return (
    <Policy title="Shipping & returns" seo="Shipping rates, delivery times and the returns policy at ANTIQUORA.">
      <h2>Shipping within India</h2>
      <ul>
        <li>Standard insured delivery: {s ? formatINR(s.standardPaise) : '₹499'} · {s?.standardDays ?? '5–8 business days'}.</li>
        <li>Complimentary standard delivery when your discounted subtotal is {s ? formatINR(s.freeShippingThresholdPaise) : '₹25,000'} or more.</li>
        <li>Express insured delivery: {s ? formatINR(s.expressPaise) : '₹1,299'} · {s?.expressDays ?? '2–4 business days'}.</li>
      </ul>
      <p>Every object is packed in acid-free tissue and appropriate padding; furniture and large ceramics are crated. Delivery times are estimates. This demonstration store is not connected to a courier, so no live tracking numbers are issued.</p>
      <h2>Returns</h2>
      <p>If an item is not as described, you may request a return within 7 days of delivery. Items must be returned in their original condition and packaging. Bespoke or altered items are not eligible.</p>
      <h2>Refunds</h2>
      <p>Approved refunds are issued to the original payment method. In demo mode, refunds are recorded for demonstration only — no money moves.</p>
      <h2>Export & import</h2>
      <p>We currently ship within India only. Antiquities may be subject to export controls (for example, India’s Antiquities and Art Treasures Act) and to import rules elsewhere. Buyers are responsible for compliance.</p>
    </Policy>
  );
}

export function Privacy() {
  return (
    <Policy title="Privacy policy" seo="How ANTIQUORA collects, uses and protects your personal information.">
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, phone (optional) and a securely hashed password.</li>
        <li>Order details: shipping address, items purchased and payment status. We never store card numbers.</li>
        <li>Messages you send through our contact form, and your email if you subscribe to our newsletter.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To fulfil orders, provide customer support, and — only if you subscribe — send our newsletter. We do not sell personal data.</p>
      <h2>Cookies</h2>
      <p>We use essential cookies only: a secure, HTTP-only session cookie for sign-in, a guest cookie that keeps your bag and wishlist, and a security token that protects forms. Recently viewed items are stored in your browser.</p>
      <h2>Your choices</h2>
      <p>You can update your profile and addresses at any time, unsubscribe from the newsletter, or contact us to request deletion of your account.</p>
    </Policy>
  );
}

export function Terms() {
  return (
    <Policy title="Terms & conditions" seo="The terms that apply when you browse and purchase from ANTIQUORA.">
      <h2>About this site</h2>
      <p>ANTIQUORA is a demonstration e-commerce storefront. Product listings, prices, stock levels and orders are illustrative, and payments in demo mode are simulated.</p>
      <h2>Descriptions</h2>
      <p>We describe objects in good faith. Information labelled “illustrative” is not a representation of fact. We do not provide certificates of authenticity, appraisals or export permissions for demo listings.</p>
      <h2>Orders & pricing</h2>
      <p>All prices are in Indian Rupees and are verified on our server at checkout. An order is accepted only when payment has been confirmed. We may cancel an order if an item becomes unavailable, in which case any payment is refunded.</p>
      <h2>Accounts</h2>
      <p>You are responsible for keeping your password confidential. We may suspend accounts that are used fraudulently or abusively.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, our liability is limited to the amount you paid for the relevant order.</p>
    </Policy>
  );
}
