# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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
### Changed
- Compressed static raster images and added WebP optimized assets reducing total image bundle size from ~1.15 MB to ~956 KB (16.8% reduction) with no visible quality loss (#353).
- Improved onboarding experience and user interface consistency.
- Enhanced visual styling across the application.
- Updated landing page layout and overall user experience.
- Refined resume analysis workflow.
- Improved frontend performance and usability.

### Fixed
- Audited and standardized loading indicators across async operations (upload/analysis, auth modal, history pagination) with spin icon indicators and double-submit button protection (#358).
- Fixed widespread low-opacity/faded text across stats, How It Works cards, upload zone, and footer (#242).
- Minor UI and styling fixes across multiple frontend components.
- Improved responsiveness and consistency across the application.
- Various bug fixes related to resume analysis and UI rendering.