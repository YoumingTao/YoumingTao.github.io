import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['index.html', 'publications.html', 'grants-awards.html', 'service.html'];
const pages = {};

function requiredMatch(html, pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing ${label}; page content was not updated.`);
  return match[1];
}

function decodeText(text) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, key) => {
    if (key[0] !== '#') return named[key.toLowerCase()];
    return String.fromCodePoint(key[1].toLowerCase() === 'x' ?
      Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10));
  });
}

for (const filename of files) {
  const html = await readFile(path.join(root, filename), 'utf8');
  pages[filename] = {
    title: decodeText(requiredMatch(html, /<title>([\s\S]*?)<\/title>/i, 'title')),
    description: decodeText(requiredMatch(
      requiredMatch(html, /(<meta\b[^>]*\bname="description"[^>]*>)/i, 'description metadata'),
      /\bcontent="([^"]*)"/i, 'description')),
    page: requiredMatch(html, /<body\b[^>]*\bdata-page="([^"]*)"[^>]*>/i, 'page identity'),
    main: requiredMatch(html, /<main\b[^>]*\bid="main"[^>]*>([\s\S]*?)<\/main>/i, 'main content'),
    toc: requiredMatch(html, /<nav\b[^>]*\bclass="toc-links"[^>]*>([\s\S]*?)<\/nav>/i, 'page navigation'),
  };
  // The publication page reads its live HTML itself, including for file://.
  // Never duplicate paper content into the navigation bundle.
  if (filename === 'publications.html') {
    pages[filename].main = '<section class="content-section publications" id="publications" aria-labelledby="publications-heading" tabindex="-1"><h1 id="publications-heading">Publications</h1><p role="status">Loading publications…</p></section>';
    pages[filename].toc = '<a class="toc-link toc-heading" href="#publications">Publications</a>';
  }
}

await writeFile(path.join(root, 'assets/js/page-data.js'),
  '// Generated page content for navigation that preserves the current viewport.\n' +
  `window.academicPages = ${JSON.stringify(pages)};\n`, 'utf8');
process.stdout.write('Updated content for all four pages.\n');
