// backend/src/routes/sitemap.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // adjust to your model

router.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await Product.find({}, 'slug updatedAt').lean().exec(); // adapt query
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url>\n    <loc>https://www.yourdomain.com/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    for (const p of products) {
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0,10) : null;
      xml += `  <url>\n    <loc>https://www.yourdomain.com/product/${encodeURIComponent(p.slug)}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to build sitemap');
  }
});

module.exports = router;
