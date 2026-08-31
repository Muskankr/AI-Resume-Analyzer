/**
 * Font utilities for dyslexia-friendly font support
 */

// Font families
export const FONTS = {
  standard: {
    name: 'Standard',
    family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    category: 'standard'
  },
  opendyslexic: {
    name: 'OpenDyslexic',
    family: '"OpenDyslexic", "OpenDyslexic3", "OpenDyslexic Mono", "OpenDyslexic Rounded", sans-serif',
    category: 'dyslexia'
  },
  atkinson: {
    name: 'Atkinson Hyperlegible',
    family: '"Atkinson Hyperlegible", "Atkinson Hyperlegible Bold", "Atkinson Hyperlegible Italic", sans-serif',
    category: 'dyslexia'
  },
  comic_sans: {
    name: 'Comic Sans MS',
    family: '"Comic Sans MS", "Comic Sans", cursive',
    category: 'dyslexia'
  },
  lexend: {
    name: 'Lexend',
    family: '"Lexend", "Lexend Deca", "Lexend Exa", "Lexend Giga", "Lexend Mega", sans-serif',
    category: 'dyslexia'
  },
  dyslexie: {
    name: 'Dyslexie',
    family: '"Dyslexie", "Dyslexie Regular", "Dyslexie Bold", sans-serif',
    category: 'dyslexia'
  }
};

// Font categories
export const FONT_CATEGORIES = {
  standard: {
    label: 'Standard',
    description: 'Default system fonts',
    icon: '📝'
  },
  dyslexia: {
    label: 'Dyslexia-Friendly',
    description: 'Fonts designed for readers with dyslexia',
    icon: '♿'
  }
};

// Default font
export const DEFAULT_FONT = 'standard';

// Storage key for persistence
export const FONT_STORAGE_KEY = 'ecobuddy-font-preference';

// Google Font URLs for loading
export const GOOGLE_FONT_URLS = {
  opendyslexic: 'https://fonts.googleapis.com/css2?family=OpenDyslexic:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  atkinson: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  lexend: 'https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap'
};

// Font-specific CSS overrides
export const FONT_OVERRIDES = {
  opendyslexic: {
    letterSpacing: '0.05em',
    lineHeight: '1.6',
    fontWeight: '400'
  },
  atkinson: {
    letterSpacing: '0.02em',
    lineHeight: '1.5',
    fontWeight: '400'
  },
  comic_sans: {
    letterSpacing: '0.03em',
    lineHeight: '1.5',
    fontWeight: '400'
  },
  lexend: {
    letterSpacing: '0.04em',
    lineHeight: '1.6',
    fontWeight: '400'
  }
};

// Get font by key
export const getFont = (key) => {
  return FONTS[key] || FONTS[DEFAULT_FONT];
};

// Get all dyslexia-friendly fonts
export const getDyslexiaFonts = () => {
  return Object.keys(FONTS)
    .filter(key => FONTS[key].category === 'dyslexia')
    .map(key => FONTS[key]);
};

// Get standard fonts
export const getStandardFonts = () => {
  return Object.keys(FONTS)
    .filter(key => FONTS[key].category === 'standard')
    .map(key => FONTS[key]);
};

// Load Google Font
export const loadGoogleFont = (fontKey) => {
  const url = GOOGLE_FONT_URLS[fontKey];
  if (!url) return;

  // Check if already loaded
  const linkId = `google-font-${fontKey}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = url;
  link.media = 'all';
  document.head.appendChild(link);
};

// Apply font to document
export const applyFont = (fontKey) => {
  const font = getFont(fontKey);
  const overrides = FONT_OVERRIDES[fontKey] || {};

  // Load Google Font if needed
  if (GOOGLE_FONT_URLS[fontKey]) {
    loadGoogleFont(fontKey);
  }

  // Apply to root
  const root = document.documentElement;
  root.style.setProperty('--font-family', font.family);
  root.style.setProperty('--font-family-body', font.family);

  // Apply overrides
  Object.entries(overrides).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });

  // Add data attribute for CSS targeting
  document.documentElement.setAttribute('data-font', fontKey);
  document.documentElement.setAttribute('data-dyslexia-font', font.category === 'dyslexia');

  // Store preference
  localStorage.setItem(FONT_STORAGE_KEY, fontKey);
};

// Get saved font preference
export const getSavedFont = () => {
  const saved = localStorage.getItem(FONT_STORAGE_KEY);
  if (saved && FONTS[saved]) {
    return saved;
  }
  return DEFAULT_FONT;
};

// Initialize font on load
export const initFont = () => {
  const saved = getSavedFont();
  applyFont(saved);
  return saved;
};