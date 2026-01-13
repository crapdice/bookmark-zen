const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const db = require('../db');

// Use Stealth Plugin
chromium.use(stealth());

let metadataCache = {};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const analyzeLinks = async (urls) => {
    const results = {};
    const urlsToVisit = urls.filter(u => !metadataCache[u]);

    // Return cached immediately if no new work
    if (urlsToVisit.length === 0) {
        urls.forEach(u => { if (metadataCache[u]) results[u] = metadataCache[u]; });
        return results;
    }

    console.log(`Analyzing ${urlsToVisit.length} URLs with Playwright...`);

    let browser = null;
    try {
        // Launch with stealth plugin enabled
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Process sequentially to be gentle on resources
        for (const url of urlsToVisit) {
            // PDF Detection: Skip Playwright for PDFs
            if (url.toLowerCase().endsWith('.pdf')) {
                console.log(`Skipping Playwright for PDF: ${url}`);
                const filename = url.split('/').pop() || 'Untitled PDF';
                const meta = {
                    title: filename,
                    description: 'PDF Document',
                    keywords: 'pdf',
                    isPdf: true, // Special flag
                    status: 'alive'
                };
                metadataCache[url] = meta;
                results[url] = meta;

                // DB UPDATE
                db.query(
                    `UPDATE links SET title=$1, description=$2, media_type='pdf', metadata_json=$3 WHERE url=$4`,
                    [meta.title, meta.description, meta, url]
                ).catch(err => console.error(`DB Update PDF Error for ${url}:`, err.message));

                continue;
            }

            try {
                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    viewport: { width: 1920, height: 1080 },
                    locale: 'en-US'
                });
                const page = await context.newPage();

                // Randomized delay before request (human behavior)
                await delay(500 + Math.random() * 1000);

                console.log(`Visiting: ${url}`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

                // Extract data in page context
                const data = await page.evaluate(() => {
                    const getMeta = (name) => {
                        const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                        return el ? el.content : '';
                    };

                    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                        .map(el => el.innerText.trim())
                        .filter(t => t.length > 0)
                        .join(' ');

                    const paragraphs = Array.from(document.querySelectorAll('p'))
                        .slice(0, 5) // First 5 paragraphs
                        .map(el => el.innerText.trim())
                        .filter(t => t.length > 0)
                        .join(' ');

                    return {
                        title: document.title,
                        description: getMeta('description') || getMeta('og:description'),
                        keywords: getMeta('keywords'),
                        fullContent: (headings + ' ' + paragraphs).slice(0, 2000)
                    };
                });

                const meta = { ...data, status: 'alive' };
                metadataCache[url] = meta;
                results[url] = meta;

                // DB UPDATE
                db.query(
                    `UPDATE links SET title=$1, description=$2, keywords=$3, metadata_json=$4, last_scraped_at=NOW(), http_status=200 WHERE url=$5`,
                    [meta.title, meta.description, meta.keywords, meta, url]
                ).catch(err => console.error(`DB Update Success Error for ${url}:`, err.message));

                await context.close();

            } catch (err) {
                console.error(`Failed to analyze ${url}:`, err.message);
                const failMeta = { status: 'dead', error: err.message };
                metadataCache[url] = failMeta;
                results[url] = failMeta;

                // DB UPDATE (Dead Link)
                db.query(
                    `UPDATE links SET http_status=500, last_scraped_at=NOW() WHERE url=$1`,
                    [url]
                ).catch(err => console.error(`DB Update Fail Error for ${url}:`, err.message));
            }
        }
    } catch (err) {
        console.error("Browser launch failed:", err);
    } finally {
        if (browser) await browser.close();
    }

    // Merge cached results for URLs we didn't visit this time
    urls.forEach(u => {
        if (!results[u] && metadataCache[u]) {
            results[u] = metadataCache[u];
        }
    });

    return results;
};

module.exports = {
    analyzeLinks
};
