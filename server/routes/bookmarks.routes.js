const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');
const db = require('../db');
const { analyzeLinks } = require('../services/scraper');

// In-memory storage (simple session replacement)
let globalBookmarks = [];

// 1. Upload & Parse
router.post('/upload', async (req, res) => {
    try {
        const htmlContent = req.body;
        const $ = cheerio.load(htmlContent);
        const bookmarks = [];

        // Use logged in user OR default to 1 (Demo) but warn/handle
        const userId = req.user ? req.user.id : 1;

        // If strict auth required later:
        // if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

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
                        await db.query(
                            `INSERT INTO links (url, domain, created_at) 
                             VALUES ($1, $2, NOW()) 
                             ON CONFLICT (url) DO UPDATE SET url=EXCLUDED.url 
                             RETURNING id`,
                            [url, domain]
                        );
                        // 2. Insert User Bookmark
                        if (userId !== 1) { // Don't save for demo user automatically unless we want to
                            // For this MVP, let's allow it so the UI works even for dev
                        }

                        // We use ON CONFLICT DO NOTHING to avoid crashing on duplicates
                        await db.query(
                            `INSERT INTO user_bookmarks (user_id, link_id, original_title, original_folder, added_at)
                             VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5::double precision))
                             ON CONFLICT (user_id, link_id) DO NOTHING`,
                            [userId, linkId, title, folder, addDate]
                        );
                        promises.push(p);
                    }
        });

                globalBookmarks = bookmarks;
                console.log(`Parsed ${bookmarks.length} bookmarks.`);
                res.json({ success: true, count: bookmarks.length, bookmarks });
            } catch (error) {
                console.error('Upload error:', error);
                res.status(500).json({ error: 'Failed to parse bookmarks' });
            }
        });

        // 2. Analyze (Metadata Extraction)
        router.post('/analyze', async (req, res) => {
            const { urls } = req.body; // Expects array of URLs
            const results = await analyzeLinks(urls);
            res.json(results);
        });

        // 3. Categorize
        router.post('/categorize', (req, res) => {
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

        // 4. Get User Bookmarks (Protected)
        router.get('/bookmarks', async (req, res) => {
            try {
                if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

                const result = await db.query(
                    `SELECT ub.id, ub.original_title as title, ub.original_folder, ub.added_at, 
                    l.url, l.domain, l.metadata_json 
             FROM user_bookmarks ub 
             JOIN links l ON ub.link_id = l.id 
             WHERE ub.user_id = $1 
             ORDER BY ub.added_at DESC`,
                    [req.user.id]
                );

                // Map to frontend format
                const bookmarks = result.rows.map(row => ({
                    id: row.id,
                    title: row.title,
                    url: row.url,
                    originalFolder: row.original_folder,
                    addDate: row.added_at,
                    metadata: row.metadata_json // Pass pre-calculated metadata if available
                }));

                res.json({ bookmarks });
            } catch (err) {
                console.error('Fetch bookmarks error:', err);
                res.status(500).json({ error: 'Failed to fetch bookmarks' });
            }
        });

        module.exports = router;
