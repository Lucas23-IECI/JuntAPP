import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3210';
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotDirectory = process.env.AUDIT_SCREENSHOTS;
const routes = process.env.AUDIT_ROUTES?.split(',') || ['/', '/caracteristicas', '/pricing', '/faq', '/sobre-nosotros', '/contacto', '/login', '/registro'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ executablePath, headless: true });
const failures = [];
if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    const authRoute = route === '/login' || route === '/registro';
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('webpack-hmr')) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText || 'request failed';
      if (failure !== 'net::ERR_ABORTED') errors.push(`${request.url()} ${failure}`);
    });
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    let hydrationReady = authRoute;
    if (!authRoute) {
      hydrationReady = await page.waitForFunction(() => document.querySelector('[data-public-ready="true"]') !== null, undefined, { timeout: 5000 }).then(() => true).catch(() => false);
    }
    const result = await page.evaluate(() => {
      const main = document.querySelector('#mainContent, main, .auth-card');
      const rect = main?.getBoundingClientRect();
      return {
        title: document.title,
        textLength: document.body.innerText.replace(/\s+/g, ' ').trim().length,
        mainHeight: Math.round(rect?.height || 0),
        mainDisplay: main ? getComputedStyle(main).display : 'missing',
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
        mojibake: /Ã|Â|ðŸ|â€|�/.test(document.body.innerText),
        navVisible: !!document.querySelector('.landing-header, .auth-card, .plans-nav'),
        scripts: document.scripts.length,
        overflowElements: [...document.querySelectorAll('body *')]
          .map((element) => {
            const box = element.getBoundingClientRect();
            return { selector: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`, left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) };
          })
          .filter((box) => box.left < -2 || box.right > innerWidth + 2)
          .sort((a, b) => (b.right - innerWidth) - (a.right - innerWidth))
          .slice(0, 5),
      };
    });
    if (screenshotDirectory) {
      const routeName = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
      await page.screenshot({ path: `${screenshotDirectory}/${viewport.name}-${routeName}.png`, fullPage: true });
    }
    const issues = [];
    if (!hydrationReady) issues.push('hidratación pública incompleta');
    if (!authRoute && viewport.name === 'mobile') {
      await page.locator('#mobileNavToggleBtn').click();
      const mobileMenuWorks = await page.locator('#mobileNavMenu').evaluate((menu) => menu.classList.contains('open') && getComputedStyle(menu).display !== 'none');
      if (!mobileMenuWorks) issues.push('menú móvil no abre');
    }
    if (route === '/faq') {
      await page.locator('.faq-question').first().click();
      const faqWorks = await page.locator('.faq-item').first().evaluate((item) => item.classList.contains('active'));
      if (!faqWorks) issues.push('acordeón FAQ no responde');
    }
    if (!response?.ok()) issues.push(`HTTP ${response?.status()}`);
    if (result.textLength < (authRoute ? 100 : 250)) issues.push(`contenido insuficiente (${result.textLength})`);
    if (result.mainHeight < 250 || result.mainDisplay === 'none') issues.push(`contenido oculto (${result.mainHeight}px)`);
    if (result.overflow > 2) issues.push(`desborde horizontal (${result.overflow}px)`);
    if (result.mojibake) issues.push('texto con codificación dañada');
    if (!result.navVisible) issues.push('navegación ausente');
    if (errors.length) issues.push(`${errors.length} errores de consola`);
    const label = `${viewport.name.padEnd(7)} ${route.padEnd(20)}`;
    console.log(`${issues.length ? 'FAIL' : 'PASS'} ${label} ${JSON.stringify(result)}${issues.length ? ` :: ${issues.join(', ')}` : ''}`);
    if (issues.length) failures.push({ viewport: viewport.name, route, issues, errors });
    await page.close();
  }
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
