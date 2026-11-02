import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { Emblem } from '../components/layout/Logo';

export default function NotFound({ message }: { message?: string }) {
  useSeo({ title: 'Page not found', noindex: true });
  return (
    <section className="container-site flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <Emblem className="h-16 w-16 text-gold" />
      <p className="mt-6 font-serif text-[120px] leading-none text-parchment-deep">404</p>
      <h1 className="-mt-6 text-4xl md:text-5xl">Lost to history</h1>
      <p className="mt-4 max-w-md text-ink-muted">{message ?? 'The page you were looking for has been moved, sold or perhaps never existed. Let us guide you back to the collection.'}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Return home</Link>
        <Link to="/shop" className="btn-outline">Browse the collection</Link>
      </div>
    </section>
  );
}
