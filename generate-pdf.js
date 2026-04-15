const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    try {
        console.log('🚀 Starting PDF generation...');
        const browser = await puppeteer.launch({
            headless: 'new'
        });
        const page = await browser.newPage();
        
        // Get the absolute path to index.html
        const htmlPath = 'file://' + path.resolve(__dirname, 'standalone.html');
        console.log(`📄 Loading: ${htmlPath}`);
        
        await page.goto(htmlPath, {
            waitUntil: 'networkidle0'
        });

        console.log('PDF Rendering in progress...');
        await page.pdf({
            path: 'resume.pdf',
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            displayHeaderFooter: false,
            preferCSSPageSize: true
        });

        await browser.close();
        console.log('✅ Success! Your resume has been saved as resume.pdf');
    } catch (error) {
        console.error('❌ Error during PDF generation:', error);
    }
})();
