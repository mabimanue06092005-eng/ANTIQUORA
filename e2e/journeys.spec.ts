import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Collector123';
const uniqueEmail = (p: string) => `${p}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;

async function register(page: Page, email = uniqueEmail('e2e')) {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Asha Collector');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);
  return email;
}

/** Adds an in-stock artifact with 2+ units to the bag from its product page. */
async function addInStockToBag(page: Page, slug = 'severan-denarius') {
  await page.goto(`/artifact/${slug}`);
  await page.getByRole('main').getByRole('button', { name: 'Add to bag', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Shopping bag' })).toBeVisible();
}

async function checkoutToPayment(page: Page) {
  await page.goto('/checkout');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button', { name: 'Continue to shipping' }).click();
  await page.getByLabel('Address line 1').fill('12 MG Road');
  await page.getByLabel('City').fill('Pune');
  await page.getByLabel('State').selectOption('Maharashtra');
  await page.getByLabel('PIN code').fill('411001');
  await page.getByRole('button', { name: 'Continue to delivery' }).click();
  await page.getByRole('button', { name: 'Review order' }).click();
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.getByText('ANTIQUORA Demo Gateway')).toBeVisible();
}

test('1 · visitor enters the museum and browses the chambers', async ({ page }) => {
  await page.goto('/museum');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Living');
  await expect(page.getByText('Discover rare finds. Every object tells a story.')).toBeVisible();
  const navigator = page.getByRole('navigation', { name: "Collector's chambers" });
  await navigator.getByRole('link', { name: /Numismatic Vault/ }).click();
  await expect(page).toHaveURL(/\/chambers\/ancient-coins/);
  await expect(page.getByRole('heading', { level: 1, name: 'The Numismatic Vault' })).toBeVisible();
  await expect(page.locator('section[aria-label$="exhibits"] li')).toHaveCount(5);
  // Move between chambers with the visual navigator, open an exhibit, and come back.
  await page.getByRole('navigation', { name: "Collector's chambers" }).getByRole('link', { name: /Scriptorium/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'The Scriptorium' })).toBeVisible();
  await page.locator('section[aria-label$="exhibits"] li a').first().click();
  await expect(page).toHaveURL(/\/artifact\//);
  await page.getByRole('link', { name: /Back to The Scriptorium/ }).click();
  await expect(page).toHaveURL(/\/chambers\/manuscripts-prints/);
});

test('2 · visitor searches for a specific artifact', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search the collection' }).first().click();
  await page.getByLabel(/Search artifacts/).fill('astrolabe');
  const result = page.getByRole('dialog', { name: 'Search the collection' }).getByRole('link', { name: /Persian Planispheric Astrolabe/ });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Persian Planispheric Astrolabe');
});

test('3 · visitor filters by category and price, then clears filters', async ({ page }) => {
  await page.goto('/shop');
  await page.getByRole('checkbox', { name: 'Pottery & Ceramics' }).click();
  await expect(page.getByRole('checkbox', { name: 'Pottery & Ceramics' })).toBeChecked();
  await page.getByLabel('Maximum price in rupees').fill('100000');
  await page.getByRole('button', { name: 'Apply price' }).click();
  await expect(page).toHaveURL(/category=pottery-ceramics/);
  await expect(page).toHaveURL(/maxPrice=100000/);
  await expect(page.getByRole('status').filter({ hasText: 'artifacts' })).toContainText('3 artifacts');
  await expect(page.getByRole('list', { name: 'Active filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all' }).first().click();
  await expect(page).toHaveURL(/\/shop$/);
});

test('4+5 · product detail, add to bag and change quantity', async ({ page }) => {
  await page.goto('/artifact/agate-snuff-bottle');
  await expect(page.getByText(/SKU\s*AQ-DC-002/)).toBeVisible();
  await page.getByRole('tab', { name: 'Provenance' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('No documented provenance');
  await page.getByRole('main').getByRole('button', { name: 'Add to bag', exact: true }).first().click();
  await page.getByRole('link', { name: 'View bag' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole('main').getByRole('button', { name: 'Increase quantity' }).click();
  await expect(page.getByRole('main').getByText('₹49,000').first()).toBeVisible();
  await page.getByLabel('Discount code').fill('WELCOME10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('WELCOME10 applied')).toBeVisible();
});

test('6 · visitor registers, logs out and logs back in', async ({ page }) => {
  const email = await register(page);
  await page.getByRole('navigation', { name: 'Account' }).getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('WrongPass1');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(PASSWORD);
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Hello, Asha/ })).toBeVisible();
});

test('7 · customer adds an item to the wishlist', async ({ page }) => {
  await register(page);
  await page.goto('/artifact/korean-porcelain-jar');
  await page.getByRole('button', { name: /Add Korean Porcelain Jar with Lid to wishlist/ }).click();
  await expect(page.getByRole('link', { name: 'Wishlist, 1 item' })).toBeVisible();
  await page.goto('/account/wishlist');
  await expect(page.getByRole('link', { name: 'Korean Porcelain Jar with Lid', exact: true })).toBeVisible();
});

test('8+10 · customer completes a simulated successful checkout and sees order history', async ({ page }) => {
  await register(page);
  await addInStockToBag(page);
  await checkoutToPayment(page);
  await page.getByRole('button', { name: 'Simulate successful payment' }).click();
  await expect(page.getByRole('heading', { name: 'Your order is confirmed' })).toBeVisible();
  await expect(page.getByText('simulated DEMO payment')).toBeVisible();
  const orderNumber = (await page.locator('strong.tabular-nums').first().textContent())!.trim();
  await page.goto('/account/orders');
  await expect(page.getByText(orderNumber)).toBeVisible();
  await page.getByText(orderNumber).click();
  await expect(page.getByText('Confirmed').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Shopping bag, 0 items' }).or(page.getByRole('button', { name: 'Shopping bag, 0 items' }))).toBeVisible();
});

test('9 · a failed demo payment does not create a paid order', async ({ page }) => {
  await register(page);
  await addInStockToBag(page);
  await checkoutToPayment(page);
  await page.getByRole('button', { name: 'Simulate failed payment' }).click();
  await expect(page.getByText('Payment failed')).toBeVisible();
  await page.goto('/account/orders');
  await expect(page.getByText('Payment failed').first()).toBeVisible();
  await expect(page.getByText('Confirmed')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Shopping bag, 1 item' })).toBeVisible();
});

test('13 · invalid inputs show understandable validation messages', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('A');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('not-an-email');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter your full name')).toBeVisible();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Please write at least 20 characters')).toBeVisible();
});

test('14 · non-admins cannot access the admin area', async ({ page, request }) => {
  const api = await request.get('/api/admin/dashboard');
  expect(api.status()).toBe(401);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
  await register(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Administrators only' })).toBeVisible();
});

test.describe('admin', () => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, 'Set ADMIN_EMAIL/ADMIN_PASSWORD in .env and run npm run admin:create');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(process.env.ADMIN_EMAIL!);
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('11 · admin creates, edits and archives a product', async ({ page }) => {
    const name = `E2E Brass Inkwell ${Date.now().toString().slice(-5)}`;
    await page.goto('/admin/products/new');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
    await page.getByLabel('SKU').fill(`AQ-E2E-${Date.now().toString().slice(-5)}`);
    await page.getByLabel('Short description').fill('A brass inkwell created by the end-to-end test.');
    await page.getByLabel('Full description').fill('This inkwell exists only to verify that administrators can create products.');
    await page.getByLabel('Status').selectOption('PUBLISHED');
    await page.getByLabel('Category').selectOption({ label: 'Decorative Collectibles' });
    await page.getByRole('textbox', { name: 'Price (₹)', exact: true }).fill('15000');
    await page.getByRole('textbox', { name: 'Stock', exact: true }).fill('2');
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page.getByText('Product created.')).toBeVisible();

    await page.getByRole('textbox', { name: 'Price (₹)', exact: true }).fill('12500');
    await page.getByLabel('Original price (₹)').fill('15000');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Product saved.')).toBeVisible();

    await page.goto(`/admin/products?q=${encodeURIComponent(name)}`);
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toContainText('₹12,500');
    await row.getByRole('button', { name: 'Archive' }).click();
    await expect(row.getByText('Archived')).toBeVisible();
  });

  test('12 · admin updates an order status', async ({ page }) => {
    await page.goto('/admin/orders?status=CONFIRMED');
    await page.getByRole('row').nth(1).getByRole('link').first().click();
    await page.getByLabel('Note (optional)').fill('Packed by E2E test');
    await page.getByRole('button', { name: 'Mark as processing' }).click();
    await expect(page.getByText('Order marked processing.')).toBeVisible();
    await expect(page.getByText('Packed by E2E test')).toBeVisible();
  });

  test('admin dashboard shows stored analytics', async ({ page }) => {
    await expect(page.getByText('Revenue · last 30 days')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Low stock/ })).toBeVisible();
  });
});

test('15 · mobile navigation and layout work @mobile', async ({ page }) => {
  await page.goto('/');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'The Gallery' }).click();
  await expect(page).toHaveURL(/\/gallery/);
  const stage = page.getByRole('group', { name: /Artifact \d+ of/ });
  const first = await stage.getAttribute('aria-label');
  await page.getByRole('button', { name: 'Next artifact' }).click();
  await expect(stage).not.toHaveAttribute('aria-label', first!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('navigation', { name: 'View mode' }).getByRole('link', { name: 'Compact' }).click();
  await expect(page).toHaveURL(/\/shop/);
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByRole('dialog', { name: 'Filters' }).getByRole('checkbox', { name: 'Vintage Furniture' }).click();
  await expect(page).toHaveURL(/category=vintage-furniture/);
});

test('interactive homepage & shop features', async ({ page }) => {
  await page.goto('/museum');
  // Time-travel dial: buttons and keyboard move through eras.
  const dial = page.getByLabel('Travel through time — choose an era');
  await dial.scrollIntoViewIfNeeded();
  const first = await dial.getAttribute('aria-valuetext');
  await page.getByRole('button', { name: 'Later object' }).click();
  await expect(dial).not.toHaveAttribute('aria-valuetext', first!);
  await dial.focus();
  await page.keyboard.press('End');
  await expect(dial).toHaveAttribute('aria-valuetext', /CE:/);
  // Ctrl+K command palette.
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search the collection' })).toBeVisible();
  await page.keyboard.press('Escape');
  // Price slider updates the URL.
  await page.goto('/shop');
  await page.getByRole('slider', { name: 'Maximum price' }).focus();
  for (let i = 0; i < 100; i++) await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/maxPrice=200000/);
});

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('living museum · enter the gallery, browse, open an artifact and return', async ({ page }) => {
  await page.goto('/museum');
  await page.getByRole('button', { name: /Enter the Collection/ }).click();
  await expect(page).toHaveURL(/\/gallery/);
  const stage = page.getByRole('group', { name: /Artifact \d+ of/ });
  await expect(stage).toBeVisible();
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(stage).toHaveAttribute('aria-label', /Artifact 3 of/);
  const name = (await stage.getAttribute('aria-label'))!.match(/: (.*)\. Use/)![1];
  // The glass information panel describes the selected artifact.
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/artifact\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  await page.getByRole('link', { name: /Back to the gallery/ }).click();
  await expect(page).toHaveURL(/\/gallery\?.*a=/);
  await expect(stage).toHaveAttribute('aria-label', new RegExp(escapeRe(name)));
});

test('living museum · glass search panel keeps filters across immersive and compact views', async ({ page }) => {
  await page.goto('/chambers/pottery-ceramics');
  await page.keyboard.press('Control+k');
  const panel = page.getByRole('dialog', { name: 'Search the collection' });
  await panel.getByRole('button', { name: 'Pottery & Ceramics' }).click();
  await panel.getByLabel('Available now').check();
  // Live preview narrows to the chosen chamber (there are 5 ceramics in the seed data).
  await expect(panel.getByText(/\d+ artifacts? match/)).toHaveText(/^[1-5] artifacts? match$/);
  await panel.getByRole('button', { name: /Explore in the gallery/ }).click();
  await expect(page).toHaveURL(/\/gallery\?.*category=pottery-ceramics.*inStock=true/);
  await page.getByRole('navigation', { name: 'View mode' }).getByRole('link', { name: 'Compact' }).click();
  await expect(page).toHaveURL(/\/shop\?.*category=pottery-ceramics.*inStock=true/);
  await expect(page.getByRole('checkbox', { name: 'Pottery & Ceramics' })).toBeChecked();
  await page.getByRole('navigation', { name: 'View mode' }).getByRole('link', { name: 'Immersive' }).click();
  await expect(page).toHaveURL(/\/gallery\?.*category=pottery-ceramics/);
  // Add to bag straight from the gallery's glass information panel.
  await page.getByRole('button', { name: 'Add to bag' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Shopping bag' })).toBeVisible();
});

test.describe('3D relic (/relic)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('orbital relic: real products in orbit, next, open artifact, chamber collections', async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.goto('/relic');
    await expect(page.getByRole('heading', { level: 1, name: 'The Orbital Relic' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(1, { timeout: 30_000 });
    const rail = page.getByRole('navigation', { name: 'Experience chapters' });
    // The orbit shows real catalogue products.
    await rail.getByRole('button', { name: 'The Orbit' }).click();
    const panel = page.locator('[data-beat="orbit"]');
    await expect(panel).toHaveCSS('opacity', '1', { timeout: 15_000 });
    const first = (await panel.locator('h3').textContent())!;
    const catalogue = await (await request.get('/api/products?pageSize=48&inStock=true')).json();
    expect(catalogue.data.map((p: { name: string }) => p.name)).toContain(first);
    await panel.getByRole('button', { name: 'Next artifact' }).click();
    await expect(panel.locator('h3')).not.toHaveText(first, { timeout: 15_000 });
    const second = (await panel.locator('h3').textContent())!;
    await panel.getByRole('link', { name: /View artifact/ }).click();
    await expect(page).toHaveURL(/\/artifact\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(second);
    // Chamber collections link to real catalogues.
    await page.goto('/relic');
    await page.getByRole('navigation', { name: 'Experience chapters' }).getByRole('button', { name: 'The Chamber' }).click();
    const station = page.locator('[data-beat="station"]');
    await expect(station).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await station.getByRole('link', { name: 'Coins & Currency' }).click();
    await expect(page).toHaveURL(/\/chambers\/ancient-coins/);
  });
});

test('reduced motion on /relic shows the still museum with an opt-in to the 3D experience', async ({ page }) => {
  await page.goto('/relic');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Open the 3D experience/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Living');
});

test.describe('homepage: orbital infinity hero', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the infinity relic is on the first screen, followed by the Live Library, collections and About', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'The Orbital Relic' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(1, { timeout: 30_000 });
    await expect(page.getByRole('navigation', { name: 'Experience chapters' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'The Live Library' })).toBeAttached();
    await expect(page.getByRole('region', { name: 'The Collections' })).toBeAttached();
    const about = page.getByRole('region', { name: 'Old things deserve new attention.' });
    await expect(about.getByRole('link', { name: /Our story/ })).toHaveAttribute('href', '/our-story');
    await expect(about.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    await expect(page.getByRole('link', { name: /The photographic hall/ })).toHaveAttribute('href', '/exhibition');
    expect(errors).toEqual([]);
  });
});

test('reduced motion: the homepage keeps the infinity relic, still', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'The Orbital Relic' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 30_000 });
});

test.describe('photographic exhibition (/exhibition)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('entrance hall, Live Library filters and actions, collections', async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.goto('/exhibition');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('beautifully preserved');
    await expect(page.locator('canvas')).toHaveCount(0); // no WebGL in the photographic hall
    // The focal case is a real listing and links to it.
    await page.getByRole('link', { name: /View the object/ }).click();
    await expect(page).toHaveURL(/\/artifact\//);
    await page.goto('/exhibition');
    await page.getByRole('button', { name: /Enter the Live Library/ }).click();
    const library = page.getByRole('region', { name: 'The Live Library' });
    const plate = library.locator('[data-plate]');
    await expect(plate.locator('h3')).toBeVisible();
    // Category navigation filters the shelf to real catalogue items.
    await library.getByRole('button', { name: /^Ancient Coins/ }).click();
    await expect(library.getByRole('button', { name: /^Ancient Coins/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(plate).toContainText('Ancient Coins');
    await expect(plate.locator('.tabular-nums')).toHaveText('01 / 05');
    const coins = await (await request.get('/api/products?category=ancient-coins&pageSize=48')).json();
    const names = coins.data.map((p: { name: string }) => p.name);
    expect(names).toContain((await plate.locator('h3').textContent())!);
    // Next object, then open it.
    const first = (await plate.locator('h3').textContent())!;
    await plate.getByRole('button', { name: 'Next object' }).click();
    await expect(plate.locator('h3')).not.toHaveText(first, { timeout: 15_000 });
    const second = (await plate.locator('h3').textContent())!;
    expect(names).toContain(second);
    await plate.getByRole('button', { name: /View artifact/ }).click();
    await expect(page).toHaveURL(/\/artifact\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(second);
    // Collections link to the right rooms.
    await page.goto('/exhibition');
    const collections = page.getByRole('region', { name: 'The Collections' });
    await collections.getByRole('link', { name: /Coins & Currency/ }).click();
    await expect(page).toHaveURL(/\/chambers\/ancient-coins/);
  });
});

test('reduced motion: the photographic exhibition is still and fully usable', async ({ page }) => {
  await page.goto('/exhibition');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('beautifully preserved');
  const library = page.getByRole('region', { name: 'The Live Library' });
  const plate = library.locator('[data-plate]');
  const first = (await plate.locator('h3').textContent())!;
  await plate.getByRole('button', { name: 'Next object' }).click();
  await expect(plate.locator('h3')).not.toHaveText(first);
  await expect(page.getByRole('link', { name: /The orbital museum/ })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: /Museum entrance/ })).toHaveAttribute('href', '/museum');
});
