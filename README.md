# ANTIQUORA — Own a Piece of History

A complete, production-style demo of a premium antique & historical-artifacts marketplace:
React + Vite storefront, Express + Prisma + PostgreSQL API, real authentication, a
database-backed cart/wishlist/checkout, a clearly-labelled **demo payment gateway**, a
Razorpay-ready payment path, and a role-protected admin dashboard.

> **Demo data notice.** Product photographs are public-domain (CC0) reference images from
> [The Metropolitan Museum of Art Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)
> programme; the pictured objects belong to The Met and are not for sale. Prices, stock,
> condition notes, provenance text, demo customers and seeded orders are **illustrative**
> and are labelled as such in the UI. No certificates, appraisals or export permissions are claimed.

---

## Contents

1. [Tech stack](#tech-stack) · 2. [Quick start](#quick-start) · 3. [Commands](#commands) ·
4. [Environment](#environment-variables) · 5. [Database](#database-reset--seed) ·
6. [Demo accounts](#demo-customer--admin-access) · 7. [Demo payments](#payments) ·
8. [Testing](#testing) · 9. [Project structure](#project-structure) · 10. [Security](#security-notes) ·
11. [Deployment](#deployment) · 12. [Troubleshooting](#troubleshooting) · [API reference](docs/API.md)

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS 3, React Router 7, Framer Motion, Lucide icons |
| Backend | Node.js 20+, Express 4, TypeScript, Prisma 5, PostgreSQL, Zod 4, pino logging |
| Auth | bcrypt (cost 12) password hashing, DB-backed sessions in HTTP-only cookies, double-submit CSRF tokens, role-based authorisation |
| Testing | Vitest (unit + API integration via Supertest), Playwright (end-to-end, desktop + mobile) |
| Local DB | `embedded-postgres` (real PostgreSQL binaries via npm — no Docker needed) or Docker Compose |

## Quick start

Requirements: **Node.js 20+** (tested on 24) and npm. Docker is optional.

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env` and set `SESSION_SECRET` to a long random string (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

Start everything — the embedded PostgreSQL (data in `./.local-pg`), pending migrations, the API on :4000
and the storefront on :5173 — with one command:

```bash
npm run dev
```

When it prints `ANTIQUORA is ready → http://localhost:5173`, open that URL. `Ctrl+C` stops everything it
started, including the database. Services that are already running are reused rather than restarted.

First time only, in a second terminal while `npm run dev` is running, load the demo data and create your admin:

```bash
npm run db:seed
```

```bash
npm run admin:create
```

> Using Docker instead of the embedded database: `docker compose up -d db` and change the port in
> `DATABASE_URL` to `5432`; `npm run dev` then uses that server. `npm run db:local` still starts the embedded
> database on its own if you prefer separate terminals.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Embedded PostgreSQL (if needed) + migrations + API (tsx watch) + Vite dev server, with clean shutdown |
| `npm run dev:api` / `npm run dev:web` | Run either side alone |
| `npm run db:local` | Start embedded PostgreSQL on port 5433 (UTF-8) |
| `npm run db:migrate` | Apply Prisma migrations (`prisma migrate deploy`) |
| `npm run db:seed` | **Reset** demo data: 6 categories, 30 products, coupons, demo customers, 14 orders, subscribers, messages. Admins are kept; customer accounts are removed. |
| `npm run db:reset` | Drop & recreate the schema, re-run migrations and seed |
| `npm run admin:create` | Development-only admin bootstrap (see below) |
| `npm run typecheck` | TypeScript checks for API and web |
| `npm run build` | Compile API to `apps/api/dist`, build web to `apps/web/dist` |
| `npm start` | Production server: API + built storefront on one port |
| `npm test` | Unit + API integration tests (Vitest) |
| `npm run test:e2e` | Playwright journeys (starts servers if not running) |
| `node scripts/screenshots.mjs <dir> / /shop` | Full-page screenshots at 1440px and 390px |

## Environment variables

All configuration lives in the repository-root `.env` (template: [`.env.example`](.env.example)).
The API validates it on start-up and exits with a readable list of problems if anything is missing.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes | ≥ 32 chars; signs session-token hashes |
| `API_PORT` | no | Default `4000` |
| `CORS_ORIGINS` | no | Comma-separated origins allowed to send cookies |
| `PUBLIC_SITE_URL` | no | Used for sitemap URLs; `https://…` also enables HSTS |
| `SESSION_TTL_DAYS` | no | Default 14 |
| `PAYMENT_PROVIDER` | no | `demo` (default) or `razorpay` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | if razorpay | Server-side keys — never exposed except the public key id |
| `SMTP_URL`, `MAIL_FROM` | no | Email is logged in development when unset |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | no | Dev-only defaults for `admin:create` and the admin E2E tests |

## Database, reset & seed

The schema is in [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma), with
migrations in `apps/api/prisma/migrations`. Highlights:

- Money is stored as **integer paise** (`Int`) — no floating-point currency.
- `OrderItem` stores a **snapshot** of product name, SKU, slug, image and unit price.
- Enums for `OrderStatus`, `PaymentStatus`, `ProductStatus`, `Role`, `ProvenanceType`.
- Unique constraints on email, SKU, slug, coupon code, `(cartId, productId)`, `(wishlistId, productId)`.
- `AuditLog` records every admin change; `OrderEvent` records the order timeline.

To start completely fresh: `npm run db:reset` (or stop `db:local` and delete `.local-pg/`).

## Demo customer & admin access

No credentials are hard-coded and no default admin ships with the code.

**Admin (development only):**

```bash
npm run admin:create -- --email you@example.com --password "Choose-a-strong-pass1"
```

- With no `--password` (and no `ADMIN_PASSWORD` in `.env`) a strong random password is generated and printed **once**.
- Re-running for an existing email resets that account's password (useful as a dev "forgot password").
- Refuses to run when `NODE_ENV=production` unless `--allow-production` is passed.
- Sign in at `/login`; admins are taken to `/admin`.

**Customer:** register at `/register`, or create one from the CLI:

```bash
npm run admin:create -- --role customer --email shopper@example.com
```

Seeded "(Demo)" customers exist only to populate order history and **cannot sign in** (random unknown passwords).

## Payments

### Demo mode (default — `PAYMENT_PROVIDER=demo`)

1. Add items → **Checkout** (sign-in required): Information → Shipping → Delivery → Review → Payment.
2. "Place order" creates the order on the server (status **Pending payment**), validating stock and
   recomputing every price, discount, shipping and tax amount. Stock is reserved for 30 minutes.
3. The **ANTIQUORA Demo Gateway** offers two clearly-labelled buttons:
   - **Simulate successful payment** → payment `SUCCEEDED (DEMO)`, order `CONFIRMED`, cart cleared, confirmation page with order number.
   - **Simulate failed payment** → payment `FAILED`, order `PAYMENT_FAILED`, reserved stock released, cart kept for retry.
4. No card, UPI or bank details are ever requested or stored.

Demo discount codes: `WELCOME10` (10%, max ₹5,000), `HERITAGE2000` (₹2,000 off ≥ ₹20,000),
`COLLECTOR15` (15% off ≥ ₹1,00,000, max ₹25,000), `EXPIRED50` (demonstrates expiry validation).

Demo shipping rule (editable in **Admin → Settings**): standard ₹499, free when the discounted
subtotal is ≥ ₹25,000; express ₹1,299. Prices are GST-inclusive; an extra tax rate can be configured.

### Razorpay (integration-ready)

Set `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. The server then creates a
Razorpay order for the server-computed amount, the browser opens Razorpay Checkout, and the order is
confirmed only after **HMAC-SHA256 signature verification** on the server
(`POST /api/checkout/payments/:id/razorpay/verify`). This path is implemented but has **not been
verified against live Razorpay credentials** in this repository; test with Razorpay test keys before use.
For production, also add a Razorpay webhook (`payment.captured`) handler for resilience.

## Testing

```bash
npm test
```

Runs API unit tests (pricing, coupons, config) and API integration tests against an isolated
`antiquora_test` database that is created, migrated and seeded automatically (PostgreSQL must be running),
plus web unit tests.

```bash
npm run test:e2e
```

Playwright journeys in [`e2e/journeys.spec.ts`](e2e/journeys.spec.ts) — browse, search, filter, product
detail, cart quantity + coupon, register/logout/login, wishlist, successful and failed demo checkout,
order history, validation messages, admin product CRUD, admin order update, unauthorised admin access,
and a mobile navigation/overflow check. Admin journeys use `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`
(skipped if unset). E2E runs against the dev database; run `npm run db:seed` afterwards for a clean demo.

The suite signs in many times, which trips the sign-in rate limit (20 per 15 minutes) on a normally started
API. Playwright reuses a running API, so either stop `npm run dev` first (Playwright then starts its own with
limits relaxed) or start the stack for testing with `DISABLE_RATE_LIMIT=1 npm run dev` (macOS/Linux/Git Bash).
Most journeys use reduced motion; the homepage, `/exhibition` and `/relic` journeys run with motion enabled.

First run only: `npx playwright install chromium`.

## Project structure

```
.
├── apps/
│   ├── api/                    Express + Prisma API
│   │   ├── prisma/             schema, migrations, seed.ts, seed-data.ts, image-manifest.json
│   │   ├── scripts/            create-admin.ts (dev bootstrap)
│   │   ├── src/
│   │   │   ├── config.ts       zod-validated environment
│   │   │   ├── app.ts          middleware stack & routers
│   │   │   ├── middleware/     sessions + CSRF, rate limits, error handler
│   │   │   ├── routes/         auth, account, catalog, cart, wishlist, checkout, orders, forms, admin, seo
│   │   │   └── services/       pricing, cart, orders (transactions & lifecycle), razorpay, settings
│   │   └── tests/              vitest unit + supertest integration
│   └── web/                    React storefront & admin
│       ├── public/images/      local CC0 product photos, placeholder, OG image
│       └── src/
│           ├── components/     layout (header, footer, drawers), product cards, UI kit
│           ├── context/        auth, shop (cart/wishlist/store), toasts
│           ├── lib/            api client (CSRF), formatting, SEO hook, types
│           └── pages/          storefront, account/, admin/
├── e2e/                        Playwright specs
├── scripts/                    local-db, dev runner, image fetcher, screenshots
├── docs/API.md                 REST API reference
├── docker-compose.yml, Dockerfile
└── .env.example
```

## UI components (shadcn/ui conventions)

The web app follows the shadcn/ui layout so components from the shadcn ecosystem can be dropped in:

- `apps/web/components.json` — shadcn CLI config (aliases `@/components`, `@/components/ui`, `@/lib/utils`).
- `@/…` resolves to `apps/web/src` (Vite `resolve.alias` + `tsconfig` `paths`).
- `src/lib/utils.ts` exports `cn()` (clsx + tailwind-merge).
- `src/components/ui/` holds UI primitives: `index.tsx` (the ANTIQUORA kit, imported as `components/ui`) and
  `coverflow-carousel.tsx` (+ `coverflow-carousel.demo.tsx`). Keeping primitives here matters because the
  shadcn CLI writes generated components to this alias, and copied components import each other via `@/components/ui/*`.
- shadcn semantic tokens (`background`, `foreground`, `muted`, `muted-foreground`, `ring`) are CSS variables in
  `src/index.css`, mapped onto the ANTIQUORA palette in `tailwind.config.js`; `tailwindcss-animate` provides `animate-in` utilities.

Add more with `npx shadcn@latest add <component>` from `apps/web`. If the CLI asks to overwrite
`tailwind.config.js` or `index.css`, decline and add only the tokens the component needs; the existing theme
is hand-tuned. The homepage "Collection in the Round" section uses `CoverflowCarousel` with live catalogue data.

## The Living Museum (product discovery)

Discovery is built as a private digital museum rather than rows of product cards. All content comes from the
existing catalogue API — nothing is hard-coded in the frontend.

| Route | Experience |
| --- | --- |
| `/` | The orbital museum: the gilded infinity relic with revolving rings and artefacts, the collection in orbit and the moonlit chamber (WebGL), then the Live Library, the Collections and About — see [Homepage](#homepage-the-orbital-museum) below. Without WebGL it shows `/exhibition`; `/?experience=off` shows the Living Museum page |
| `/exhibition` | The photographic exhibition with its entrance hall (no WebGL) |
| `/museum` | Living Museum page: cinematic opening scene (spotlit sculpture, layered "MVSEVM" inscription, "Enter the Collection" curtain transition), *Objects in Conversation*, *The Curator's Living Canvas*, chamber doorways, time-travel dial |
| `/relic` | The WebGL experience on its own. Falls back to the Living Museum without WebGL or with reduced motion; `?experience=on` forces it |
| `/gallery` | Infinite horizontal artifact gallery: varied scales, neighbours partly visible, glass information panel for the selection. Drag, touch swipe, trackpad / Shift+wheel, ← → Home End, Enter to open, prev/next buttons, a thumbnail scrubber and a plain text index of every artifact in view. Vertical scrolling is never captured. `?a=<slug>` keeps your place |
| `/chambers/:slug` | Six themed Collector's Chambers (Numismatic Vault, Hall of Marble, Cabinet Room, Kiln Gallery, Scriptorium, Wunderkammer), each with its own palette and frame furniture, a horizontally panned wall and a visual collection navigator |
| `/artifact/:slug` | Cinematic showcase: ambient light from the artifact, loupe gallery, layered glass purchase panel (price, stock, quantity, Add to bag, Buy now, Wishlist), specimen card, tabbed dossier (description, details, condition, provenance, shipping), related and recently viewed strips, and "Back to …" returning to the exact gallery position or chamber you came from |
| `/shop` | Compact results view with full filters. The **Immersive / Compact** toggle switches between `/gallery` and `/shop` with the same filters |

The floating glass search panel (button bottom-right, header search, `Ctrl/⌘ K` or `/`) offers text search,
chambers, price range, availability and sort with a live preview, then opens the results in either view. The last
filters are remembered for the session. Everything is 2D (CSS transforms + Framer Motion); no 3D library is used.

## Homepage: the orbital museum

The first screen is the WebGL scene (`apps/web/src/experience/`, three.js + R3F, code-split): a procedural
gilded infinity symbol (a lemniscate tube with a point of light travelling along it) under a warm spotlight, three
revolving luminous rings carrying medallions of real listing photographs, drifting fragments and dust. Scrolling
approaches the relic, gathers the collection into orbit (one snap per object, with a product panel), passes through
the active object into the moonlit chamber of collections. With reduced motion the scene is still and scrubs
without inertia. Photographs load behind their own Suspense boundaries so the relic appears immediately, and
rendering pauses once the stage leaves the screen.

Below it, the homepage reuses the photographic halls (without their entrance hall) and adds About ANTIQUORA.

### The photographic halls (`/exhibition`)

The exhibition (`apps/web/src/exhibition/`) presents real listing photographs as objects in a lit museum,
with no WebGL. The CC0 photographs were shot on neutral studio backdrops; rather than cutting objects out,
each backdrop becomes the interior of a display case (`Vitrine.tsx`), and realism comes from what surrounds it:
top-down warm light falloff, faint glass reflections, bronze trim, stone or wood plinths, contact shadows and a
blurred floor reflection. Walls and floors are CSS gradients + SVG noise (`.museum-wall`, `.museum-floor`).

| Hall | What happens |
| --- | --- |
| I · Entrance hall (`HeroHall.tsx`) | One focal case (Marble Head of Herakles) with its museum label, two supporting cases out of focus, ceiling light beams, a foreground stanchion. Lamps warm up on arrival; scrolling dollies slowly toward the focal case and dims into the library. One CTA: *Enter the Live Library* |
| II · The Live Library (`LiveLibrary.tsx`) | A pinned, scroll-driven shelf: the featured case in front, the rest on a shallow CSS-3D ellipse with depth blur. Category tabs (Curator's selection + six fields) re-hang the shelf. Hover tilts the case with a moving glare; *Inspect* (works on touch) zooms in and shows the listing's second photograph when one exists. The museum label shows name, category, origin · period (only when the catalogue has them), description, price and stock, with View artifact, Add to bag and Wishlist. Snap per object; ← → keys; prev/next; swipe on phones |
| III · The Collections (`Collections.tsx`) | Seven lit arched niches — Ancient Civilizations (`/gallery?q=BCE`) and the six chambers — whose lamps come on in sequence |
| About ANTIQUORA | Short statement with links to `/our-story` and `/contact` |
| Other ways in | Links to `/shop`, `/gallery`, `/chambers`, `/museum` and `/` or `/exhibition` |

Motion: GSAP + ScrollTrigger (already a dependency) inside `gsap.context`, reverted on unmount. Reduced motion
renders every hall still and un-pinned with the same controls; phones get an un-pinned library with swipe.
Pinned halls sit below the sticky header (`--hdr`). Images load HD versions from `public/images/hd/` (1600px,
generated by `node scripts/fetch-hd-images.mjs` from the Met originals) and fall back to the regular product
photo, then to a "Photograph unavailable" state.

## Interactive layer

Effects live in `apps/web/src/components/fx` and are decorative only: content works without them, they
switch off under `prefers-reduced-motion`, and hover-driven effects are disabled on touch devices.

| Where | Interaction |
| --- | --- |
| Site-wide | Gold scroll-progress bar, cursor "gallery light", `Ctrl/⌘ K` or `/` opens search |
| Hero | Pointer-parallax 3D gallery, decoding headline label, animated counters, magnetic CTAs |
| Travel Through Time | Era dial (drag, click ticks, arrow keys/Home/End, Play/Pause) across in-stock artifacts by date |
| Categories / cards | 3D tilt with moving light glare |
| Featured | Animated category filter tabs |
| Curator's selection | Sticky, scroll-driven story stage with chapter progress |
| Heritage / Trust / Newsletter | Scroll parallax + counters, cursor-spotlight cards, rotating beam border |
| Product page | Circular museum loupe (2.6×) with a scanning catalogue frame |
| Shop | Two-thumb price slider (keyboard accessible; commits on release) |

## Security notes

Implemented: bcrypt hashing; opaque session tokens (only an HMAC hash is stored) in HTTP-only,
`SameSite=Lax`, `Secure`-in-production cookies; double-submit CSRF tokens on every state-changing
request; role checks on every `/api/admin/*` route server-side; zod validation of every input; explicit
field mapping (no mass assignment — e.g. `role` can't be set at sign-up); Prisma parameterised queries;
Helmet security headers with a CSP; rate limits on sign-in, registration and public forms; strict CORS;
generic error messages (no stack traces or SQL leak); server-side price/stock validation; order creation
in a transaction with `SELECT … FOR UPDATE` row locks; Razorpay signature verification; upload type +
magic-byte + size checks; CSV-injection-safe export; audit logging; honeypot on the contact form.

This is a demonstration project. It has automated tests but has **not** had an independent security
review or penetration test — do that before handling real customers or payments.

## Deployment

The API serves the built storefront from the same origin, so one Node service + one PostgreSQL database is enough.

**Any Node host (Render, Railway, Fly.io, a VPS):**

1. Provision PostgreSQL (Neon, Supabase, Railway, RDS…) and copy its connection string.
2. Set environment variables: `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET` (random, 32+ chars),
   `PUBLIC_SITE_URL=https://your-domain`, `CORS_ORIGINS=https://your-domain`, `PAYMENT_PROVIDER=demo`.
3. Build command: `npm ci && npm run build`
4. Start command: `npm run migrate --workspace apps/api && npm start`
5. Once, for demo content: `npm run seed --workspace apps/api -- --force` (wipes and re-seeds demo data).
6. Create the admin from a one-off shell: `npm run admin:create --workspace apps/api -- --allow-production --email you@domain --password '…'`.

**Docker:** `SESSION_SECRET=… docker compose --profile full up --build` → http://localhost:4000, then
`docker compose exec app npm run seed -- --force`.

Uploaded admin images are written to `apps/api/uploads/`; on hosts with ephemeral disks, mount a
persistent volume there (or swap in object storage).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid environment configuration` on start | Copy `.env.example` to `.env`; the message lists each missing/invalid variable. |
| `Cannot connect to PostgreSQL` | Start `npm run db:local` (or `docker compose up -d db`) and check the port in `DATABASE_URL` (5433 local, 5432 Docker). |
| `character … has no equivalent in encoding "WIN1252"` | Your local cluster was created with a non-UTF-8 encoding. Stop `db:local`, delete `.local-pg/`, start again (the script forces UTF-8). |
| `@esbuild/win32-x64 could not be found` | npm optional-dependency bug: delete `node_modules` and `package-lock.json`, run `npm install`. |
| "Your session token is missing or expired" | The CSRF cookie was cleared — refresh the page. |
| "Too many requests" during heavy local testing | Start the API with `DISABLE_RATE_LIMIT=1` (development only). |
| Port 5173/4000 already in use | Stop the other process, or set `API_PORT` / Vite `--port`. |
| E2E admin tests skipped | Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then `npm run admin:create`. |
| Images missing | Product images are local in `apps/web/public/images/products`; a placeholder is shown if one fails. Re-fetch with `node scripts/fetch-images.mjs`. |

## Image credits

All product photographs: The Metropolitan Museum of Art, Open Access, public domain (CC0). Each
product page links to the source catalogue record. Full list: `apps/api/prisma/image-manifest.json`.
