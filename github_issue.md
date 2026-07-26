# GitHub Issue Draft

**Repository**: `Muskankr/AI-Resume-Analyzer`

---

## Title
`feat/style: UI/UX Overhaul: Fix light theme visibility, resolve top-right overlaps, and elevate aesthetics`

---

## Description

### Context & Problem
While exploring the AI Resume Analyzer, I identified several UI/UX limitations, contrast bugs, and structural alignment issues that degrade the user experience (especially when toggling between themes and accessing on different display sizes):

1.  **Light Mode Visibility Bugs**: Several elements (such as inactive buttons, the sample resume trigger, text fields, and textareas) are styled with hardcoded white values or high-transparency overlays. In light theme, this results in invisible text on white backgrounds.
2.  **Layout Overlap Conflict**: The floating action buttons (FABs) for History and Notifications are positioned fixed at `top: 20px` in the top-right corner. This directly overlaps the Navbar actions cluster (specifically the theme toggle and "Login / Sign Up" buttons), making them difficult to view and click.
3.  **Lack of Layout Symmetry**: Once the resume analysis score renders, the main layout stretches to 100% viewport width without a max-width limit, causing a distorted structure on ultra-wide screens.
4.  **Aesthetic Polish**: The home page lacks visual depth (flat slate backgrounds) and interactive micro-animations on form inputs and informational step cards.

---

### Proposed Resolution

To resolve these issues and make the interface feel modern, production-level, and highly interactive, I suggest the following changes:

#### 1. Theme & Contrast Fixes
- Abstract all hardcoded white transparency variables into theme tokens (`--input-bg`, `--input-border`, `--btn-secondary-bg`, `--text-muted`, etc.) that automatically invert with light/dark themes.
- Apply high-contrast label colorings (`var(--card-text)`) to form headers.

#### 2. Overlap Fix & Integration
- Remove the fixed page-level floating buttons entirely.
- Integrate clean, interactive icon triggers for **History** and **Notifications** directly inside the sticky Navbar actions cluster next to the theme toggle.
- Add an unread count badge overlay to the notifications icon.
- Place a neat close button (`X`) directly inside the sidebar drawer's tab header to dismiss it.

#### 3. Sticky Header Scroll Interaction
- Implement a scroll hook on the Navbar header to transition it into a thinned, glassmorphic container with background blurs and shadows when scrolled down.

#### 4. Layout Dimensions & Symmetry
- Wrap the main workspace components in a `.app-container` class to enforce a premium `1200px` max-width limit on large desktop displays.

#### 5. Aesthetic Upgrades (SaaS Aesthetic)
- Introduce a modern grid overlay and radial glow background lighting effects.
- Elevate the file upload drop zone to dynamically show document info, checkmarks, and file sizes.
- Restructure the "How It Works" step-cards to support hover translations and micro-animations.

---

### Test Suite Status
We will update and run the test suite to ensure that these changes are fully compatible:
- Move triggers tests to `Navbar.test.tsx`.
- Update `HistorySidebar.test.tsx` to verify close triggers and tab selections.
