# SKILL: Resume Builder Web Application

## Goal
Build a full-stack resume builder web app where the user fills in a form and downloads a pixel-perfect, properly formatted PDF resume — not a browser print screenshot.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js (no Python) | Avoids .venv setup; npm ecosystem has best PDF tooling |
| Backend | Express.js | Minimal, fast, easy to set up |
| Frontend | Vanilla HTML + CSS + JS (single file per page) | No build step needed, easy for vibe coding |
| PDF Engine | **Puppeteer** | Headless Chrome renders HTML/CSS to PDF — pixel-perfect, handles fonts, flexbox, everything |
| Templating | Handlebars (`hbs`) | Simple, logic-less template for resume HTML |
| Port | 3000 | Default |

> ⚠️ Do NOT use `html2canvas`, `jsPDF`, `wkhtmltopdf`, or browser `window.print()`. These all produce ugly, misaligned output. Puppeteer is the only correct choice.

---

## Project Structure

```
resume-builder/
├── server.js                  # Express server
├── package.json
├── templates/
│   └── resume.hbs             # The resume HTML template (used by Puppeteer)
├── public/
│   ├── index.html             # The form UI
│   ├── style.css              # Form styling
│   └── preview.css            # Optional: live preview styling
└── README.md
```

---

## Setup Instructions

```bash
mkdir resume-builder && cd resume-builder
npm init -y
npm install express puppeteer hbs
```

Start command: `node server.js`

---

## Server (server.js)

```js
const express = require('express');
const puppeteer = require('puppeteer');
const hbs = require('hbs');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'templates'));

// POST /generate-pdf
// Body: JSON with resume fields (see Data Model below)
app.post('/generate-pdf', async (req, res) => {
  const data = req.body;

  // Render the Handlebars template to HTML string
  const templatePath = path.join(__dirname, 'templates', 'resume.hbs');
  const templateSrc = fs.readFileSync(templatePath, 'utf8');
  const template = hbs.handlebars.compile(templateSrc);
  const html = template(data);

  // Launch Puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
    // All margins are handled INSIDE the resume CSS (give the template 25-30mm padding)
  });

  await browser.close();

  const filename = `${(data.name || 'resume').replace(/\s+/g, '_')}_Resume.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});

app.listen(3000, () => console.log('Resume builder running at http://localhost:3000'));
```

---

## Data Model (JSON sent from form to server)

```json
{
  "name": "Jane Doe",
  "title": "Senior Product Designer",
  "email": "jane@example.com",
  "phone": "+91 98765 43210",
  "location": "Hyderabad, India",
  "linkedin": "linkedin.com/in/janedoe",
  "github": "github.com/janedoe",
  "website": "janedoe.com",
  "summary": "2-3 sentence professional summary...",
  "experience": [
    {
      "company": "Acme Corp",
      "role": "Product Designer",
      "duration": "Jan 2022 – Present",
      "location": "Remote",
      "bullets": [
        "Led redesign of checkout flow, reducing drop-off by 28%",
        "Managed a team of 3 junior designers"
      ]
    }
  ],
  "education": [
    {
      "institution": "IIT Hyderabad",
      "degree": "B.Tech in Computer Science",
      "year": "2019",
      "gpa": "8.9 / 10"
    }
  ],
  "skills": {
    "categories": [
      { "label": "Languages", "items": "Python, JavaScript, SQL" },
      { "label": "Tools", "items": "Figma, Git, Docker" },
      { "label": "Frameworks", "items": "React, FastAPI, TailwindCSS" }
    ]
  },
  "certifications": [
    { "name": "AWS Solutions Architect", "issuer": "Amazon", "year": "2023" }
  ],
  "projects": [
    {
      "name": "OpenResume",
      "link": "github.com/janedoe/openresume",
      "description": "Open source resume builder used by 2,000+ people",
      "tech": "React, Node.js, Puppeteer"
    }
  ]
}
```

---

## Resume Template (templates/resume.hbs)

This is the MOST IMPORTANT file. The entire formatting quality lives here.

### Core CSS Rules for Auto-Formatting

```css
/* ─── PAGE SETUP ─────────────────────────────── */
@page { size: A4; margin: 0; }

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  --base-font: 10pt;
  --line-height: 1.45;
  --section-gap: 14px;
  
  font-size: var(--base-font);
  line-height: var(--line-height);
  color: #1a1a1a;
  background: white;
  width: 210mm;
  min-height: 297mm;
  padding: 18mm 20mm 16mm 20mm;   /* realistic resume margins */
}

/* ─── AUTO-SCALING: key trick ─────────────────── */
/*
   Puppeteer renders at exact A4. If content overflows one page,
   it spills onto page 2. To keep everything on ONE page, use the autoFit
   function which progressively shrinks font-size, line-height, and padding.
*/
#resume-root {
  width: 170mm;  /* 210mm - 40mm total horizontal padding */
}

/* ─── TYPOGRAPHY SCALE ────────────────────────── */
.name        { font-size: 22pt; font-weight: 700; letter-spacing: -0.5px; }
.job-title   { font-size: 11pt; font-weight: 400; color: #555; margin-top: 2px; }
.section-heading {
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #2563eb;             /* accent color — change freely */
  border-bottom: 1.5px solid #2563eb;
  padding-bottom: 3px;
  margin-bottom: 8px;
  margin-top: var(--section-gap);
}
.entry-title  { font-size: 10.5pt; font-weight: 600; }
.entry-sub    { font-size: 9.5pt;  font-weight: 400; color: #444; }
.entry-date   { font-size: 9pt;    font-weight: 400; color: #777; }
.bullet       { font-size: 9.5pt;  color: #222; }
.contact-item { font-size: 9pt;    color: #444; }

/* ─── LAYOUT HELPERS ─────────────────────────── */
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 5px;
}
.bullets {
  list-style: none;
  padding-left: 12px;
  margin-top: 4px;
}
.bullets li::before {
  content: '▸ ';
  color: #2563eb;
  font-size: 8pt;
}
.bullets li {
  margin-bottom: 2px;
  line-height: 1.4;
}
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 4px 16px;
}
.skill-category-label {
  font-weight: 600;
  font-size: 9pt;
  color: #333;
}
.skill-items {
  font-size: 9pt;
  color: #555;
}
.entry + .entry { margin-top: 10px; }
```

### Auto-fit Script (put at bottom of template, inside `<script>`)

This is genuinely the better approach over a raw transform: scale(). Here's why the order matters:
1. **Font size first** — it recovers the most vertical space per step. Dropping from 10pt → 9.5pt can free 10–15px across a whole page. Threshold of 8pt is the readability floor; below that it's hostile on screen and print.
2. **Line-height second** — it's invisible to the eye in small doses. Going from 1.45 → 1.2 feels like nothing but saves a surprising amount of space in a bullet-heavy section. Threshold of 1.1 because tighter than that and descenders start clipping ascenders.
3. **Padding last** — this is the most visually impactful change (sections start to feel "squeezed") so it's the last lever. 4px floor keeps the section headings from merging into the content above them.
4. **transform: scale() is the nuclear fallback** — it degrades print sharpness because it scales the raster paint, not the layout. Use it only if someone has genuinely written a novel in their resume.

```html
<script>
  function autoFit(rootEl, a4HeightPx = 1122) {
    const style = rootEl.style;

    // Read computed base values (or defaults)
    let fontSize   = parseFloat(getComputedStyle(rootEl).fontSize) || 10;   // pt → px via Puppeteer
    let lineHeight = parseFloat(getComputedStyle(rootEl).lineHeight) / fontSize || 1.45;
    let sectionGap = 14; // px — your --section-gap CSS var

    const fits = () => rootEl.scrollHeight <= a4HeightPx;

    // Pass 1: shrink font size
    while (!fits() && fontSize > 8) {
      fontSize -= 0.1;
      rootEl.style.setProperty('--base-font', `${fontSize}pt`);
    }

    // Pass 2: tighten line-height
    while (!fits() && lineHeight > 1.1) {
      lineHeight -= 0.05;
      rootEl.style.setProperty('--line-height', `${lineHeight.toFixed(2)}`);
    }

    // Pass 3: reduce section padding
    while (!fits() && sectionGap > 4) {
      sectionGap -= 1;
      rootEl.style.setProperty('--section-gap', `${sectionGap}px`);
    }

    // Nuclear fallback
    if (!fits()) {
      const scale = a4HeightPx / rootEl.scrollHeight;
      style.transform = `scale(${scale})`;
      style.transformOrigin = 'top left';
      // Shrink body height so Puppeteer doesn't add a blank page 2
      document.body.style.height = a4HeightPx + 'px';
      document.body.style.overflow = 'hidden';
    }
  }

  // Run on load
  (function() {
    autoFit(document.getElementById('resume-root'));
  })();
</script>
```

> ⚠️ This auto-scale is the "no AI formatting" magic. It handles overflow automatically. No manual tweaking needed.

### Full Template Skeleton

```hbs
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title>Resume – {{name}}</title>
<style>
  /* ... paste all CSS from above ... */
</style>
</head>
<body>
<div id="resume-root">

  <!-- ── HEADER ─────────────────────────────── -->
  <div class="header-section">
    <div class="name">{{name}}</div>
    <div class="job-title">{{title}}</div>
    <div class="contact-row">
      {{#if email}}<span class="contact-item">✉ {{email}}</span>{{/if}}
      {{#if phone}}<span class="contact-item">✆ {{phone}}</span>{{/if}}
      {{#if location}}<span class="contact-item">⌖ {{location}}</span>{{/if}}
      {{#if linkedin}}<span class="contact-item">in {{linkedin}}</span>{{/if}}
      {{#if github}}<span class="contact-item">⌥ {{github}}</span>{{/if}}
      {{#if website}}<span class="contact-item">↗ {{website}}</span>{{/if}}
    </div>
  </div>

  <!-- ── SUMMARY ────────────────────────────── -->
  {{#if summary}}
  <div class="section-heading">Summary</div>
  <p class="bullet">{{summary}}</p>
  {{/if}}

  <!-- ── EXPERIENCE ─────────────────────────── -->
  {{#if experience.length}}
  <div class="section-heading">Experience</div>
  {{#each experience}}
  <div class="entry">
    <div class="flex-between">
      <span class="entry-title">{{role}}</span>
      <span class="entry-date">{{duration}}</span>
    </div>
    <div class="flex-between">
      <span class="entry-sub">{{company}}</span>
      {{#if location}}<span class="entry-date">{{location}}</span>{{/if}}
    </div>
    {{#if bullets.length}}
    <ul class="bullets">
      {{#each bullets}}<li class="bullet">{{this}}</li>{{/each}}
    </ul>
    {{/if}}
  </div>
  {{/each}}
  {{/if}}

  <!-- ── EDUCATION ──────────────────────────── -->
  {{#if education.length}}
  <div class="section-heading">Education</div>
  {{#each education}}
  <div class="entry">
    <div class="flex-between">
      <span class="entry-title">{{institution}}</span>
      <span class="entry-date">{{year}}</span>
    </div>
    <div class="flex-between">
      <span class="entry-sub">{{degree}}</span>
      {{#if gpa}}<span class="entry-date">GPA: {{gpa}}</span>{{/if}}
    </div>
  </div>
  {{/each}}
  {{/if}}

  <!-- ── PROJECTS ───────────────────────────── -->
  {{#if projects.length}}
  <div class="section-heading">Projects</div>
  {{#each projects}}
  <div class="entry">
    <div class="flex-between">
      <span class="entry-title">{{name}}{{#if link}} — <span style="font-weight:400;font-size:9pt">{{link}}</span>{{/if}}</span>
      {{#if tech}}<span class="entry-date">{{tech}}</span>{{/if}}
    </div>
    {{#if description}}<p class="bullet" style="margin-top:3px">{{description}}</p>{{/if}}
  </div>
  {{/each}}
  {{/if}}

  <!-- ── SKILLS ─────────────────────────────── -->
  {{#if skills.categories.length}}
  <div class="section-heading">Skills</div>
  <div class="skills-grid">
    {{#each skills.categories}}
    <div>
      <span class="skill-category-label">{{label}}: </span>
      <span class="skill-items">{{items}}</span>
    </div>
    {{/each}}
  </div>
  {{/if}}

  <!-- ── CERTIFICATIONS ─────────────────────── -->
  {{#if certifications.length}}
  <div class="section-heading">Certifications</div>
  {{#each certifications}}
  <div class="entry">
    <div class="flex-between">
      <span class="entry-title">{{name}}</span>
      <span class="entry-date">{{year}}</span>
    </div>
    <span class="entry-sub">{{issuer}}</span>
  </div>
  {{/each}}
  {{/if}}

</div><!-- #resume-root -->

<script>
  function autoFit(rootEl, a4HeightPx = 1122) {
    const style = rootEl.style;
    let fontSize   = parseFloat(getComputedStyle(rootEl).fontSize) || 10;
    let lineHeight = parseFloat(getComputedStyle(rootEl).lineHeight) / fontSize || 1.45;
    let sectionGap = 14;

    const fits = () => rootEl.scrollHeight <= a4HeightPx;

    while (!fits() && fontSize > 8) {
      fontSize -= 0.1;
      rootEl.style.setProperty('--base-font', `${fontSize}pt`);
    }
    while (!fits() && lineHeight > 1.1) {
      lineHeight -= 0.05;
      rootEl.style.setProperty('--line-height', `${lineHeight.toFixed(2)}`);
    }
    while (!fits() && sectionGap > 4) {
      sectionGap -= 1;
      rootEl.style.setProperty('--section-gap', `${sectionGap}px`);
    }

    if (!fits()) {
      const scale = a4HeightPx / rootEl.scrollHeight;
      style.transform = `scale(${scale})`;
      style.transformOrigin = 'top left';
      document.body.style.height = a4HeightPx + 'px';
      document.body.style.overflow = 'hidden';
    }
  }

  (function() {
    autoFit(document.getElementById('resume-root'));
  })();
</script>
</body>
</html>
```

---

## Frontend Form (public/index.html)

### Key UX rules for the form:

1. **Sections as collapsible cards** — one card per resume section (Personal, Experience, Education, etc.)
2. **Dynamic "Add" buttons** — for experience, education, projects, skills, certifications. Each click appends a new entry block.
3. **Delete button per entry** — a small ✕ on each dynamic entry.
4. **Live character count on Summary** — warn if > 400 characters.
5. **Download button** — collects all form data, builds the JSON, POSTs to `/generate-pdf`, triggers browser download.
6. **Optional: Live preview panel** — iFrame or styled `<div>` that mirrors what the PDF will look like, updated on input change.

### Download Button Logic (JavaScript)

```js
document.getElementById('download-btn').addEventListener('click', async () => {
  // Collect form state into the JSON data model
  const data = collectFormData(); // your custom function that reads all inputs

  const btn = document.getElementById('download-btn');
  btn.textContent = 'Generating…';
  btn.disabled = true;

  try {
    const response = await fetch('/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('PDF generation failed');

    // Trigger browser download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '_')}_Resume.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error generating PDF: ' + err.message);
  } finally {
    btn.textContent = '⬇ Download PDF';
    btn.disabled = false;
  }
});
```

### LocalStorage Auto-Save

```js
// Save on every input change
document.addEventListener('input', debounce(() => {
  localStorage.setItem('resume-draft', JSON.stringify(collectFormData()));
}, 800));

// Restore on page load
window.addEventListener('load', () => {
  const saved = localStorage.getItem('resume-draft');
  if (saved) populateForm(JSON.parse(saved));
});
```

---

## Resume Design Guidelines (for the template CSS)

### Layout Principles

- **Max 1 page.** The auto-scale script enforces this.
- **No tables.** Use flexbox (`flex-between`) for date alignment — tables break at different zoom levels.
- **Consistent vertical rhythm.** Section heading top margin = 14px. Entry bottom margin = 10px. Keep these uniform.
- **Accent color.** Use exactly ONE accent color (default `#2563eb`). Apply to: section heading text, heading border-bottom, bullet arrow `▸`, and any links.
- **White space > cramming.** If content is sparse, do NOT stretch or add fake entries.

### Fonts

Puppeteer uses system fonts. Safest cross-platform stack:
```css
font-family: 'Calibri', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
```
Alternatively, load Google Fonts in the template with `waitUntil: 'networkidle0'` — Puppeteer will wait for them.

### Section Order (recommended default, user can reorder)

1. Header (name, title, contact)
2. Summary
3. Experience
4. Education
5. Projects
6. Skills
7. Certifications

---

## Optional: AI Enhancement (If User Wants It)

Only add this if the user explicitly asks. Do NOT add AI by default.

If adding AI, use a separate endpoint `/improve-bullet`:

```js
// POST /improve-bullet
// Body: { text: "worked on product" }
// Returns: { improved: "Led end-to-end redesign of checkout flow, reducing drop-off by 28%" }

app.post('/improve-bullet', async (req, res) => {
  const { text } = req.body;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Rewrite this resume bullet point to be more impactful. Use action verbs, add metrics if possible. Return ONLY the rewritten bullet, no explanation.\n\nBullet: ${text}`
      }]
    })
  });
  const data = await response.json();
  res.json({ improved: data.content[0].text.trim() });
});
```

Add a small ✨ button next to each bullet text input in the form that calls this endpoint and replaces the input value.

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---|---|
| Using `window.print()` for PDF | Use Puppeteer only |
| Puppeteer launches but PDF is blank | Add `waitUntil: 'networkidle0'` in `setContent` |
| PDF shows two pages | The auto-scale script isn't running, or `overflow: hidden` missing |
| Fonts look wrong in PDF | Use web-safe fonts or load Google Fonts and wait for network idle |
| Dates misaligned | Use `flex-between` (flex + space-between), not floats or tabs |
| Bullet points too long, overflowing | Add `word-break: break-word` on `.bullet` |
| Template not found | Confirm `app.set('views', ...)` path is correct |
| `hbs is not defined` | Use `hbs.handlebars.compile(...)`, not bare `hbs.compile(...)` |

---

## package.json

```json
{
  "name": "resume-builder",
  "version": "1.0.0",
  "description": "Resume builder with PDF export via Puppeteer",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "hbs": "^4.2.0",
    "puppeteer": "^21.0.0"
  }
}
```

---

## Checklist Before Handing to Vibe Coder

- [ ] `server.js` with Express + Puppeteer `/generate-pdf` endpoint
- [ ] `templates/resume.hbs` with full CSS + auto-scale script
- [ ] `public/index.html` with form sections, dynamic entry add/delete, download button
- [ ] LocalStorage draft save/restore
- [ ] `package.json` with all 3 dependencies
- [ ] Test: fill form → click download → opens real PDF (not a webpage)
- [ ] Test: add many bullets → PDF still fits 1 page (auto-scale working)
