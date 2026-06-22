const express = require('express');
const puppeteer = require('puppeteer');
const hbs = require('hbs');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Disable caching for development to ensure changes are reflected immediately
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'templates'));

// --- Live Reload Session Tracking ---
const serverStartTime = Date.now().toString();

// Endpoint for browsers to detect server restarts
app.get('/dev-status', (req, res) => {
    res.json({ serverStartTime });
});

// --- Profile Management ---

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = path.join(__dirname, 'generated_resumes');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Save a profile
app.post('/save-profile', (req, res) => {
    const { profileName, data } = req.body;
    if (!profileName) {
        console.error('⚠️ Save profile failed: Profile name is missing');
        return res.status(400).json({ error: 'Profile name is required' });
    }
    
    const safeName = profileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(DATA_DIR, `${safeName}.json`);
    
    console.log(`💾 Saving profile "${profileName}" to: ${filePath}`);
    try {
        fs.writeFileSync(filePath, JSON.stringify({ profileName, data }, null, 2));
        console.log(`✅ Profile "${profileName}" successfully saved!`);
        res.json({ success: true, filename: `${safeName}.json` });
    } catch (err) {
        console.error('❌ Error saving profile to file system:', err);
        res.status(500).json({ error: 'Failed to save profile', message: err.message });
    }
});

// Load a profile
app.get('/load-profile/:name', (req, res) => {
    const name = req.params.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Profile not found' });
    
    const content = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(content));
});

// List all profiles
app.get('/list-profiles', (req, res) => {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const profiles = files.map(f => {
        const content = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
        return { id: f.replace('.json', ''), name: content.profileName };
    });
    res.json(profiles);
});

// --- Preview Generation ---
app.post('/preview', (req, res) => {
    try {
        const data = req.body;
        
        // --- Template Compilation or Raw HTML ---
        let html;
        if (data.rawHtml) {
            html = data.rawHtml;
            console.log("✅ Using pre-calculated Live Preview HTML");
        } else {
            const templatePath = path.join(__dirname, 'templates', 'resume.hbs');
            const templateSrc = fs.readFileSync(templatePath, 'utf8');
            const template = hbs.handlebars.compile(templateSrc);
            html = template(data);
            console.log("⚙️ Compiled template from scratch");
        }
        
        res.send(html);
    } catch (error) {
        console.error('❌ Error rendering preview:', error);
        res.status(500).json({ error: 'Failed to render preview', message: error.message });
    }
});

// --- PDF Generation ---
app.post('/generate-pdf', async (req, res) => {
    try {
        const data = req.body;
        console.log(`🚀 Generating PDF for: ${data.name || 'Unknown'}`);

        // Try to find the system Chrome/Edge if the downloaded one is problematic on Windows
        const executablePath = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ].find(fs.existsSync);

        // Render the Handlebars template to HTML string
        let html;
        if (data.rawHtml) {
            html = data.rawHtml;
            console.log("✅ Using pre-calculated Live Preview HTML for PDF");
        } else {
            const templatePath = path.join(__dirname, 'templates', 'resume.hbs');
            const templateSrc = fs.readFileSync(templatePath, 'utf8');
            const template = hbs.handlebars.compile(templateSrc);
            html = template(data);
        }

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: executablePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });

        const page = await browser.newPage();
        
        // Increase timeout for slow networks
        page.setDefaultNavigationTimeout(60000); 
        
        // Use a high device scale factor for crisp text/rendering
        await page.setViewport({ width: 794, height: 1122, deviceScaleFactor: 2 });
        
        // Set the rendered HTML
        await page.setContent(html, { waitUntil: 'domcontentloaded' });

        // Ensure fonts are loaded (more robust than networkidle)
        try {
            await page.waitForFunction('document.fonts.status === "loaded"', { timeout: 10000 });
            // Wait an extra frame to guarantee any font-ready listeners (like autoFit) have fully executed and reflowed the layout
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50))));
        } catch (e) {
            console.log('⚠️ Font loading timed out, proceeding with system fonts...');
        }

        // Generate PDF
        const pdfBuffer = await page.pdf({
            preferCSSPageSize: true,
            printBackground: true
        });

        await browser.close();

        console.log(`📏 Generated PDF Buffer Length: ${pdfBuffer.length} bytes`);
        
        if (pdfBuffer.length === 0) {
            throw new Error('Generated PDF is empty (0 bytes)');
        }

        // Save to backend as requested
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = (data.name || 'Resume').replace(/[^a-z0-9]/gi, '_');
        const filename = `${safeName}_${timestamp}.pdf`;
        const filePath = path.join(__dirname, 'generated_resumes', filename);
        
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`💾 Saved PDF to backend: ${filePath}`);

        // Return filename in JSON response to avoid browser/IDM hijack
        res.json({ success: true, filename: filename });
        
        console.log(`✅ PDF successfully generated and saved for ${data.name}`);
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF', message: error.message });
    }
});

// Download endpoint to handle GET requests for generated PDFs
app.get('/download-pdf/:filename', (req, res) => {
    const filename = req.params.filename.replace(/[^a-z0-9_\.-]/gi, '');
    const filePath = path.join(__dirname, 'generated_resumes', filename);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Download failed: File not found at ${filePath}`);
        return res.status(404).send('PDF file not found');
    }
    console.log(`⬇️ Serving PDF download: ${filename}`);
    res.download(filePath, filename);
});

app.listen(port, () => {
    console.log(`\n✨ Resume Assist Builder running at http://localhost:${port}`);
    console.log(`📂 Edit public/index.html for the UI and templates/resume.hbs for the design.\n`);
});
