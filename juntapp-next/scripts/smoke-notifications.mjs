import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.JUNTAPP_TEST_URL ?? 'http://localhost:3000';
const testKeys = [];
const users = [
  { email: 'directiva.demo@juntapp.cl', password: 'DirectivaDemo2026!', dirigente: true },
  { email: 'vecino.demo@juntapp.cl', password: 'VecinoDemo2026!', dirigente: false },
];
const viewports = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });

async function login(page, user) {
  await page.goto(`${baseUrl}/login`);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL('**/inicio');
  await page.getByRole('heading', { name: 'Instalación y notificaciones' }).waitFor();
}

try {
  for (const viewport of viewports) {
    for (const user of users) {
      const key = `${user.dirigente ? 'board' : 'neighbor'}-${viewport.name}-notifications-test`;
      testKeys.push(key);
      const context = await browser.newContext({ viewport });
      await context.addInitScript((storedKey) => localStorage.setItem('juntapp-device-key', storedKey), key);
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(error.message));
      await login(page, user);
      const center = page.getByRole('region', { name: 'Instalación y notificaciones' });
      await center.getByRole('heading', { name: 'Instala JuntAPP' }).waitFor();
      await center.getByRole('heading', { name: 'Activa las notificaciones' }).waitFor();
      if (user.dirigente) await center.getByText('Cobertura de avisos', { exact: true }).waitFor({ timeout: 15_000 });
      else assert.equal(await center.getByText('Cobertura de avisos', { exact: true }).count(), 0);
      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
      assert.ok(overflow <= 2, `${viewport.name}/${user.email}: desborde horizontal ${overflow}px.`);
      assert.deepEqual(errors, [], `${viewport.name}/${user.email}: errores de consola.`);
      console.log(JSON.stringify({ ui: 'OK', viewport: viewport.name, role: user.dirigente ? 'dirigente' : 'vecino', overflow }));
      await context.close();
    }
  }

  const iosKey = 'iphone-notifications-visual-test';
  testKeys.push(iosKey);
  const ios = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });
  await ios.addInitScript((storedKey) => localStorage.setItem('juntapp-device-key', storedKey), iosKey);
  const page = await ios.newPage();
  await login(page, users[1]);
  await page.getByRole('button', { name: 'Ver guía visual' }).click();
  const dialog = page.getByRole('dialog', { name: 'Lleva JuntAPP a tu iPhone' });
  await dialog.waitFor();
  assert.equal(await dialog.locator('.ios-visual-card').count(), 3);
  assert.equal(await dialog.locator('.iphone-frame').count(), 1);
  const iosOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
  assert.ok(iosOverflow <= 2, `iPhone: desborde horizontal ${iosOverflow}px.`);
  console.log(JSON.stringify({ ui: 'OK', viewport: 'iphone', visualCards: 3, overflow: iosOverflow }));
  await ios.close();
} finally {
  await browser.close();
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && testKeys.length) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    await admin.from('app_devices').delete().in('device_key', testKeys);
    await new Promise((resolve) => setTimeout(resolve, 750));
    await admin.from('app_devices').delete().in('device_key', testKeys);
  }
}
