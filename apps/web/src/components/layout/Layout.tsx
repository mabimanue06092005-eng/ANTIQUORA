import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { PageLoader } from '../ui';
import { CursorSpotlight, ScrollProgress } from '../fx';
import { FloatingSearchButton, SearchPanelProvider } from '../museum/SearchPanel';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <SearchPanelProvider>
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-[200] bg-walnut px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <ScrollProgress />
      <CursorSpotlight />
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <FloatingSearchButton />
    </div>
    </SearchPanelProvider>
  );
}
