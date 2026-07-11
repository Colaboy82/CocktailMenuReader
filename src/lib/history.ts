import { MenuAnalysis } from "./types";

const HISTORY_KEY = "spirit-note-history";
const MAX_ENTRIES = 10;

export function saveResult(analysis: MenuAnalysis) {
  const existing = loadHistory();
  const updated = [{ ...analysis, savedAt: Date.now() }, ...existing].slice(0, MAX_ENTRIES);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function loadHistory(): (MenuAnalysis & { savedAt: number })[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}