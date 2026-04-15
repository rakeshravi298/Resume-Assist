# 📄 Resume Assist: Premium ATS-Ready Builder

A modern, high-performance resume generation engine built with **Node.js**, **Puppeteer**, and **Handlebars**. Create pixel-perfect, ATS-optimized resumes in seconds using either a dynamic web interface or a standalone CLI tool.

---

## ✨ Key Features

- 💎 **Premium Design**: Modern "Noir & Slate" aesthetic optimized for readability and professionalism.
- 🚀 **Dynamic Web UI**: Real-time editor with profile persistence (save/load different resume versions).
- 📏 **Auto-Fit Engine**: Advanced algorithm that automatically adjusts fonts, margins, and line-spacing to ensure your content fits perfectly on a single A4 page.
- 🤖 **ATS-Ready**: Clean HTML/CSS structure that parses flawlessly in Applicant Tracking Systems.
- 💾 **Backend Storage**: Keeps a history of your generated resumes in the `generated_resumes/` directory.

---

## 🛠️ Getting Started

### 1. Prerequisites
Before you begin, ensure you have **Node.js** and **npm** (Node Package Manager) installed:
- **Download**: Visit [nodejs.org](https://nodejs.org/) and download the "LTS" (Recommended for most users) version.
- **Verify**: Open your terminal/command prompt and run:
  ```bash
  node -v
  npm -v
  ```

### 2. Project Setup
Clone this repository and install the project-specific dependencies:
```bash
npm install
```

### 2. Launch the Web Builder
Start the local server to access the interactive resume builder:
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

### 3. Usage Modes
| Mode | Description | How to use |
| :--- | :--- | :--- |
| **Dynamic Builder** | Interactive UI with profile saving. | Use the web UI at `localhost:3000` |
| **Standalone CLI** | Quick generation from a local file. | Edit `standalone.html` then run `npm run generate` |
| **Static Edit** | Simple browser-based printing. | Open `standalone.html` in Chrome & Print (Save as PDF) |

---

## 📂 Project Structure

- `server.js`: The heart of the application. Handles API routes, profile persistence, and PDF rendering.
- `public/`: Contains the modern Web UI.
- `templates/`: Handlebars templates for the PDF generation engine.
- `standalone.html`: A single-file, portable version of the resume.
- `data/`: JSON store for your saved resume profiles.
- `generated_resumes/`: Output directory where all your generated PDFs are archived.

---

## 🎨 Professional Customization

### Template Customization
The high-quality engine uses `templates/resume.hbs`. You can modify the CSS in the `<style>` block to change global colors like primary accents (`--accent-color`).

### Printing via Browser
If you choose to print directly from the browser (using `standalone.html`):
1. Press `Ctrl + P`.
2. Set Destination to **Save as PDF**.
3. **Crucial**: Enable **Background Graphics** in the print settings to preserve the professional styling.

---

## 🤝 Contribution
Clean code, optimized layouts, and premium aesthetics are the core of this project. Feel free to fork and enhance the design tokens!

---
> [!TIP]
> Use the **Profile Name** feature in the web UI to maintain different versions of your resume (e.g., "SoftwareEngineer_v1", "DataAnalyst_v2") and switch between them instantly.
