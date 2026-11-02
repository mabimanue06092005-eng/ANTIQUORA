# ANTIQUORA REST API

Base URL: `/api` (proxied by Vite in development; same origin in production).

## Conventions

- **Success:** `{ "data": … }`, plus `"meta": { page, pageSize, total, totalPages }` on paginated lists.
- **Error:** `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "field": "message" } } }`
- **Status codes:** `200` OK · `201` created · `401` not signed in · `403` forbidden / CSRF failed / disabled account ·
  `404` not found · `409` conflict (stock, duplicate, invalid transition) · `413` payload too large ·
  `422` validation error · `429` rate limited · `500` internal · `503` database unavailable.
- **Money:** integer **paise** in responses (`pricePaise`, `totalPaise`, …). Admin inputs (`price`, `compareAtPrice`, settings) are in rupees.
- **Auth:** HTTP-only `aq_session` cookie (set by login/register). Requests must use `credentials: 'include'`.
- **CSRF:** every non-GET request must send header `X-CSRF-Token` equal to the `aq_csrf` cookie
  (issued on any API request; `GET /api/csrf` returns it). Missing/wrong → `403 CSRF_FAILED`.
- **Guests:** an HTTP-only `aq_guest` cookie identifies a guest cart/wishlist; merged into the account at login/registration.
- **Limits:** list endpoints cap `pageSize` (48 catalogue / 100 admin); JSON bodies ≤ 200 KB; uploads ≤ 5 MB.
- **Rate limits:** auth 20 / 15 min, public forms 10 / 10 min, general 600 / min per IP.

## Health & SEO

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{status, database}`; `503` if the DB is unreachable |
| GET | `/api/csrf` | Returns `{ token }` and sets the CSRF cookie |
| GET | `/sitemap.xml` | Static pages, categories, published products |
| GET | `/robots.txt` | Static (served from the web build) |

## Catalogue (public)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/products` | Query: `q` (name/description/SKU/origin), `category` (comma-separated slugs), `minPrice`, `maxPrice` (₹), `sort` = `featured\|newest\|popular\|price_asc\|price_desc`, `featured`, `onSale`, `inStock` (`true`), `page`, `pageSize` |
| GET | `/api/products/curated` | `{ featured[], curatorPicks[] }` for the homepage |
| GET | `/api/products/by-ids?ids=a,b` | Cards for recently-viewed lists (max 24) |
| GET | `/api/products/:slug` | `{ product, related[] }`; `404` if unpublished/unknown |
| GET | `/api/categories` | Categories with published product counts |
| GET | `/api/store` | Public store info, shipping rule, active payment provider |

## Auth

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/api/auth/me` | — | Current user or `null` |
| POST | `/api/auth/register` | `name, email, password, confirmPassword` | Password ≥ 8 chars with a letter and a digit. Always creates a `CUSTOMER`. |
| POST | `/api/auth/login` | `email, password` | `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DISABLED` |
| POST | `/api/auth/logout` | — | Deletes the session |
| POST | `/api/auth/change-password` | `currentPassword, newPassword, confirmPassword` | Auth required; signs out other sessions |

## Account (auth required)

| Method | Path | Description |
| --- | --- | --- |
| PATCH | `/api/account/profile` | `name`, `phone` |
| GET | `/api/account/addresses` | Saved addresses |
| POST | `/api/account/addresses` | Indian address: `fullName, phone, line1, line2?, city, state, postalCode (6-digit PIN), isDefault?` (max 10) |
| PUT | `/api/account/addresses/:id` | Update |
| DELETE | `/api/account/addresses/:id` | Delete |

## Cart (guest or signed in)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/cart?delivery=standard\|express` | Items, warnings (stock adjustments), server-computed `totals` |
| POST | `/api/cart/items` | `{ productId, quantity }` — adds; `409` if exceeding stock (max 10 per line) |
| PATCH | `/api/cart/items/:itemId` | `{ quantity }` — sets (0 removes) |
| DELETE | `/api/cart/items/:itemId` | Remove a line |
| DELETE | `/api/cart` | Clear the cart |
| POST | `/api/cart/coupon` | `{ code }` — `422` with reason if invalid/expired/below minimum |
| DELETE | `/api/cart/coupon` | Remove the code |

`totals` = `{ subtotalPaise, discountPaise, shippingPaise, taxPaise, totalPaise, freeShippingApplied, couponCode, couponError }`.

## Wishlist (guest or signed in)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/wishlist` | `{ items[], productIds[] }` |
| POST | `/api/wishlist/items` | `{ productId }` — idempotent (no duplicates) |
| DELETE | `/api/wishlist/items/:productId` | Remove |
| POST | `/api/wishlist/items/:productId/move-to-cart` | Adds 1 to cart and removes from wishlist |

## Checkout & payments (auth required)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/checkout` | Body: `customer {name,email,phone}`, `address {…}`, `deliveryMethod`, `saveAddress?`, `notes?`, `expectedTotalPaise?`. In one transaction: locks product rows, re-validates stock & prices, recomputes totals, reserves stock, snapshots items, creates order `PENDING_PAYMENT` + payment `CREATED`. Returns `{ order, payment }` (`payment.keyId`/`providerOrderId` for Razorpay). `409` if stock or price changed. |
| POST | `/api/checkout/payments/:paymentId/demo` | `{ outcome: "success" \| "failure" }` — DEMO gateway only. Success → `CONFIRMED`; failure → `PAYMENT_FAILED` + stock released. |
| POST | `/api/checkout/payments/:paymentId/razorpay/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` — HMAC verified server-side |
| POST | `/api/checkout/payments/:paymentId/cancel` | Abandon payment; releases stock |

Unpaid orders are automatically cancelled (stock released) after 30 minutes.

## Orders (auth required, own orders only)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/orders?page=` | Order summaries |
| GET | `/api/orders/:orderNumber` | Full order: items (snapshots), totals, address, payments, status events, `canCancel` |
| POST | `/api/orders/:orderNumber/cancel` | Allowed while `PENDING_PAYMENT` or `CONFIRMED`; restores stock; paid demo orders get a DEMO refund record |

**Lifecycle:** `PENDING_PAYMENT → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, with terminal
`CANCELLED` and `PAYMENT_FAILED`. Admins may cancel up to `PROCESSING`.

## Forms (public, rate-limited)

| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/newsletter` | `{ email, source? }` → `subscribed` (201) or `already_subscribed` (200) |
| POST | `/api/contact` | `{ name, email, subject, message (≥ 20 chars) }` (+ honeypot `website`) |

## Admin (role `ADMIN` required — `401`/`403` otherwise)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | Totals, revenue (paid statuses), pending count, low stock, recent orders, 30-day daily series, revenue by category |
| GET | `/api/admin/products` | Query: `q`, `status` (`ALL\|DRAFT\|PUBLISHED\|ARCHIVED`), `category` (id), `lowStock`, paging |
| GET | `/api/admin/products/:id` | Full product |
| POST | `/api/admin/products` | `name, sku, slug?, shortDescription, description, categoryId, price, compareAtPrice?, stock, status, isFeatured, isCuratorPick, materials?, dimensions?, period?, origin?, provenance?, provenanceType, condition?, imageCredit?, images[{url,alt}]` |
| PUT | `/api/admin/products/:id` | Same body (replaces images) |
| PATCH | `/api/admin/products/:id/status` | `{ status }` — publish / unpublish (draft) / archive |
| DELETE | `/api/admin/products/:id` | Only if never ordered (`409` otherwise — archive instead) |
| POST | `/api/admin/uploads` | `multipart/form-data` field `image` (JPEG/PNG/WebP ≤ 5 MB, magic bytes checked) → `{ url }` |
| GET/POST | `/api/admin/categories` | List / create `{ name, slug?, description?, imageUrl?, sortOrder }` |
| PUT/DELETE | `/api/admin/categories/:id` | Update / delete (refused while products are assigned) |
| GET | `/api/admin/orders` | Query: `q` (number/name/email), `status`, paging |
| GET | `/api/admin/orders/:id` | Order + customer + payments + events + `allowedTransitions`, `canCancel` |
| PATCH | `/api/admin/orders/:id/status` | `{ status, note? }` — only permitted transitions (`409` otherwise) |
| GET | `/api/admin/customers` | Query: `q`, paging |
| GET | `/api/admin/customers/:id` | Profile, addresses, order history, account audit trail |
| PATCH | `/api/admin/customers/:id/status` | `{ disabled, reason }` — reason required when disabling; signs the user out |
| GET/POST | `/api/admin/coupons` | List / create `{ code, description, type PERCENT\|FIXED, value, minSubtotal, maxDiscount?, isActive, expiresAt?, usageLimit? }` |
| PUT/DELETE | `/api/admin/coupons/:id` | Update / delete |
| GET | `/api/admin/newsletter` | Subscribers (search, paging) |
| PATCH | `/api/admin/newsletter/:id` | `{ isActive }` |
| GET | `/api/admin/newsletter.csv` | CSV export of active subscribers |
| GET | `/api/admin/contact` | Contact submissions |
| PATCH | `/api/admin/contact/:id` | `{ isRead }` |
| GET/PUT | `/api/admin/settings` | `{ store {…}, shipping { standard, express, freeShippingThreshold, standardDays, expressDays, taxRatePercent } }` |
| GET | `/api/admin/audit-log` | Paged audit entries |

Every admin mutation writes an `AuditLog` row (actor, action, entity, details).
