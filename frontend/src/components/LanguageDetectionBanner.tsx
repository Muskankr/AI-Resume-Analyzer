/**
 * Non-intrusive UI component that informs the user of the detected language 
 * and offers a one-click translation toggle. Supports glassmorphic UI and dark/light modes.
 */
import React, { useState, useEffect } from 'react';
import { detectLanguage, translateText, LanguageDetectionResult, TranslationResult } from '../services/translationService';

interface LanguageDetectionBannerProps {
    resumeText: string;
    onTranslatedTextChange?: (translatedText: string) => void;
    className?: string;
}

const LanguageDetectionBanner: React.FC<LanguageDetectionBannerProps> = ({
    resumeText,
    onTranslatedTextChange,
    className = ''
}) => {
    const [detection, setDetection] = useState<LanguageDetectionResult | null>(null);
    const [translation, setTranslation] = useState<TranslationResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showBanner, setShowBanner] = useState<boolean>(true);

    useEffect(() => {
        if (!resumeText || !resumeText.trim() || !showBanner) return;

        const analyzeLanguage = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await detectLanguage(resumeText);
                setDetection(result);

                // Auto-translate if not English and confidence is high enough
                if (!result.is_english && result.confidence > 0.6) {
                    handleTranslate(result.language_code);
                }
            } catch (err) {
                console.error('Language detection failed:', err);
                setError('Unable to detect language.');
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce the analysis to avoid running on every keystroke if text is bound to input
        const timeoutId = setTimeout(analyzeLanguage, 1000);
        return () => clearTimeout(timeoutId);
    }, [resumeText, showBanner]);

    const handleTranslate = async (sourceLang: string) => {
        setIsTranslating(true);
        setError(null);
        try {
            const result = await translateText(resumeText, sourceLang, 'en');
            if (result.success) {
                setTranslation(result);
                if (onTranslatedTextChange) {
                    onTranslatedTextChange(result.translated_text);
                }
            } else {
                setError(result.error_message || 'Translation failed.');
            }
        } catch (err) {
            console.error('Translation failed:', err);
            setError('An error occurred during translation.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleToggleTranslation = () => {
        if (translation && onTranslatedTextChange) {
            // Toggle between original and translated
            const isCurrentlyTranslated = onTranslatedTextChange.toString().includes(translation.translated_text.substring(0, 20)); // Heuristic check or manage state externally

            // Better approach: pass a boolean flag or let parent handle it. 
            // For this component, we will just re-emit the original text to "untoggle"
            // Note: In a real app, parent should hold the 'isTranslated' boolean state.
            // Here we simulate toggling by checking if current display matches translated.
            // Since we can't easily know parent state, we will just provide the action buttons.
        }
    };

    if (!showBanner || !resumeText || resumeText.trim().length < 50) {
        return null;
    }

    if (isLoading) {
        return (
            <div className={`alert alert-info d-flex align-items-center glassmorphic-card border-0 shadow-sm ${className}`}>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span>Analyzing resume language...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`alert alert-warning d-flex align-items-center glassmorphic-card border-0 shadow-sm ${className}`}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <span>{error}</span>
                <button
                    className="btn-close ms-auto"
                    aria-label="Close"
                    onClick={() => setShowBanner(false)}
                ></button>
            </div>
        );
    }

    if (!detection) return null;

    const isEnglish = detection.language_code === 'en' || detection.is_english;

    return (
        <div className={`alert glassmorphic-card border-0 shadow-sm d-flex align-items-start ${isEnglish ? 'bg-success bg-opacity-10 text-success' : 'bg-primary bg-opacity-10 text-primary'} ${className}`}>
            <i className={`bi bi-translate me-2 mt-1 fs-5`}></i>
            <div className="flex-grow-1">
                <h6 className="alert-heading fw-bold mb-1">
                    {isEnglish ? 'English Resume Detected' : `${detection.language_name} Resume Detected`}
                </h6>
                <p className="mb-2 small opacity-75">
                    {isEnglish
                        ? 'Your resume is in English and ready for ATS analysis.'
                        : `We detected ${detection.language_name} (${Math.round(detection.confidence * 100)}% confidence). For best ATS scoring results, we recommend analyzing the English translation.`
                    }
                </p>

                {!isEnglish && (
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleTranslate(detection.language_code)}
                            disabled={isTranslating || (translation !== null)}
                        >
                            {isTranslating ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    Translating...
                                </>
                            ) : translation ? (
                                'Translated'
                            ) : (
                                'Translate to English for Analysis'
                            )}
                        </button>

                        {translation && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                    setTranslation(null);
                                    if (onTranslatedTextChange) onTranslatedTextChange(resumeText); // Revert to original
                                }}
                            >
                                Show Original
                            </button>
                        )}
                    </div>
                )}
            </div>
            <button
                className="btn-close ms-2"
                aria-label="Dismiss language banner"
                onClick={() => setShowBanner(false)}
            ></button>
        </div>
    );
};

export default LanguageDetectionBanner;
