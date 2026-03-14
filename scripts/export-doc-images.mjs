import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { globSync } from 'glob';
import MarkdownIt from 'markdown-it';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const outDir = path.join(docsDir, 'assets', 'generated');
const tempDir = path.join(rootDir, '.tmp', 'docs-image-render');

mkdirSync(outDir, { recursive: true });
mkdirSync(tempDir, { recursive: true });

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
});

const markdownFiles = globSync('docs/**/*.md', {
  cwd: rootDir,
  nodir: true,
});

if (markdownFiles.length === 0) {
  console.log('No markdown files found under docs/.');
  process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 2200 },
  deviceScaleFactor: 2,
});

let totalImages = 0;

for (const relativeMdPath of markdownFiles) {
  const absMdPath = path.join(rootDir, relativeMdPath);
  const source = readFileSync(absMdPath, 'utf8');

  const htmlBody = md.render(source);

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 32px;
        color: #111827;
        background: #f8fafc;
      }

      .doc {
        max-width: 1280px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        padding: 28px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
      }

      h1, h2, h3 {
        color: #0f172a;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin: 18px 0;
        font-size: 14px;
      }

      th,
      td {
        border: 1px solid #d1d5db;
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f1f5f9;
        font-weight: 700;
      }

      code {
        font-family: "Cascadia Code", Consolas, monospace;
      }

      pre {
        background: #0b1020;
        color: #e5e7eb;
        padding: 14px;
        border-radius: 8px;
        overflow: auto;
        margin: 18px 0;
      }

      .mermaid {
        background: #ffffff;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin: 18px 0;
      }

      img {
        max-width: 100%;
      }
    </style>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
    </script>
  </head>
  <body>
    <main class="doc">${htmlBody}</main>
  </body>
</html>`;

  const htmlName = `${relativeMdPath.replace(/[\\/]/g, '__').replace(/\.md$/i, '')}.html`;
  const htmlPath = path.join(tempDir, htmlName);
  writeFileSync(htmlPath, html, 'utf8');

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const elements = await page.$$('table, pre, .mermaid');

  if (elements.length === 0) {
    continue;
  }

  const safeBase = relativeMdPath
    .replace(/^docs[\\/]/, '')
    .replace(/[\\/]/g, '__')
    .replace(/\.md$/i, '');

  let idx = 1;
  for (const element of elements) {
    const outputPath = path.join(outDir, `${safeBase}__item-${String(idx).padStart(2, '0')}.png`);
    await element.screenshot({ path: outputPath });
    idx += 1;
    totalImages += 1;
  }
}

await browser.close();

console.log(`Generated ${totalImages} images in docs/assets/generated`);
