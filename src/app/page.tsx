"use client";

import { useState, useRef, type ChangeEvent, type ReactNode } from "react";
import { MenuAnalysis, type MenuItemAnalysis } from "@/lib/types";
import {
  analyzeMenuText,
  sampleMenuText,
} from "@/lib/menu-analysis";
import { saveResult, loadHistory, clearHistory } from "@/lib/history";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "scan" | "results";
type Tab = "scan" | "history";

// ─── SVG icons (no extra deps) ────────────────────────────────────────────────

function IcCamera({ cls = "w-6 h-6" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function IcUpload({ cls = "w-5 h-5" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
function IcText({ cls = "w-5 h-5" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 10H3M21 6H3M21 14H3M17 18H3" />
    </svg>
  );
}
function IcBack({ cls = "w-5 h-5" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function IcRight({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function IcX({ cls = "w-5 h-5" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function IcScan({ cls = "w-6 h-6" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M8 12h8" />
    </svg>
  );
}
function IcHistory({ cls = "w-6 h-6" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 8v4l3 3M3.05 11A9 9 0 103 13" />
      <path d="M3 6v5h5" />
    </svg>
  );
}
function IcInfo({ cls = "w-6 h-6" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
function IcSpinner({ cls = "w-10 h-10" }: { cls?: string }) {
  return (
    <svg className={`${cls} spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Drink detail bottom sheet ────────────────────────────────────────────────

function DrinkSheet({
  drink,
  onClose,
}: {
  drink: MenuItemAnalysis;
  onClose: () => void;
}) {
  const pct = Math.round(drink.confidence * 100);
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative bg-[#0f1628] rounded-t-[2.5rem] max-h-[88%] flex flex-col sheet-enter">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 p-1 text-slate-400 active:text-white transition-colors"
          aria-label="Close"
        >
          <IcX />
        </button>
        {/* Scrollable content */}
        <div className="overflow-y-auto no-scrollbar px-6 pt-2 pb-10 space-y-6">
          {/* Header */}
          <div>
            <h2
              className="text-3xl text-white leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {drink.name}
            </h2>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-widest border border-[rgba(247,178,103,0.25)] bg-[rgba(247,178,103,0.12)] text-[var(--app-accent)]">
              {drink.style}
            </span>
          </div>

          {/* Taste note */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
              Taste note
            </p>
            <p className="text-sm leading-7 text-slate-200">{drink.taste}</p>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Catalog match
              </p>
              <p className="text-xs text-slate-400">{pct}%</p>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f7b267] to-[#ffd6a5] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Similar drinks */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
              Similar drinks
            </p>
            <div className="space-y-2">
              {drink.similarDrinks.map((d: string) => (
                <div
                  key={d}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/[0.07]"
                >
                  <span className="text-[var(--app-mint)] text-base leading-none">→</span>
                  <span className="text-sm text-slate-200">{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottles */}
          {drink.bottles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
                Bottles in this drink
              </p>
              <div className="space-y-2">
                {drink.bottles.map((b: string) => (
                  <div
                    key={b}
                    className="px-4 py-3 rounded-2xl bg-white/5 border border-white/[0.07]"
                  >
                    <p className="text-sm text-slate-200">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drink card ───────────────────────────────────────────────────────────────

function DrinkCard({
  drink,
  onTap,
}: {
  drink: MenuItemAnalysis;
  onTap: (d: MenuItemAnalysis) => void;
}) {
  const pct = Math.round(drink.confidence * 100);
  const highConfidence = pct >= 90;

  return (
    <button
      onClick={() => onTap(drink)}
      className="w-full text-left px-4 py-4 rounded-3xl bg-white/[0.04] border border-white/[0.07] active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-white truncate">{drink.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{drink.style}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              highConfidence
                ? "bg-[rgba(125,211,199,0.12)] text-[var(--app-mint)]"
                : "bg-white/[0.07] text-slate-400"
            }`}
          >
            {pct}%
          </span>
          <IcRight cls="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>
      <p className="mt-2.5 text-sm leading-6 text-slate-300 line-clamp-2">
        {drink.taste}
      </p>
      {drink.similarDrinks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {drink.similarDrinks.slice(0, 2).map((d: string) => (
            <span
              key={d}
              className="text-[10px] px-2.5 py-1 rounded-full bg-black/25 border border-white/[0.07] text-slate-400"
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  analysis,
  onBack,
  onDrinkTap,
}: {
  analysis: MenuAnalysis;
  onBack: () => void;
  onDrinkTap: (d: MenuItemAnalysis) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-1 rounded-2xl text-slate-300 active:text-white active:bg-white/10 transition"
          aria-label="Back"
        >
          <IcBack />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Results
          </p>
          <p className="text-sm font-medium text-slate-200 truncate">
            {analysis.summary}
          </p>
        </div>
      </header>

      {/* Scrollable cards */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 space-y-3">
        {analysis.items.map((item) => (
          <DrinkCard key={item.name} drink={item} onTap={onDrinkTap} />
        ))}

        {/* Bottle references */}
        {analysis.bottleMentions.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 px-1 mb-3">
              Bottles referenced on this menu
            </p>
            <div className="space-y-2">
              {analysis.bottleMentions.map((bottle) => (
                <div
                  key={bottle.name}
                  className="px-4 py-3 rounded-3xl bg-white/[0.04] border border-white/[0.07]"
                >
                  <p className="text-sm font-medium text-white">{bottle.name}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-5">
                    {bottle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scan screen ──────────────────────────────────────────────────────────────

function ScanScreen({
  isAnalyzing,
  onFile,
  onSample,
  menuText,
  setMenuText,
  onAnalyze,
  error,
}: {
  isAnalyzing: boolean;
  error?: string | null;
  onFile: () => void;
  onSample: () => void;
  menuText: string;
  setMenuText: (v: string) => void;
  onAnalyze: () => void;
}) {
  const [showPaste, setShowPaste] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* App header */}
      <header className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">🍸</span>
          <span
            className="text-xl text-white tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Spirit Note
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!showPaste ? (
          /* ── Scan/upload view ─────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
            {/* Big scan button */}
            <button
              onClick={onFile}
              disabled={isAnalyzing}
              className="relative w-52 h-52 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 bg-[rgba(247,178,103,0.07)] border border-[rgba(247,178,103,0.18)] text-[var(--app-accent)] active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Scan or upload menu"
            >
              <div className="scan-corner scan-corner-tl" />
              <div className="scan-corner scan-corner-tr" />
              <div className="scan-corner scan-corner-bl" />
              <div className="scan-corner scan-corner-br" />
              {isAnalyzing ? (
                <IcSpinner cls="w-12 h-12" />
              ) : (
                <IcCamera cls="w-12 h-12" />
              )}
              <span className="text-sm font-medium">
                {isAnalyzing ? "Analyzing…" : "Scan menu"}
              </span>
            </button>

            <p className="text-sm text-center text-slate-400 max-w-[220px] leading-6">
              Point your camera at any cocktail or bar menu
            </p>

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={onFile}
                disabled={isAnalyzing}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl bg-white/[0.05] border border-white/[0.07] text-slate-300 text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                <IcUpload />
                Upload photo or PDF
              </button>
              <button
                onClick={() => setShowPaste(true)}
                disabled={isAnalyzing}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl bg-white/[0.05] border border-white/[0.07] text-slate-300 text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                <IcText />
                Paste menu text
              </button>
            </div>

            {error && (
              <p className="text-xs text-center text-red-400 px-2 leading-5">{error}</p>
            )}

            <button
              onClick={onSample}
              disabled={isAnalyzing}
              className="text-sm text-slate-500 underline underline-offset-4 active:text-slate-300 transition-colors disabled:opacity-40"
            >
              Try with a sample menu
            </button>
          </div>
        ) : (
          /* ── Paste text view ──────────────────────────────────── */
          <div className="flex-1 flex flex-col px-5 pb-4 gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300 font-medium">Paste menu text</p>
              <button
                onClick={() => setShowPaste(false)}
                className="p-1 text-slate-500 active:text-white transition-colors"
                aria-label="Close paste panel"
              >
                <IcX cls="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={menuText}
              onChange={(e) => setMenuText(e.target.value)}
              className="flex-1 w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-slate-100 outline-none resize-none no-scrollbar focus:border-[rgba(247,178,103,0.4)] transition-colors"
              placeholder="One drink per line, e.g.&#10;Paloma | mezcal, grapefruit, lime&#10;Negroni Sbagliato | Campari, vermouth, prosecco"
            />
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing || !menuText.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f7b267] to-[#ffd6a5] text-slate-950 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? "Analyzing…" : "Analyze menu →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bottom navigation ────────────────────────────────────────────────────────

function BottomNav({
  active,
  onTabChange,
}: {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: "scan", label: "Scan", icon: <IcScan /> },
    { id: "history", label: "History", icon: <IcHistory /> },
  ];

  return (
    <nav className="flex-shrink-0 border-t border-white/[0.07] safe-pb">
      <div className="flex items-center justify-around px-2 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-colors ${
              active === tab.id
                ? "text-[var(--app-accent)]"
                : "text-slate-500 active:text-slate-300"
            }`}
          >
            {tab.icon}
            <span className="text-[10px] uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>
      {/* iOS home indicator */}
      <div className="flex justify-center pt-1 pb-2">
        <div className="w-28 h-1 rounded-full bg-white/10" />
      </div>
    </nav>
  );
}

// ─── History screen placeholder ───────────────────────────────────────────────

function HistoryScreen() {
  // Step 6c — Load and display saved results from localStorage
  const history = loadHistory();

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 gap-4">
        <IcHistory cls="w-12 h-12 text-slate-600" />
        <p className="text-center text-sm text-slate-500 leading-7">
          Your recent scans will appear here.
          <br />
          Start by scanning or pasting a menu.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto no-scrollbar">
      <header className="px-6 pt-6 pb-4 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-500">History</p>
        <h2
          className="mt-2 text-3xl text-white leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recent scans
        </h2>
        <p className="mt-3 text-sm text-slate-400 leading-7">
          Up to {history.length} of 10 saved results.
        </p>
      </header>
      <div className="px-5 pb-8 space-y-3">
        {history.map((scan) => {
          const date = new Date(scan.savedAt);
          const daysAgo = Math.floor((Date.now() - scan.savedAt) / (1000 * 60 * 60 * 24));
          const dateStr = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;

          return (
            <div
              key={scan.savedAt}
              className="px-4 py-4 rounded-3xl bg-white/[0.04] border border-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Scanned {dateStr}</p>
                  <p className="text-xs text-slate-500 mt-1">{scan.items.length} drinks found</p>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                    {scan.summary}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <button
          onClick={clearHistory}
          className="w-full py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-500 text-sm active:scale-[0.98] transition-transform mt-4"
        >
          Clear history
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Home() {
  type PageState = "idle" | "uploading" | "reviewing" | "done";
  const [pageState, setPageState] = useState<PageState>("idle");
  const [ocrText, setOcrText] = useState("");
  const [screen, setScreen] = useState<Screen>("scan");
  const [activeTab, setActiveTab] = useState<Tab>("scan");
  const [menuText, setMenuText] = useState("");
  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // null = no error. A string = the last request failed and should be shown in the UI.
  // The error is cleared on the next analysis attempt.
  const [error, setError] = useState<string | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<MenuItemAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runAnalysis(text: string) {
    setIsAnalyzing(true);
    await new Promise((r) => setTimeout(r, 600));
    const result = analyzeMenuText(text);
    setAnalysis(result);
    // Step 6b — Save to localStorage after analysis completes
    saveResult(result);
    setIsAnalyzing(false);
    setScreen("results");
    setActiveTab("scan");
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear the input value so the same file can be re-selected later.
    // Without this, selecting the same file twice fires no `change` event.
    e.target.value = "";

    setError(null);        // dismiss any previous error message
    setIsAnalyzing(true);  // show the loading spinner on the scan button

    // FormData is how browsers send multipart/form-data to a server.
    // The field name "file" must match formData.get("file") in the route.
    const body = new FormData();
    body.append("file", file);

    try {
      // No Content-Type header needed — the browser sets it automatically
      // with the correct multipart boundary string.
      const res = await fetch("/api/analyze", { method: "POST", body });

      // Parse the JSON response body.
      // The type assertion tells TypeScript this can be a successful MenuAnalysis
      // or an object with an `error` string, depending on res.ok.
      const data = await res.json() as MenuAnalysis & { error?: string };

      if (!res.ok) {
        // The route returned a 4xx or 5xx status.
        // Show the human-readable error message from the JSON body.
        setError(data.error ?? "Analysis failed. Try uploading a clearer photo.");
      } else {
        // Step 5c — Show review screen if OCR text is available
        if (data.rawOcrText) {
          setOcrText(data.rawOcrText);
          setPageState("reviewing");
        } else {
          // Fallback: if no OCR text, go straight to results
          setAnalysis(data);
          // Step 6b — Save to localStorage after upload analysis completes
          saveResult(data);
          setScreen("results");
        }
      }
    } catch {
      // `catch` without a parameter is valid TypeScript 4.0+.
      // This branch only handles network failures (offline, DNS error).
      // HTTP errors (4xx, 5xx) are handled by the `!res.ok` branch above.
      setError("Network error — check your connection.");
    } finally {
      // `finally` always runs, even if catch threw.
      // Ensures the loading state is cleared whether the request succeeded or failed.
      setIsAnalyzing(false);
    }
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === "scan") setScreen("scan");
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="app-frame">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-56 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(247,178,103,0.12) 0%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      {/* Simulated status bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 pt-3 pb-0.5 relative z-10">
        <span className="text-[11px] font-medium text-slate-400">{timeStr}</span>
        {/* Notch pill */}
        <div className="w-28 h-[1.375rem] bg-[#090d1a] rounded-full" />
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400">●●●</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "history" ? (
          <HistoryScreen />
        ) : screen === "results" && analysis ? (
          <ResultsScreen
            analysis={analysis}
            onBack={() => setScreen("scan")}
            onDrinkTap={setSelectedDrink}
          />
        ) : pageState === "reviewing" ? (
          /* ── Step 5b — Review screen ────────────────────────────── */
          <div className="h-full flex flex-col px-5 pb-4 gap-3">
            <p className="text-sm text-slate-300 font-medium mt-4">Review extracted text</p>
            <p className="text-xs text-slate-500">Edit any misread words before analyzing.</p>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              className="flex-1 w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-slate-100 outline-none resize-none no-scrollbar focus:border-[rgba(247,178,103,0.4)]"
              placeholder="Raw OCR text..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPageState("idle")}
                className="flex-1 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] text-slate-300 font-semibold text-sm active:scale-[0.98]"
              >
                Start over
              </button>
              <button
                onClick={() => {
                  setMenuText(ocrText);
                  setPageState("done");
                  runAnalysis(ocrText);
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#f7b267] to-[#ffd6a5] text-slate-950 font-semibold text-sm active:scale-[0.98]"
              >
                Analyze →
              </button>
            </div>
          </div>
        ) : (
          <ScanScreen
            isAnalyzing={isAnalyzing}
            error={error}
            onFile={() => fileInputRef.current?.click()}
            onSample={() => runAnalysis(sampleMenuText)}
            menuText={menuText}
            setMenuText={setMenuText}
            onAnalyze={() => runAnalysis(menuText || sampleMenuText)}
          />
        )}

        {/* Drink detail bottom sheet */}
        {selectedDrink && (
          <DrinkSheet
            drink={selectedDrink}
            onClose={() => setSelectedDrink(null)}
          />
        )}
      </div>

      {/* Bottom nav */}
      <BottomNav active={activeTab} onTabChange={handleTabChange} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
}
