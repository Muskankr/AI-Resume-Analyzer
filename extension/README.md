# AI Resume Analyzer - Job Scraper Browser Extension

This lightweight Manifest V3 browser extension allows you to scrape job titles and description bodies directly from sites like **LinkedIn** and **Indeed** and launch the AI Resume Analyzer web application with a single click.

## Features
- **Scrape Job Postings**: Automatically extracts the job role and detailed description from supported sites.
- **Context Menu Integration**: Right-click anywhere on a job posting page and choose **"Analyze Job Posting with AI Resume Analyzer"** to launch the analysis.
- **One-Click Extension Popup**: Quick access button from your toolbar.
- **Default Resume Support**: Pre-loads your default resume from the web application's local storage automatically.

---

## Installation Instructions

1. Open your browser and go to the Extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
2. Enable **Developer mode** (typically a toggle switch in the upper-right corner).
3. Click the **Load unpacked** button in the top-left.
4. Select the `extension/` folder inside this repository root.
5. Pin the extension to your toolbar for quick access!

---

## How to Set a Default Resume in the Web App

To ensure the extension can preload a resume:
1. Open the web app (e.g. `http://localhost:5173/`).
2. Go to the **Profile** / **Settings** page (click your username in the top-right navbar).
3. Under the **Default Resume** section, upload or select your primary resume, and click **Save as Default**.
4. When launched from the extension, this resume will be pre-loaded and selected automatically!
