import { useState, useEffect, useRef } from 'react';

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef(null);

  useEffect(() => {
    // 1. Cross-browser runtime validation
    if (typeof window !== 'undefined' && !window.speechSynthesis) {
      setIsSupported(false);
    }

    // Cleanup speech synthesis buffers on component unmount
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text) => {
    if (!isSupported) return;

    // Reset previous narration queues
    window.speechSynthesis.cancel();

    if (!text) return;

    // 2. Initialize and configure the Web Speech Utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    // Dynamic localization matching the system's output target context
    utterance.lang = document.documentElement.lang || 'en-IN';

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const toggleSpeech = (text) => {
    if (isPlaying) {
      stop();
    } else {
      speak(text);
    }
  };

  return { isSupported, isPlaying, toggleSpeech, stop };
}
