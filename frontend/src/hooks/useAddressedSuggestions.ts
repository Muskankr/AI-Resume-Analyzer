import { useState, useEffect } from "react";

export function useAddressedSuggestions(activeFileName: string, suggestionsCount: number) {
  const [addressedSuggestions, setAddressedSuggestions] = useState<number[]>([]);

  // Persistent localStorage key scoped to current session/file
  const storageKey = `addressed_suggestions_${activeFileName || "default"}`;

  // Load addressed suggestions from localStorage when current resume changes
  useEffect(() => {
    if (activeFileName || suggestionsCount > 0) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setAddressedSuggestions(JSON.parse(saved));
        } else {
          setAddressedSuggestions([]);
        }
      } catch {
        setAddressedSuggestions([]);
      }
    }
  }, [activeFileName, storageKey, suggestionsCount]);

  // Sync state changes to localStorage
  const toggleSuggestion = (index: number) => {
    setAddressedSuggestions((prev) => {
      const updated = prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist addressed suggestions to localStorage", e);
      }
      return updated;
    });
  };

  return { addressedSuggestions, setAddressedSuggestions, toggleSuggestion };
}