import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { Layout, ScrollToTop } from './components/layout/Layout';
import { RequireAdmin, RequireAuth } from './components/Guards';
import { PageLoader } from './components/ui';
import Home from './pages/Home';

// Route-level code splitting: everything except the homepage loads on demand.
const Shop = lazy(() => import('./pages/Shop'));
const Gallery = lazy(() => import('./pages/Gallery'));
const MuseumHome = lazy(() => import('./pages/MuseumHome'));
const Relic = lazy(() => import('./pages/Relic'));
const PhotoExhibition = lazy(() => import('./pages/PhotoExhibition'));
const Chamber = lazy(() => import('./pages/Chamber'));
const Categories = lazy(() => import('./pages/Categories'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const info = () => import('./pages/Info');
const OurStory = lazy(() => info().then((m) => ({ default: m.OurStory })));
const Contact = lazy(() => info().then((m) => ({ default: m.Contact })));
const FAQ = lazy(() => info().then((m) => ({ default: m.FAQ })));
const ShippingReturns = lazy(() => info().then((m) => ({ default: m.ShippingReturns })));
const Privacy = lazy(() => info().then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => info().then((m) => ({ default: m.Terms })));
const acct = () => import('./pages/account/Account');
const AccountLayout = lazy(() => acct().then((m) => ({ default: m.AccountLayout })));
const AccountOverview = lazy(() => acct().then((m) => ({ default: m.AccountOverview })));
const AccountOrders = lazy(() => acct().then((m) => ({ default: m.AccountOrders })));
const AccountOrderDetail = lazy(() => acct().then((m) => ({ default: m.AccountOrderDetail })));
const AccountWishlist = lazy(() => acct().then((m) => ({ default: m.AccountWishlist })));
const AccountAddresses = lazy(() => acct().then((m) => ({ default: m.AccountAddresses })));
const AccountProfile = lazy(() => acct().then((m) => ({ default: m.AccountProfile })));
const AccountPassword = lazy(() => acct().then((m) => ({ default: m.AccountPassword })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const adminProducts = () => import('./pages/admin/Products');
const AdminProducts = lazy(() => adminProducts().then((m) => ({ default: m.AdminProducts })));
const AdminProductEdit = lazy(() => adminProducts().then((m) => ({ default: m.AdminProductEdit })));
const adminOrders = () => import('./pages/admin/Orders');
const AdminOrders = lazy(() => adminOrders().then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => adminOrders().then((m) => ({ default: m.AdminOrderDetail })));
const manage = () => import('./pages/admin/Manage');
const AdminCategories = lazy(() => manage().then((m) => ({ default: m.AdminCategories })));
const AdminCustomers = lazy(() => manage().then((m) => ({ default: m.AdminCustomers })));
const AdminCustomerDetail = lazy(() => manage().then((m) => ({ default: m.AdminCustomerDetail })));
const AdminCoupons = lazy(() => manage().then((m) => ({ default: m.AdminCoupons })));
const AdminNewsletter = lazy(() => manage().then((m) => ({ default: m.AdminNewsletter })));
const AdminMessages = lazy(() => manage().then((m) => ({ default: m.AdminMessages })));
const AdminSettings = lazy(() => manage().then((m) => ({ default: m.AdminSettings })));
const AdminAuditLog = lazy(() => manage().then((m) => ({ default: m.AdminAuditLog })));

function Root() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/shop', element: <Shop /> },
          { path: '/gallery', element: <Gallery /> },
          { path: '/museum', element: <MuseumHome /> },
          { path: '/relic', element: <Relic /> },
          { path: '/exhibition', element: <PhotoExhibition /> },
          { path: '/chambers', element: <Chamber /> },
          { path: '/chambers/:slug', element: <Chamber /> },
          { path: '/categories', element: <Categories /> },
          { path: '/artifact/:slug', element: <Product /> },
          { path: '/cart', element: <Cart /> },
          { path: '/wishlist', element: <Wishlist /> },
          { path: '/checkout', element: <Checkout /> },
          { path: '/order-confirmation/:orderNumber', element: <RequireAuth><OrderConfirmation /></RequireAuth> },
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
          { path: '/our-story', element: <OurStory /> },
          { path: '/contact', element: <Contact /> },
          { path: '/faq', element: <FAQ /> },
          { path: '/shipping-returns', element: <ShippingReturns /> },
          { path: '/privacy', element: <Privacy /> },
          { path: '/terms', element: <Terms /> },
          {
            path: '/account',
            element: <RequireAuth><AccountLayout /></RequireAuth>,
            children: [
              { index: true, element: <AccountOverview /> },
              { path: 'orders', element: <AccountOrders /> },
              { path: 'orders/:orderNumber', element: <AccountOrderDetail /> },
              { path: 'wishlist', element: <AccountWishlist /> },
              { path: 'addresses', element: <AccountAddresses /> },
              { path: 'profile', element: <AccountProfile /> },
              { path: 'password', element: <AccountPassword /> },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        path: '/admin',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RequireAdmin><AdminLayout /></RequireAdmin>
          </Suspense>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'products', element: <AdminProducts /> },
          { path: 'products/new', element: <AdminProductEdit /> },
          { path: 'products/:id', element: <AdminProductEdit /> },
          { path: 'orders', element: <AdminOrders /> },
          { path: 'orders/:id', element: <AdminOrderDetail /> },
          { path: 'categories', element: <AdminCategories /> },
          { path: 'customers', element: <AdminCustomers /> },
          { path: 'customers/:id', element: <AdminCustomerDetail /> },
          { path: 'coupons', element: <AdminCoupons /> },
          { path: 'newsletter', element: <AdminNewsletter /> },
          { path: 'messages', element: <AdminMessages /> },
          { path: 'settings', element: <AdminSettings /> },
          { path: 'audit-log', element: <AdminAuditLog /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
