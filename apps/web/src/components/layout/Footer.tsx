import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { NewsletterForm } from '../NewsletterForm';
import { Logo } from './Logo';

const COLS = [
  {
    title: 'Explore',
    links: [
      ['The Gallery', '/gallery'],
      ['All artifacts (list)', '/shop'],
      ['The Numismatic Vault', '/chambers/ancient-coins'],
      ['The Hall of Marble', '/chambers/sculptures-statues'],
      ['The Cabinet Room', '/chambers/vintage-furniture'],
      ['The Kiln Gallery', '/chambers/pottery-ceramics'],
      ['The Scriptorium', '/chambers/manuscripts-prints'],
      ['The Wunderkammer', '/chambers/decorative-collectibles'],
    ],
  },
  {
    title: 'Customer Care',
    links: [
      ['Contact Us', '/contact'],
      ['FAQ', '/faq'],
      ['Shipping & Returns', '/shipping-returns'],
      ['My Account', '/account'],
      ['Order History', '/account/orders'],
    ],
  },
  {
    title: 'ANTIQUORA',
    links: [
      ['Our Story', '/our-story'],
      ['Privacy Policy', '/privacy'],
      ['Terms & Conditions', '/terms'],
    ],
  },
];

export function Footer() {
  const { store } = useShop();
  const s = store?.store;
  return (
    <footer className="bg-walnut-dark text-ivory/80">
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:py-20">
        <div>
          <Logo light />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/70">
            A curated marketplace for antique-inspired collectibles, historical artifacts and decorative objects — chosen for their craftsmanship and the stories they carry.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" aria-hidden />
              <span>{s?.address ?? 'Demo address (placeholder)'}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
              <span>{s?.supportPhone ?? '+91 00000 00000'} <span className="text-ivory/50">(placeholder)</span></span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
              <span>{s?.supportEmail ?? 'hello@antiquora.example'} <span className="text-ivory/50">(placeholder)</span></span>
            </li>
          </ul>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-5 font-sans text-[11px] font-medium uppercase tracking-caps text-gold-light">{c.title}</h2>
            <ul className="space-y-3 text-sm">
              {c.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="link-underline text-ivory/75 hover:text-ivory">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-site grid items-center gap-8 py-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl text-ivory">Letters from the archive</h2>
            <p className="mt-1 text-sm text-ivory/60">New arrivals, collecting notes and the occasional story behind an object. No spam.</p>
          </div>
          <NewsletterForm source="footer" dark />
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-site flex flex-col items-center justify-between gap-4 py-6 text-xs text-ivory/50 md:flex-row">
          <p>© {new Date().getFullYear()} ANTIQUORA. Demonstration storefront — products, prices and orders are illustrative.</p>
          <ul className="flex items-center gap-1" aria-label="Social media (placeholder links)">
            {[
              [Instagram, 'Instagram'],
              [Facebook, 'Facebook'],
              [Youtube, 'YouTube'],
              [Linkedin, 'LinkedIn'],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Instagram;
              return (
                <li key={label as string}>
                  <a href="#" onClick={(e) => e.preventDefault()} className="flex h-10 w-10 items-center justify-center text-ivory/60 hover:text-gold-light" aria-label={`${label} (placeholder link)`}>
                    <I className="h-4 w-4" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </footer>
  );
}
