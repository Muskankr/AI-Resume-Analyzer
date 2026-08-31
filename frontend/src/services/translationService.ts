/**
 * Frontend API client handling translation requests and caching translated states.
 */
import { api } from '../api/client';

export interface LanguageDetectionResult {
    language_code: string;
    language_name: string;
    confidence: number;
    method_used: string;
    is_english: boolean;
}

export interface TranslationResult {
    original_text: string;
    translated_text: string;
    source_language: string;
    target_language: string;
    success: boolean;
    error_message?: string;
}

/**
 * Detects the language of the provided text.
 */
export const detectLanguage = async (text: string): Promise<LanguageDetectionResult> => {
    // Check cache first to avoid redundant API calls for the same text
    const cacheKey = `lang_detect_${btoa(text.substring(0, 100))}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    const response = await api.post<LanguageDetectionResult>('/api/analyzer/detect-language/', { text });

    // Cache the result for the session
    sessionStorage.setItem(cacheKey, JSON.stringify(response.data));
    return response.data;
};

/**
 * Translates the provided text to the target language (default: English).
 */
export const translateText = async (
    text: string,
    sourceLanguage: string = 'auto',
    targetLanguage: string = 'en'
): Promise<TranslationResult> => {
    const cacheKey = `translate_${btoa(text.substring(0, 100))}_${sourceLanguage}_${targetLanguage}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    const response = await api.post<TranslationResult>('/api/analyzer/translate/', {
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
    });

    if (response.data.success) {
        sessionStorage.setItem(cacheKey, JSON.stringify(response.data));
    }

    return response.data;
};

/**
 * Clears the translation and language detection cache.
 */
export const clearTranslationCache = () => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
        if (key.startsWith('lang_detect_') || key.startsWith('translate_')) {
            sessionStorage.removeItem(key);
        }
    });
};
