import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), '../frontend/index.html');
const outputPath = resolve(process.cwd(), 'src/content/original-fragments.ts');
const source = readFileSync(sourcePath, 'utf8');

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function extractElement(marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`No se encontró: ${marker}`);
  const start = source.lastIndexOf('<', markerIndex);
  const opening = source.slice(start).match(/^<([a-zA-Z][\w:-]*)\b/);
  if (!opening) throw new Error(`No se pudo encontrar el tag para: ${marker}`);
  const outerTag = opening[1].toLowerCase();
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g;
  tagPattern.lastIndex = start;
  let depth = 0;
  let match;

  while ((match = tagPattern.exec(source))) {
    const fullTag = match[0];
    const tag = match[1].toLowerCase();
    if (tag !== outerTag) continue;
    const closing = fullTag.startsWith('</');
    const selfClosing = fullTag.endsWith('/>') || voidTags.has(tag);
    if (closing) depth -= 1;
    else if (!selfClosing) depth += 1;
    if (depth === 0) return source.slice(start, tagPattern.lastIndex).replaceAll('/img/logo.svg', '/logo.svg');
  }

  throw new Error(`Elemento sin cierre: ${marker}`);
}

const fragments = {
  header: extractElement('class="landing-header"'),
  mobileNav: extractElement('class="mobile-nav-menu"'),
  footer: extractElement('class="landing-footer"'),
  home: extractElement('id="corp-home"'),
  caracteristicas: extractElement('id="corp-caracteristicas"'),
  pricing: extractElement('id="corp-pricing"'),
  faq: extractElement('id="corp-faq"'),
  sobreNosotros: extractElement('id="corp-sobre-nosotros"'),
  contacto: extractElement('id="corp-contacto"'),
  sidebar: extractElement('class="app-sidebar"'),
  mobileHeader: extractElement('class="mobile-header"'),
};

mkdirSync(dirname(outputPath), { recursive: true });
const body = `// Generated mechanically from frontend/index.html. Do not hand-edit.\nexport const originalFragments = ${JSON.stringify(fragments, null, 2)} as const;\n`;
writeFileSync(outputPath, body, 'utf8');
console.log(`Generated ${outputPath}`);
