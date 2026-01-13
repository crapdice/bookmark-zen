const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const axios = require('axios');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const db = require('./db'); // Database connection

// Use Stealth Plugin
chromium.use(stealth());

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb', type: 'text/html' }));

// Debug logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const path = require('path');
const CLIENT_BUILD_PATH = path.resolve(__dirname, '..', 'client', 'dist');
console.log('Static files path:', CLIENT_BUILD_PATH);

// Serve Static Frontend (Vite Build) - Try serving specific file first to test
app.use(express.static(CLIENT_BUILD_PATH));

// In-memory storage for the session (simple for now)
let globalBookmarks = [];
let metadataCache = {};

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/debug-info', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const clientBuildPath = path.join(__dirname, '../client/dist');
    const indexHtmlPath = path.join(clientBuildPath, 'index.html');

    res.json({
        cwd: process.cwd(),
        dirname: __dirname,
        clientBuildExists: fs.existsSync(clientBuildPath),
        indexHtmlExists: fs.existsSync(indexHtmlPath),
        env: {
            PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV
        }
    });
});

// NEW: Database Debug Endpoint
app.get('/debug-db', async (req, res) => {
    try {
        const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
        const hasDbUrl = !!dbUrl;
        let dbResult = null;
        let dbError = null;

        if (hasDbUrl) {
            try {
                const result = await db.query('SELECT NOW() as time');
                dbResult = result.rows[0];
            } catch (err) {
                dbError = err.message;
            }
        }

        // Return ALL keys to see if we are missing it or if it's named differently
        const envKeys = Object.keys(process.env).sort();

        res.json({
            hasDbUrl,
            envKeys, // Debugging: what do we have?
            dbUrlPreview: hasDbUrl ? dbUrl.substring(0, 15) + '...' : 'N/A',
            ssl: process.env.NODE_ENV === 'production',
            dbResult,
            dbError
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. Upload & Parse
app.post('/upload', async (req, res) => {
    try {
        const htmlContent = req.body;
        const $ = cheerio.load(htmlContent);
        const bookmarks = [];

        // Temporary: Create a default user if none exists
        // In production, this would come from Auth middleware
        // await db.query("INSERT INTO users (username) VALUES ('demo_user') ON CONFLICT DO NOTHING");
        const userId = 1; // Assuming ID 1 exists for now or we skip user linking for pure MVL (Minimum Viable Links)

        const promises = [];

        $('a').each((i, el) => {
            const $el = $(el);
            const url = $el.attr('href');
            const title = $el.text().trim() || 'Untitled';
            const addDate = $el.attr('add_date');
            const folder = $el.closest('dl').prev('dt').find('h3').text() || 'Uncategorized';

            if (url) {
                bookmarks.push({
                    id: i,
                    title,
                    url,
                    originalFolder: folder,
                    addDate
                });

                // DB SAVE: Insert Link global
                const p = (async () => {
                    try {
                        const domain = new URL(url).hostname;
                        // 1. Insert global Link
                        const linkRes = await db.query(
                            `INSERT INTO links (url, domain, created_at) 
                             VALUES ($1, $2, NOW()) 
                             ON CONFLICT (url) DO UPDATE SET url=EXCLUDED.url 
                             RETURNING id`,
                            [url, domain]
                        );
                        const linkId = linkRes.rows[0].id;

                        // 2. Insert User Bookmark
                        /*
                        await db.query(
                            `INSERT INTO user_bookmarks (user_id, link_id, original_title, original_folder, added_at)
                             VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5::double precision))
                             ON CONFLICT DO NOTHING`,
                            [userId, linkId, title, folder, addDate]
                        );
                        */
                    } catch (err) {
                        console.error("DB Insert Error for " + url, err.message);
                        // Suppress for now if DB isn't connected/setup to avoid breaking the demo
                    }
                })();
                promises.push(p);
            }
        });

        // Fire and forget DB saves for speed? Or await?
        // Let's await a bit or just let them run. For massive files, awaiting all might be slow.
        // For now, we won't block the UI response on DB writes.

        globalBookmarks = bookmarks;
        console.log(`Parsed ${bookmarks.length} bookmarks.`);
        res.json({ success: true, count: bookmarks.length, bookmarks });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to parse bookmarks' });
    }
});

// 2. Analyze (Metadata Extraction) - NOW WITH PLAYWRIGHT + STEALTH
app.post('/analyze', async (req, res) => {
    const { urls } = req.body; // Expects array of URLs
    const results = {};
    const urlsToVisit = urls.filter(u => !metadataCache[u]);

    // Return cached immediately if no new work
    if (urlsToVisit.length === 0) {
        urls.forEach(u => { if (metadataCache[u]) results[u] = metadataCache[u]; });
        return res.json(results);
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

    res.json(results);
});

// 3. Categorize
app.post('/categorize', (req, res) => {
    const { bookmarks, metadata } = req.body;

    // 1. Define Taxonomy (Category > Subcategory > Keywords)
    const taxonomy = {
        'Development': {
            keywords: ['github', 'stackoverflow', 'code', 'developer', 'programming', 'docs', 'api', 'sdk'],
            subcategories: {
                'Frontend': ['react', 'css', 'html', 'vue', 'angular', 'bootstrap', 'tailwind', 'ui', 'ux'],
                'Backend': ['node', 'express', 'django', 'flask', 'sql', 'database', 'redis', 'mongo', 'auth'],
                'DevOps': ['docker', 'kubernetes', 'aws', 'cloud', 'server', 'linux', 'bash'],
                'AI & ML': ['openai', 'gpt', 'llm', 'machine learning', 'pytorch', 'tensorflow', 'model']
            }
        },
        'Media': {
            keywords: ['video', 'music', 'streaming', 'watch', 'listen', 'player'],
            subcategories: {
                'Video': ['youtube', 'netflix', 'vimeo', 'movie', 'film'],
                'Music': ['spotify', 'soundcloud', 'apple music', 'bandcamp', 'song', 'artist'],
                'Gaming': ['twitch', 'steam', 'game', 'discord', 'play']
            }
        },
        'News & Reading': {
            keywords: ['news', 'article', 'blog', 'read', 'paper', 'journal'],
            subcategories: {
                'Tech News': ['ycombinator', 'hackernews', 'techcrunch', 'wired', 'verge'],
                'World News': ['cnn', 'bbc', 'nytimes', 'reuters', 'world'],
                'Reference': ['wikipedia', 'wiki', 'dictionary']
            }
        },
        'Social': {
            keywords: ['social', 'network', 'connect', 'community', 'profile'],
            subcategories: {
                'Networks': ['twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'bsky'],
                'Messaging': ['whatsapp', 'telegram', 'messenger', 'slack']
            }
        },
        'Shopping': {
            keywords: ['shop', 'store', 'buy', 'price', 'cart', 'sale'],
            subcategories: {
                'Marketplaces': ['amazon', 'ebay', 'aliexpress', 'etsy'],
                'Tech': ['bestbuy', 'newegg', 'apple store']
            }
        }
    };

    // Helper to create empty node
    const createNode = () => ({ items: [], children: {} });
    const root = {}; // { 'Development': Node, ... }

    // Initialize root keys
    Object.keys(taxonomy).forEach(key => root[key] = createNode());
    const unorganized = [];

    bookmarks.forEach(bm => {
        const url = bm.url;
        const meta = metadata[url] || {};

        // PDF Handling
        if (meta.isPdf) {
            if (!root['PDFs']) root['PDFs'] = createNode();
            root['PDFs'].items.push(bm);
            return; // Skip content-based categorization
        }

        const fullText = `${url} ${meta.title || bm.title} ${meta.description || ''} ${meta.keywords || ''}`.toLowerCase();

        let assigned = false;

        // Try to match Top-Level Category
        for (const [catName, catDef] of Object.entries(taxonomy)) {
            // Check if matches main category keywords (loose match) or subcategories (strong match)
            const matchesCategory = catDef.keywords.some(k => fullText.includes(k));
            let bestSubcategory = null;

            // Check subcategories for specific match
            for (const [subName, subKeywords] of Object.entries(catDef.subcategories)) {
                if (subKeywords.some(k => fullText.includes(k))) {
                    bestSubcategory = subName;
                    break;
                }
            }

            if (bestSubcategory) {
                // Assign to Subcategory
                if (!root[catName].children[bestSubcategory]) {
                    root[catName].children[bestSubcategory] = createNode();
                }
                root[catName].children[bestSubcategory].items.push(bm);
                assigned = true;
                break;
            } else if (matchesCategory) {
                // Assign to Root of Category
                root[catName].items.push(bm);
                assigned = true;
                break;
            }
        }

        if (!assigned) {
            unorganized.push(bm);
        }
    });

    // Clean up empty nodes
    const cleanTree = (nodes) => {
        const result = {};
        Object.keys(nodes).forEach(key => {
            const node = nodes[key];
            const cleanChildren = cleanTree(node.children);
            // Include if it has items OR has children
            if (node.items.length > 0 || Object.keys(cleanChildren).length > 0) {
                result[key] = { items: node.items, children: cleanChildren };
            }
        });
        return result;
    };

    // --- Dynamic Clustering Logic ---
    const generateDynamicClusters = (uncategorizedItems, metadata) => {
        if (uncategorizedItems.length < 2) return {}; // Need at least 2 items to cluster

        const stopWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'has', 'had', 'been', 'home', 'page', 'site', 'website', 'click', 'content', 'link', 'copyright', 'search', 'login', 'sign', 'privacy', 'terms', 'cookies']);

        const termCounts = {}; // { 'failed': [bmId1, bmId2], 'recipe': [bmId3, bmId4] }

        uncategorizedItems.forEach(bm => {
            const meta = metadata[bm.url] || {};

            // Fallback to bookmark title and URL tokens if analysis failed
            const title = meta.title || bm.title || '';
            const urlTokens = bm.url.split(/[\/\-\_\.]/).filter(w => w.length > 3 && !w.includes('http') && !w.includes('www')).join(' ');

            // Weight fields: Title > Keywords > Body > URL
            // We just concat nicely to get a bag of words
            const textStats = [
                title.repeat(3),
                (meta.keywords || '').repeat(2),
                (meta.description || ''),
                (meta.fullContent || ''),
                urlTokens
            ].join(' ').toLowerCase();

            // Simple tokenizer
            const tokens = textStats.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
            const uniqueTokens = new Set(tokens); // Count document frequency, not term frequency

            uniqueTokens.forEach(token => {
                if (token.length > 3 && !stopWords.has(token)) {
                    if (!termCounts[token]) termCounts[token] = [];
                    termCounts[token].push(bm);
                }
            });
        });

        // Filter for meaningful clusters
        const clusters = {};
        const MIN_CLUSTER_SIZE = 2; // At least 2 bookmarks to form a group

        // Sort terms by frequency (descending)
        const sortedTerms = Object.entries(termCounts)
            .filter(([term, items]) => items.length >= MIN_CLUSTER_SIZE)
            .sort((a, b) => b[1].length - a[1].length);

        const assignedIds = new Set();

        sortedTerms.forEach(([term, clusterItems]) => {
            // Check how many items in this potential cluster are NOT yet assigned
            const unassignedItems = clusterItems.filter(bm => !assignedIds.has(bm.id));

            // If enough unassigned items exist, form a cluster
            // (Or we could allow duplicates? For now, let's be exclusive to keep it clean)
            if (unassignedItems.length >= MIN_CLUSTER_SIZE) {
                // Capitalize term
                // Capitalize term
                const catName = term.charAt(0).toUpperCase() + term.slice(1);

                clusters[catName] = {
                    items: unassignedItems,
                    children: {}
                };

                unassignedItems.forEach(bm => assignedIds.add(bm.id));
            }
        });

        // Return clusters and the remaining unassigned items
        const remaining = uncategorizedItems.filter(bm => !assignedIds.has(bm.id));
        return { clusters, remaining };
    };

    const cleanedRoot = cleanTree(root);

    // Apply Dynamic Clustering to 'unorganized'
    if (unorganized.length > 0) {
        const { clusters, remaining } = generateDynamicClusters(unorganized, metadata);

        // Add dynamic clusters to root
        Object.assign(cleanedRoot, clusters);

        // Add truly uncategorized items
        if (remaining.length > 0) {
            cleanedRoot['Uncategorized'] = { items: remaining, children: {} };
        }
    }

    res.json({ categories: cleanedRoot });
});

// Catch-all handler for SPA (Must be after API routes)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        const indexHtml = path.join(CLIENT_BUILD_PATH, 'index.html');
        console.log('Fallback to:', indexHtml);
        res.sendFile(indexHtml, (err) => {
            if (err) {
                console.error('SendFile error:', err);
                next(err);
            }
        });
    } else {
        next();
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
