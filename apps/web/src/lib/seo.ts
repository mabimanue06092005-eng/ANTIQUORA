import { useEffect } from 'react';

interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: object | null;
}

const SITE = 'ANTIQUORA';
const DEFAULT_DESC = 'A curated marketplace for antique-inspired collectibles, historical artifacts, vintage furniture, coins, manuscripts and ceramics.';

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/** Sets per-route document title, meta description, Open Graph tags and optional JSON-LD. */
export function useSeo({ title, description = DEFAULT_DESC, image = '/images/og-default.jpg', type = 'website', noindex, jsonLd }: SeoOptions) {
  useEffect(() => {
    const full = title ? `${title} — ${SITE}` : `${SITE} — Own a Piece of History`;
    document.title = full;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', new URL(image, window.location.origin).href);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', window.location.href);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      script?.remove();
    };
  }, [title, description, image, type, noindex, jsonLd]);
}
