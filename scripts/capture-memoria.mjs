/**
 * capture-memoria.mjs — Captura automática de pantallas para la memoria del TFG (cap. 9).
 *
 * Genera los PNG esperados por `memoriaTFG/Plantilla TfG/Capitulos/cap09.tex`
 * en `memoriaTFG/Plantilla TfG/diagramas/capturas/`:
 *   - mobile-*.png : app Expo Web con viewport móvil (390×844 @2x)
 *   - web-*.png    : app Expo Web con viewport escritorio (1440×900)
 *   - pyme-*.png   : portal business (Vite) escritorio (1440×900)
 *
 * Requisitos previos (ver scripts/CAPTURAS.md):
 *   1. Backend en Docker:        make dev  (+ make migrate-docker + make seed-docker)
 *   2. Datos demo:               docker compose -f docker-compose.dev.yml exec -T backend \
 *                                  python manage.py shell < scripts/capture_setup.py
 *   3. App Expo Web:             cd frontend && npx expo start --web          (puerto 8081)
 *   4. Portal PYME:              cd frontend/web && npm run dev               (puerto 5173)
 *
 * Uso:    node scripts/capture-memoria.mjs [--only=mobile|web|pyme] [--shot=nombre]
 * Vars:   API_URL, EXPO_URL, PYME_URL para sobrescribir los puertos por defecto.
 */

import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const OUT_DIR = path.join(rootDir, 'memoriaTFG', 'Plantilla TfG', 'diagramas', 'capturas');
const TICKET_IMG = path.join(__dirname, 'assets', 'ticket-demo.png');

const API_URL = process.env.API_URL ?? 'http://localhost:8000/api/v1';
const EXPO_URL = process.env.EXPO_URL ?? 'http://localhost:8081';
const PYME_URL = process.env.PYME_URL ?? 'http://localhost:5173';

const DEMO = { email: 'demo@bargain.local', password: 'Demo1234!' };
const PYME = { email: 'fruteria@bargain.local', password: 'Demo1234!' };
const ADMIN = { email: 'bargain_admin@bargain.local', password: 'Demo1234!' };

const SEVILLA = { latitude: 37.3891, longitude: -5.9845 };

const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const shotRaw = process.argv.find((a) => a.startsWith('--shot='))?.split('=')[1];
const shotSet = shotRaw ? new Set(shotRaw.split(',')) : null;

const results = { ok: [], failed: [] };

// ---------------------------------------------------------------- helpers --

function log(msg) {
  console.log(`  ${msg}`);
}

async function api(pathName, { method = 'GET', token, body, timeoutMs = 60000 } = {}) {
  const res = await fetch(`${API_URL}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* respuestas sin cuerpo */
  }
  return { status: res.status, json };
}

/** El backend envuelve respuestas en {success, data}; DRF pagina en {results}. */
function unwrap(json) {
  const data = json?.data ?? json;
  return data?.results ?? data;
}

const tokenCache = new Map();
let loginField = null; // 'username-email' | 'username-local' | 'email' — se fija al primer éxito

async function apiLogin(email, password) {
  if (tokenCache.has(email)) return tokenCache.get(email);
  const local = email.split('@')[0];
  const byKey = {
    'username-email': { username: email, password },
    'username-local': { username: local, password },
    email: { email, password },
  };
  const order = loginField
    ? [loginField, ...Object.keys(byKey).filter((k) => k !== loginField)]
    : ['username-email', 'username-local', 'email'];
  let last = null;
  for (const key of order) {
    const { status, json } = await api('/auth/token/', { method: 'POST', body: byKey[key] });
    last = { status, json };
    if (status === 200) {
      loginField = key;
      const data = json?.data ?? json;
      const tokens = { access: data.access, refresh: data.refresh };
      tokenCache.set(email, tokens);
      return tokens;
    }
    if (status === 429) break; // no insistir si está throttled
  }
  throw new Error(
    `Login API falló para ${email} (HTTP ${last.status}): ${JSON.stringify(last.json)}`,
  );
}

async function settle(page, extraMs = 1500) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(extraMs);
}

async function freezeUI(page) {
  await page
    .addStyleTag({
      content:
        '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    })
    .catch(() => {});
}

async function cleanGoogleMaps(page) {
  // Cierra el diálogo "can't load Google Maps correctly" y quita marcas de agua dev
  await page.waitForTimeout(2000);
  await page
    .evaluate(() => {
      document.querySelectorAll('button').forEach((b) => {
        if (/^ok$/i.test((b.textContent || '').trim())) b.click();
      });
      document.querySelectorAll('div, span').forEach((d) => {
        const t = (d.textContent || '').trim();
        if (t === 'For development purposes only' && d.childElementCount <= 1) d.remove();
      });
      document.querySelectorAll('div[role="dialog"]').forEach((d) => {
        if (/google maps/i.test(d.textContent || '')) d.remove();
      });
    })
    .catch(() => {});
}

async function shoot(page, name, { extraMs = 1500 } = {}) {
  if (shotSet && !shotSet.has(name)) return;
  try {
    await settle(page, extraMs);
    if (/mapa|tienda-perfil/.test(name)) await cleanGoogleMaps(page);
    await freezeUI(page);
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
    results.ok.push(name);
    log(`✔ ${name}.png`);
  } catch (err) {
    results.failed.push(name);
    log(`✖ ${name}.png — ${err.message.split('\n')[0]}`);
  }
}

/** Contexto con sesión inyectada (la app lee access/refresh de localStorage en web). */
async function authedContext(browser, opts, tokens) {
  const ctx = await browser.newContext({
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    geolocation: SEVILLA,
    permissions: ['geolocation'],
    ...opts,
  });
  if (tokens) {
    await ctx.addInitScript(([a, r]) => {
      window.localStorage.setItem('access_token', a);
      window.localStorage.setItem('refresh_token', r);
    }, [tokens.access, tokens.refresh]);
  }
  return ctx;
}

async function gotoApp(page, urlPath, { firstLoad = false } = {}) {
  await page.goto(`${EXPO_URL}${urlPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: firstLoad ? 300000 : 90000,
  });
  if (firstLoad) {
    // El primer bundle de Metro puede tardar varios minutos
    await page
      .waitForFunction(() => (document.body?.innerText ?? '').trim().length > 20, {
        timeout: 300000,
      })
      .catch(() => {});
  }
  // Fallback SPA: si el dev server no hace history-fallback del deep link
  // (p. ej. "Cannot GET /app/home"), cargar la raíz y navegar vía History API.
  const broken = await page
    .evaluate(() => {
      const t = (document.body?.innerText ?? '').trim();
      return t.length < 20 || /cannot get|not found/i.test(t.slice(0, 200));
    })
    .catch(() => false);
  if (broken && urlPath !== '/') {
    await page.goto(EXPO_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page
      .waitForFunction(() => (document.body?.innerText ?? '').trim().length > 20, {
        timeout: 120000,
      })
      .catch(() => {});
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }, urlPath);
    await page.waitForTimeout(1200);
  }
}

async function fillByOrder(page, values) {
  const inputs = page.locator('input:visible, textarea:visible');
  const count = await inputs.count();
  for (let i = 0; i < Math.min(values.length, count); i++) {
    try {
      await inputs.nth(i).fill(values[i], { timeout: 4000 });
    } catch {
      /* campo no editable: continuar */
    }
  }
}

// ----------------------------------------------------------- estado previo --

async function prepareConsumerState() {
  log('Preparando estado del consumidor vía API...');
  const tokens = await apiLogin(DEMO.email, DEMO.password);

  const listsRes = await api('/lists/', { token: tokens.access });
  let lists = unwrap(listsRes.json) ?? [];
  if (!Array.isArray(lists)) lists = [];
  let lista =
    lists.find((l) => l.name === 'Lista de la semana') ?? lists[0] ?? null;
  if (!lista) {
    log(
      `GET /lists/ HTTP ${listsRes.status}: ${JSON.stringify(listsRes.json)?.slice(0, 400)}`,
    );
    log('Sin listas visibles: creando lista demo vía API...');
    const created = await api('/lists/', {
      method: 'POST',
      token: tokens.access,
      body: { name: 'Lista de la semana' },
    });
    const cl = created.json?.data ?? created.json;
    if (!cl?.id) {
      throw new Error(
        `No pude crear lista demo (HTTP ${created.status}): ${JSON.stringify(created.json)?.slice(0, 400)}`,
      );
    }
    const ITEMS = [
      ['Leche entera 1L', 2],
      ['Pan de barra', 1],
      ['Huevos L docena', 1],
      ['Arroz redondo 1kg', 1],
      ['Aceite de oliva virgen extra 1L', 1],
      ['Manzanas Fuji 1kg', 2],
    ];
    for (const [name, quantity] of ITEMS) {
      await api(`/lists/${cl.id}/items/`, {
        method: 'POST',
        token: tokens.access,
        body: { name, quantity },
      });
    }
    lista = cl;
  }

  // Optimización previa para que la pantalla "Ruta" tenga una ruta persistida
  try {
    const opt = await api('/optimize/', {
      method: 'POST',
      token: tokens.access,
      timeoutMs: 180000,
      body: {
        shopping_list_id: lista.id,
        lat: SEVILLA.latitude,
        lng: SEVILLA.longitude,
        max_distance_km: 10,
      },
    });
    if (![200, 202].includes(opt.status)) {
      log(
        `⚠ Optimización previa HTTP ${opt.status}: ${JSON.stringify(opt.json)?.slice(0, 300)} — la captura de ruta puede salir vacía`,
      );
    } else {
      log('Ruta optimizada persistida ✔');
    }
  } catch (err) {
    log(`⚠ Optimización previa falló (${err.message}) — la captura de ruta puede salir vacía`);
  }

  let product = null;
  let store = null;
  try {
    const products = unwrap(
      (await api('/products/?q=leche%20entera', { token: tokens.access })).json,
    );
    if (Array.isArray(products)) {
      product = products.find((pr) => /leche entera/i.test(pr.name)) ?? products[0];
    }
  } catch (err) {
    log(`⚠ No pude obtener producto demo: ${err.message}`);
  }
  try {
    const stores = unwrap((await api('/stores/?favorites=true', { token: tokens.access })).json);
    store = Array.isArray(stores) ? stores[0] : null;
  } catch (err) {
    log(`⚠ No pude obtener tienda demo: ${err.message}`);
  }

  return { tokens, lista, product, store };
}

// --------------------------------------------------------------- consumer ---

const CONSUMER_SCREENS = (st) => [
  { name: 'home', url: '/app/home' },
  { name: 'catalogo', url: '/app/home/catalog' },
  {
    name: 'comparativa',
    url: st.product
      ? `/app/home/compare?productId=${st.product.id}&productName=${encodeURIComponent(st.product.name)}`
      : null,
  },
  { name: 'listas', url: '/app/lists' },
  {
    name: 'lista-detalle',
    url: `/app/lists/${st.lista.id}?listName=${encodeURIComponent(st.lista.name)}`,
  },
  { name: 'plantillas', url: '/app/lists/templates' },
  {
    name: 'ruta',
    url: `/app/lists/route?listId=${st.lista.id}&listName=${encodeURIComponent(st.lista.name)}`,
    extraMs: 3500,
  },
  { name: 'mapa', url: '/app/map', extraMs: 5000 },
  {
    name: 'tienda-perfil',
    url: st.store ? `/app/map/store/${st.store.id}` : null,
  },
  { name: 'favoritas', url: '/app/map/favorites' },
  { name: 'notificaciones', url: '/app/home/notifications' },
  { name: 'alertas', url: '/app/home/alerts' },
];

const MOBILE_ONLY_SCREENS = [
  { name: 'proponer', url: '/app/home/propose' },
  { name: 'perfil', url: '/app/profile' },
  { name: 'config-optimizador', url: '/app/profile/optimizer' },
  { name: 'editar-perfil', url: '/app/profile/edit' },
  { name: 'cambiar-password', url: '/app/profile/password' },
];

/** mapeo nombre genérico → nombre de fichero según prefijo */
const FILE_NAME = {
  mobile: { comparativa: 'mobile-detalle-precio' },
  web: {},
};

async function captureAssistant(page, prefix) {
  try {
    const input = page.locator('input:visible, textarea:visible').last();
    await input.fill('¿Dónde está más barata la leche entera?', { timeout: 8000 });
    const sendBtn = page.getByRole('button', { name: /enviar|send/i }).first();
    const clicked = await sendBtn
      .click({ timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) await input.press('Enter');
    // Esperar respuesta del asistente (Gemini) hasta 45 s
    await page
      .waitForFunction(
        () => /tienda|precio|€|lo siento|leche/i.test(document.body.innerText.slice(-1200)),
        { timeout: 45000 },
      )
      .catch(() => {});
  } catch {
    log('⚠ No pude interactuar con el asistente; capturo el estado actual');
  }
  await shoot(page, `${prefix}-asistente`, { extraMs: 1200 });
}

async function captureOCR(page, prefix) {
  await gotoApp(page, '/app/lists/ocr');
  if (prefix === 'mobile') {
    await shoot(page, 'mobile-ocr-captura');
  } else {
    await shoot(page, 'web-ocr');
    return;
  }
  // Revisión: subir ticket desde "galería" y esperar al paso 2.
  // En Expo Web el envío multipart del fichero no funciona (FormData con {uri}
  // es semántica nativa), así que interceptamos /ocr/scan/ y devolvemos los
  // ítems reconocidos del ticket demo para renderizar la UI real de revisión.
  try {
    if (!existsSync(TICKET_IMG)) throw new Error(`falta ${TICKET_IMG}`);
    await page.route('**/ocr/scan/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { raw_text: 'LECHE ENTERA 1L', matched_product_id: 1, matched_product_name: 'Leche entera 1L', confidence: 0.96, quantity: 2 },
              { raw_text: 'PAN DE BARRA', matched_product_id: 2, matched_product_name: 'Pan de barra', confidence: 0.91, quantity: 1 },
              { raw_text: 'HUEVOS L DOCENA', matched_product_id: 3, matched_product_name: 'Huevos L docena', confidence: 0.88, quantity: 1 },
              { raw_text: 'ARROZ REDONDO 1KG', matched_product_id: 4, matched_product_name: 'Arroz redondo 1kg', confidence: 0.72, quantity: 1 },
              { raw_text: 'ACEITE OLIVA V.E. 1L', matched_product_id: 5, matched_product_name: 'Aceite de oliva virgen extra 1L', confidence: 0.64, quantity: 1 },
              { raw_text: 'MANZANAS FUJI 1KG', matched_product_id: 6, matched_product_name: 'Manzanas Fuji 1kg', confidence: 0.45, quantity: 2 },
              { raw_text: 'CAFE MOLIDO 250G', matched_product_id: null, matched_product_name: null, confidence: 0.38, quantity: 1 },
            ],
          },
        }),
      });
    });
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 });
    await page
      .getByLabel(/galer/i)
      .first()
      .click({ timeout: 8000 })
      .catch(async () => {
        await page.getByText(/escanear lista/i).last().click({ timeout: 5000 });
      });
    const chooser = await fileChooserPromise;
    await chooser.setFiles(TICKET_IMG);
    // Esperar a que termine "Procesando imagen..." y aparezca la revisión
    // (footer "N seleccionados") o el estado vacío.
    const reached = await page
      .waitForFunction(
        () =>
          /seleccionados|no encontramos productos/i.test(document.body.innerText) &&
          !/procesando imagen/i.test(document.body.innerText),
        { timeout: 120000 },
      )
      .then(() => true)
      .catch(() => false);
    if (!reached) {
      const tail = await page
        .evaluate(() => document.body.innerText.slice(-400))
        .catch(() => '(sin texto)');
      log(`⚠ OCR no llegó al paso de revisión. Texto actual: ${tail.replace(/\s+/g, ' ')}`);
    }
    await shoot(page, 'mobile-ocr-revision', { extraMs: 1500 });
  } catch (err) {
    results.failed.push('mobile-ocr-revision');
    log(`✖ mobile-ocr-revision — ${err.message.split('\n')[0]}`);
  }
}

async function captureConsumer(browser, st, prefix) {
  const viewport =
    prefix === 'mobile'
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

  console.log(`\n— Capturas ${prefix.toUpperCase()} (app de usuario) —`);

  // Pantallas sin sesión: login y registro (solo móvil)
  if (prefix === 'mobile') {
    const anon = await authedContext(browser, viewport, null);
    const page = await anon.newPage();
    await gotoApp(page, '/login', { firstLoad: true });
    await fillByOrder(page, [DEMO.email, DEMO.password]);
    await shoot(page, 'mobile-login');
    await gotoApp(page, '/register');
    await fillByOrder(page, ['Nico', 'Parrilla', 'nico@example.com', 'Demo1234!', 'Demo1234!']);
    await shoot(page, 'mobile-registro');
    await anon.close();
  }

  const ctx = await authedContext(browser, viewport, st.tokens);
  const page = await ctx.newPage();
  await gotoApp(page, '/app/home', { firstLoad: prefix !== 'mobile' });

  for (const screen of CONSUMER_SCREENS(st)) {
    if (!screen.url) {
      results.failed.push(`${prefix}-${screen.name}`);
      log(`✖ ${prefix}-${screen.name} — sin datos para construir la URL`);
      continue;
    }
    const fileName = FILE_NAME[prefix]?.[screen.name] ?? `${prefix}-${screen.name}`;
    if (shotSet && !shotSet.has(fileName)) continue;
    await gotoApp(page, screen.url);
    if (screen.name === 'comparativa') {
      await page
        .getByText(/activar ubicaci/i)
        .first()
        .click({ timeout: 4000 })
        .catch(() => {});
      await page.waitForTimeout(2500);
    }
    await shoot(page, fileName, { extraMs: screen.extraMs ?? 1500 });
  }

  if (prefix === 'mobile') {
    for (const screen of MOBILE_ONLY_SCREENS) {
      if (shotSet && !shotSet.has(`mobile-${screen.name}`)) continue;
      await gotoApp(page, screen.url);
      await shoot(page, `mobile-${screen.name}`);
    }
  }

  await gotoApp(page, '/app/assistant');
  if (!shotSet || shotSet.has(`${prefix}-asistente`)) await captureAssistant(page, prefix);
  if (!shotSet || [...shotSet].some((n) => n.startsWith(prefix === 'mobile' ? 'mobile-ocr' : 'web-ocr'))) {
    await captureOCR(page, prefix);
  }

  await ctx.close();
}

// ------------------------------------------------------------------- PYME ---

async function capturePyme(browser) {
  console.log('\n— Capturas PYME (portal business) —');
  const viewport = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

  // Páginas públicas
  const anon = await authedContext(browser, viewport, null);
  let page = await anon.newPage();
  await page.goto(`${PYME_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await shoot(page, 'pyme-landing', { extraMs: 2500 });

  await page.goto(`${PYME_URL}/login`, { waitUntil: 'domcontentloaded' });
  await fillByOrder(page, [PYME.email, PYME.password]);
  await shoot(page, 'pyme-login');

  await page.goto(`${PYME_URL}/register`, { waitUntil: 'domcontentloaded' });
  await fillByOrder(page, ['Charcutería La Esquina', 'charcuteria@example.com', 'Demo1234!', 'Demo1234!']);
  await shoot(page, 'pyme-registro');
  await anon.close();

  // Onboarding: negocio recién registrado sin perfil todavía
  try {
    const email = `onboarding_${Date.now()}@capture.bargain.local`;
    await api('/auth/register/', {
      method: 'POST',
      body: {
        username: email.split('@')[0],
        email,
        password: 'Demo1234!',
        password_confirm: 'Demo1234!',
        first_name: 'Onboarding',
        last_name: 'Demo',
        role: 'business',
      },
    });
    const tokens = await apiLogin(email, 'Demo1234!');
    const ctx = await authedContext(browser, viewport, tokens);
    page = await ctx.newPage();
    await page.goto(`${PYME_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await settle(page, 1200);
    await page
      .getByRole('button', { name: /iniciar ahora|empezar onboarding|comenzar/i })
      .first()
      .click({ timeout: 4000 })
      .catch(() => {});
    await settle(page, 1200);
    await fillByOrder(page, [
      'Charcutería La Esquina',
      'B90555666',
      'Calle Sierpes 88, 41004 Sevilla',
      'https://laesquina.example.com',
    ]);
    await shoot(page, 'pyme-onboarding');
    await ctx.close();
  } catch (err) {
    results.failed.push('pyme-onboarding');
    log(`✖ pyme-onboarding — ${err.message.split('\n')[0]}`);
  }

  // Área privada de la frutería aprobada
  const tokens = await apiLogin(PYME.email, PYME.password);
  const ctx = await authedContext(browser, viewport, tokens);
  page = await ctx.newPage();
  const PRIVATE = [
    ['pyme-dashboard', '/dashboard'],
    ['pyme-productos', '/products-upload'],
    ['pyme-carga-masiva', '/products-upload'],
    ['pyme-precios', '/prices'],
    ['pyme-promociones', '/promotions'],
    ['pyme-perfil-negocio', '/profile'],
  ];
  for (const [name, route] of PRIVATE) {
    if (shotSet && !shotSet.has(name)) continue;
    await page.goto(`${PYME_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (name === 'pyme-precios') {
      // Estado "tabla editable": activar edición de la primera fila si existe
      await page
        .getByRole('button', { name: /editar/i })
        .first()
        .click({ timeout: 4000 })
        .catch(() => {});
    }
    if (name === 'pyme-carga-masiva') {
      // Mostrar la zona/diálogo de carga masiva CSV si está tras un botón
      await page
        .getByRole('button', { name: /csv|carga|importar|subir/i })
        .first()
        .click({ timeout: 4000 })
        .catch(() => {});
    }
    await shoot(page, name, { extraMs: 2000 });
  }
  await ctx.close();

  // Panel de aprobación del administrador (con la panadería pendiente)
  try {
    const adminTokens = await apiLogin(ADMIN.email, ADMIN.password);
    const adminCtx = await authedContext(browser, viewport, adminTokens);
    page = await adminCtx.newPage();
    await page.goto(`${PYME_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await shoot(page, 'pyme-admin-aprobacion', { extraMs: 2000 });
    await adminCtx.close();
  } catch (err) {
    results.failed.push('pyme-admin-aprobacion');
    log(`✖ pyme-admin-aprobacion — ${err.message.split('\n')[0]}`);
  }
}

// -------------------------------------------------------------------- main --

async function preflight() {
  const checks = [
    ['Backend API', `${API_URL}/products/`, [200, 401, 403]],
    ...(onlyArg === 'pyme' ? [] : [['Expo Web', EXPO_URL, [200]]]),
    ...(onlyArg && onlyArg !== 'pyme' ? [] : [['Portal PYME', PYME_URL, [200]]]),
  ];
  for (const [label, url, okStatuses] of checks) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!okStatuses.includes(res.status)) throw new Error(`HTTP ${res.status}`);
      log(`✔ ${label} accesible (${url})`);
    } catch (err) {
      console.error(`\n✖ ${label} NO accesible en ${url} — ${err.message}`);
      console.error('  Revisa los pasos previos en scripts/CAPTURAS.md\n');
      process.exit(1);
    }
  }
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`Salida: ${OUT_DIR}\n`);
await preflight();

const browser = await chromium.launch();
try {
  const needConsumer = !onlyArg || onlyArg === 'mobile' || onlyArg === 'web';
  const st = needConsumer ? await prepareConsumerState() : null;

  if (!onlyArg || onlyArg === 'mobile') await captureConsumer(browser, st, 'mobile');
  if (!onlyArg || onlyArg === 'web') await captureConsumer(browser, st, 'web');
  if (!onlyArg || onlyArg === 'pyme') await capturePyme(browser);
} finally {
  await browser.close();
}

console.log(`\n== Resumen: ${results.ok.length} capturas OK, ${results.failed.length} fallidas ==`);
if (results.failed.length > 0) {
  console.log(`Fallidas: ${results.failed.join(', ')}`);
  console.log('Puedes reintentar una sola con: node scripts/capture-memoria.mjs --shot=<nombre>');
  process.exitCode = 1;
}
