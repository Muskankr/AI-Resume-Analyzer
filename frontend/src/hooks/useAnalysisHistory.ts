import { useState, useEffect, useCallback } from "react";

export interface AnalysisEntry {
  id: string;
  timestamp: number;
  score: number;
  skills: string[];
  suggestions: string[];
  matchedSkills: string[];
  missingSkills: string[];
  targetRole: string;
  fileName: string;
}

const STORAGE_KEY = "resume_analysis_history";

function loadHistory(): AnalysisEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveHistory(entries: AnalysisEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage may be unavailable in restricted modes
  }
}

export function useAnalysisHistory() {
  const [entries, setEntries] = useState<AnalysisEntry[]>(() => loadHistory());

  // Sync to localStorage whenever entries change
  useEffect(() => {
    saveHistory(entries);
  }, [entries]);

  const addEntry = useCallback((entry: Omit<AnalysisEntry, "id" | "timestamp">) => {
    setEntries((prev) => {
      const filteredEntries = prev.filter((e) => e.fileName !== entry.fileName);

      const updated: AnalysisEntry[] = [
        { 
          ...entry, 
          id: Date.now().toString(), 
          timestamp: Date.now() 
        }, 
        ...filteredEntries
      ];
      return updated;
    });
  }, []);

  const deleteEntry = (id: string) => {
  setEntries((prev) => prev.filter((e) => e.id !== id));
};

  const clearHistory = () => {
  setEntries([]);
};
return {
    entries,
    addEntry,
    deleteEntry,
    clearHistory,
    setEntries
  };
}