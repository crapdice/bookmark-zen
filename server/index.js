const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const axios = require('axios');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');

// Use Stealth Plugin
chromium.use(stealth());

const app = express();
const PORT = process.env.PORT || 3001;

// ... (existing middleware and routes)

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
