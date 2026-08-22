# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Structural ATS resume formatting checks analyzing document page length, standard section presence, table/column layout parsing, and typography cleanliness with actionable tips (#80).
- Granular consent toggles in Account Settings and initial banner for optional data collection (analytics and AI resume roast mode), strictly opt-in and off by default (#536).
- Auto-save Job Description text as a debounced draft in local storage to prevent accidental data loss upon page refresh or navigation (#533).
- Opt-in playful "Resume Roast" alternate feedback tone switch in suggestions section with humorously constructive feedback while remaining constructive (#497).
- Dedicated Privacy Policy page explaining data collection, immediate document deletion policy, user history control, and cookie usage, linked directly in the footer (#470).
- Terms of Service page at `/terms` covering acceptable use, account terms, data handling, IP rights, disclaimers, and liability; linked from footer (#469).
- Exportable prioritized Action Plan checklist ranked by estimated ATS score impact in clean Markdown (.md) and PDF (.pdf) formats (#379).
- Created basic SEO crawlability files `sitemap.xml` and `robots.txt` in frontend public directory for search engine indexing (#354).
- Responsive hamburger navigation menu below 1024px with slide-in animation, backdrop overlay, Escape key dismiss, and auto-close on resize (#245).
- Custom-styled career track dropdown arrow conforming to design theme (#261).
- Automatic issue keyword auto-labeler GitHub Action workflow (#210).
- Test coverage reporting for backend (coverage.py) and frontend (Vitest), initial coverage badges in README, and documented thresholds (#214).
- First-time onboarding walkthrough for new users.
- Step progress indicator during resume analysis.
- "How It Works" section to improve user guidance.
- Custom themed scrollbars for a more polished UI.
- Resume upload and ATS score analysis improvements.
- Skill matching and missing skills visualization enhancements.
- Resume history tracking improvements.
- Authentication modal enhancements.
- Resume thumbnail/file preview (name, size, type icon) shown immediately after file selection, before analysis (#140).
- Multi-resume "Download All (.ZIP)" export in Bulk JD Compare and History Sidebar; generates individual PDF and JSON reports per resume with distinguishable filenames inside a single ZIP archive (#495).
- Optional weekly resume-tips email digest: logged-in users can opt-in via an Account Settings toggle; digest includes a curated actionable tip and a personalised ATS score-improvement nudge; unsubscribe link included in every email and a dedicated `/unsubscribe` page provided (#496).
### Changed
- Improved upload screen visual hierarchy with clear step indicators, structured cards, and enhanced CTA prominence (#67).
- Password hashing now uses Argon2 as the primary hasher, with PBKDF2 retained as a fallback so existing users are transparently migrated to Argon2 on their next successful login (#478).
- Compressed static raster images and added WebP optimized assets reducing total image bundle size from ~1.15 MB to ~956 KB (16.8% reduction) with no visible quality loss (#353).
- Improved onboarding experience and user interface consistency.
- Enhanced visual styling across the application.
- Updated landing page layout and overall user experience.
- Refined resume analysis workflow.
- Improved frontend performance and usability.

### Fixed
- Fixed widespread low-opacity/faded text across stats, How It Works cards, upload zone, and footer (#242).
- Added proper HTML autocomplete attributes (`username`, `email`, `new-password`, `current-password`) to auth and account form inputs for password manager compatibility (#531).
- Minor UI and styling fixes across multiple frontend components.
- Improved responsiveness and consistency across the application.
- Various bug fixes related to resume analysis and UI rendering.