// backend/scripts/generate-sitemap.js
// Node script: run with `node generate-sitemap.js`
// Requires node v14+ and axios installed: npm i axios

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FRONTEND_PUBLIC_PATH = path.resolve(__dirname, '../../frontend/public'); // adjust if needed
const OUTPUT_FILE = path.join(FRONTEND_PUBLIC_PATH, 'sitemap.xml');
const BASE_URL = process.env.SITE_BASE_URL || 'https://www.yourdomain.com';
const PRODUCTS_API = process.env.PRODUCTS_API || 'http://localhost:4000/api/products?fields=slug,updatedAt&limit=10000';

async function fetchProducts() {
  const resp = await axios.get(PRODUCTS_API);
  // adapt to your API shape. Expect an array: [{ slug, updatedAt }, ...]
  return resp.data;
}

function buildUrlEntry(loc, lastmod, changefreq = 'weekly', priority = '0.8') {
  let entry = `  <url>\n    <loc>${loc}</loc>\n`;
  if (lastmod) entry += `    <lastmod>${new Date(lastmod).toISOString().slice(0,10)}</lastmod>\n`;
  entry += `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  return entry;
}

async function main() {
  try {
    const items = await fetchProducts();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add home and main pages
    xml += buildUrlEntry(`${BASE_URL}/`, null, 'daily', '1.0');
    xml += buildUrlEntry(`${BASE_URL}/shop`, null, 'daily', '0.9');
    xml += buildUrlEntry(`${BASE_URL}/privacy-policy`, null, 'monthly', '0.5');
    xml += buildUrlEntry(`${BASE_URL}/terms`, null, 'yearly', '0.4');

    // Product entries
    if (Array.isArray(items)) {
      for (const p of items) {
        const slug = p.slug || p._id;
        const lastmod = p.updatedAt || p.modifiedAt || null;
        xml += buildUrlEntry(`${BASE_URL}/product/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.8');
      }
    } else {
      console.warn('Products API did not return array. Returned:', typeof items);
    }

    xml += '</urlset>\n';

    // Ensure folder exists
    fs.mkdirSync(FRONTEND_PUBLIC_PATH, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
    console.log('Sitemap written to', OUTPUT_FILE);
  } catch (err) {
    console.error('Failed to generate sitemap:', err.message || err);
    process.exit(1);
  }
}

main();
