"use client";

import { useState, useRef, useEffect, type ChangeEvent, type ReactNode } from "react";
import { MenuAnalysis, type MenuItemAnalysis } from "@/lib/types";
import {
  analyzeMenuText,
  cocktailProfiles,
} from "@/lib/menu-analysis";
import { saveResult, loadHistory, clearHistory } from "@/lib/history";
import { createClient, SUPABASE_CONFIGURED } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "scan" | "results";
type Tab = "scan" | "history" | "catalog" | "profile";

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
function IcUser({ cls = "w-6 h-6" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onClose, onAuth }: { onClose: () => void; onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!SUPABASE_CONFIGURED) { setError("Auth not configured yet."); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else setSuccess("Check your email to confirm your account, then sign in.");
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else if (data.user) { onAuth(data.user); onClose(); }
    }
    setLoading(false);
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1628] rounded-t-[2.5rem] flex flex-col sheet-enter px-6 pb-10 pt-4">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <button onClick={onClose} className="absolute top-4 right-5 p-1 text-slate-400"><IcX /></button>
        <h2 className="text-2xl text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {mode === "signin" ? "Sign in to access your scans and ratings." : "Save your scans and build your flavor profile."}
        </p>
        {success ? (
          <p className="text-sm text-[var(--app-mint)] leading-6">{success}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" required
              className="w-full px-4 py-3 rounded-2xl bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-[rgba(247,178,103,0.4)] transition-colors"
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required minLength={6}
              className="w-full px-4 py-3 rounded-2xl bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-[rgba(247,178,103,0.4)] transition-colors"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f7b267] to-[#ffd6a5] text-slate-950 font-semibold text-sm disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-center text-slate-500">
          {mode === "signin" ? "No account? " : "Already have one? "}
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setSuccess(null); }}
            className="text-[var(--app-accent)] underline underline-offset-2">
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl leading-none transition-transform active:scale-90"
          aria-label={`${s} star${s !== 1 ? "s" : ""}`}
        >
          <span className={(hover || value) >= s ? "text-[var(--app-accent)]" : "text-white/20"}>★</span>
        </button>
      ))}
    </div>
  );
}

// ─── Profile screen ───────────────────────────────────────────────────────────

type RatingRow = {
  cocktail_name: string;
  stars: number;
  rated_at: string;
  scan_id: string | null;
  style?: string | null;
  taste?: string | null;
  strength?: string | null;
  similar_drinks?: string[] | null;
  bottles?: string[] | null;
  bar_name?: string | null;
  user_scans?: { bar_name: string | null; items: MenuItemAnalysis[] } | null;
};

function ProfileScreen({ user, onSignOut, onSignIn, refreshKey, onRatingSaved }: { user: User | null; onSignOut: () => void; onSignIn: () => void; refreshKey: number; onRatingSaved: () => void }) {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<{ drink: MenuItemAnalysis; barName?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/ratings?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { 
        console.log("Fetched ratings:", data);
        if (Array.isArray(data)) setRatings(data); 
      })
      .finally(() => setLoading(false));
  }, [user, refreshKey]);

  function handleRatingTap(r: RatingRow) {
    const scan = r.user_scans;
    const drink = scan?.items?.find((i: MenuItemAnalysis) => i.name.toLowerCase() === r.cocktail_name.toLowerCase());
    
    // Try to get drink data from scan first, then fall back to rating data
    if (drink) {
      setSelectedDrink({ 
        drink, 
        barName: r.bar_name ?? scan?.bar_name ?? undefined 
      });
    } else {
      // Construct drink from rating data (which includes style, taste, etc. if available)
      setSelectedDrink({
        drink: { 
          name: r.cocktail_name, 
          style: r.style ?? "", 
          taste: r.taste ?? "", 
          similarDrinks: r.similar_drinks ?? [], 
          bottles: r.bottles ?? [], 
          confidence: 0, 
          strength: r.strength ?? "medium", 
          aiGenerated: false 
        },
        barName: r.bar_name ?? scan?.bar_name ?? undefined,
      });
    }
  }

  // Compute flavor profile from ratings
  const flavorProfile = (() => {
    if (ratings.length === 0) return null;
    const styleMap: Record<string, number> = {};
    for (const r of ratings) {
      const scanDrink = r.user_scans?.items?.find((i: MenuItemAnalysis) => i.name.toLowerCase() === r.cocktail_name.toLowerCase());
      const styleText = scanDrink?.style ?? cocktailProfiles.find(p => p.name.toLowerCase() === r.cocktail_name.toLowerCase())?.style ?? "";
      const words = styleText.toLowerCase().split(/[\s·,]+/).filter((w: string) => w.length > 3);
      for (const w of words) {
        styleMap[w] = (styleMap[w] ?? 0) + r.stars;
      }
    }
    const top = Object.entries(styleMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    return top.length ? top : null;
  })();

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 gap-4">
        <IcUser cls="w-12 h-12 text-slate-600" />
        <p className="text-base text-white font-medium">No account yet</p>
        <p className="text-sm text-slate-400 text-center leading-6">Sign in to save your scans, rate cocktails, and build your personal flavor profile.</p>
        <button onClick={onSignIn} className="mt-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-[#f7b267] to-[#ffd6a5] text-slate-950 font-semibold text-sm">
          Sign in / Create account
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto no-scrollbar relative">
      <header className="px-6 pt-6 pb-4 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Account</p>
        <h2 className="mt-2 text-3xl text-white leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Your Profile
        </h2>
        <p className="mt-1 text-xs text-slate-500 truncate">{user.email}</p>
      </header>

      <div className="px-5 pb-8 space-y-5">
        {/* Flavor profile */}
        <div className="px-4 py-4 rounded-3xl bg-white/[0.04] border border-white/[0.07]">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Taste Profile</p>
          {flavorProfile ? (
            <>
              <p className="text-sm text-slate-200 leading-6">
                You tend to enjoy <span className="text-[var(--app-accent)]">{flavorProfile.join(", ")}</span> cocktails.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {flavorProfile.map(tag => (
                  <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-[rgba(247,178,103,0.12)] text-[var(--app-accent)] border border-[rgba(247,178,103,0.2)]">{tag}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Rate some cocktails to build your profile.</p>
          )}
        </div>

        {/* Ratings history */}
        {(loading || ratings.length > 0) && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 px-1">Rated Cocktails</p>
            {loading ? (
              <p className="text-sm text-slate-500 px-1">Loading…</p>
            ) : (
              <div className="space-y-2">
                {ratings.map(r => (
                  <button
                    key={r.cocktail_name}
                    onClick={() => handleRatingTap(r)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] active:scale-[0.98] transition-transform text-left"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm text-slate-200 truncate">{r.cocktail_name}</p>
                      {(r.bar_name || r.user_scans?.bar_name) && (
                        <p className="text-[10px] text-slate-500 mt-0.5">📍 {r.bar_name || r.user_scans?.bar_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-[var(--app-accent)]">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                      <IcRight cls="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-2xl border border-white/[0.07] text-slate-400 text-sm active:text-white transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Drink detail sheet from rating tap */}
      {selectedDrink && (
        <DrinkSheet
          drink={selectedDrink.drink}
          onClose={() => setSelectedDrink(null)}
          user={user}
          scanId={null}
          barName={selectedDrink.barName}
          onRatingSaved={onRatingSaved}
        />
      )}
    </div>
  );
}

// ─── Drink detail bottom sheet ────────────────────────────────────────────────

function DrinkSheet({
  drink,
  onClose,
  user,
  scanId,
  barName,
  onRatingSaved,
}: {
  drink: MenuItemAnalysis;
  onClose: () => void;
  user: User | null;
  scanId: string | null;
  barName?: string;
  onRatingSaved?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [initialRating, setInitialRating] = useState(0);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing rating if user is signed in
  useEffect(() => {
    if (!user) return;
    fetch(`/api/ratings?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const existing = data.find((r: { cocktail_name: string }) => r.cocktail_name.toLowerCase() === drink.name.toLowerCase());
          if (existing) {
            setRating(existing.stars);
            setInitialRating(existing.stars);
          }
        }
      });
  }, [user, drink.name]);

  function handleRating(stars: number) {
    setRating(stars);
  }

  async function saveRating() {
    if (!user || rating === 0) return;
    setSaveError(null);
    setIsSavingRating(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user.id, 
          cocktailName: drink.name, 
          stars: rating, 
          scanId,
          style: drink.style,
          taste: drink.taste,
          strength: drink.strength,
          similarDrinks: drink.similarDrinks,
          bottles: drink.bottles,
          barName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rating");
      setInitialRating(rating);
      setRatingSaved(true);
      onRatingSaved?.();
      // Auto close after 1.5 seconds
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save rating";
      setSaveError(message);
    } finally {
      setIsSavingRating(false);
    }
  }

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
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] uppercase tracking-widest border border-[rgba(247,178,103,0.25)] bg-[rgba(247,178,103,0.12)] text-[var(--app-accent)]">
                {drink.style}
              </span>
              {drink.barSignificance && (
                <span className="inline-block px-3 py-1 rounded-full text-[11px] uppercase tracking-widest border border-[rgba(247,178,103,0.25)] bg-[rgba(247,178,103,0.12)] text-[var(--app-accent)]">
                  ★ {drink.barSignificance}
                </span>
              )}
              {barName && (
                <span className="inline-block px-3 py-1 rounded-full text-[11px] border border-white/[0.1] bg-white/[0.05] text-slate-400">
                  📍 {barName}
                </span>
              )}
            </div>
          </div>

          {/* Taste note */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
              Taste note
            </p>
            <p className="text-sm leading-7 text-slate-200">{drink.taste}</p>
          </div>

          {/* Strength */}
          {drink.strength && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
                Strength
              </p>
              <div
                className={`px-4 py-3 rounded-2xl border ${
                  drink.strength === "light"
                    ? "bg-[rgba(125,211,199,0.08)] border-[rgba(125,211,199,0.25)] text-[var(--app-mint)]"
                    : drink.strength === "strong"
                      ? "bg-[rgba(255,99,71,0.08)] border-[rgba(255,99,71,0.25)] text-[#ff6347]"
                      : "bg-[rgba(247,178,103,0.08)] border-[rgba(247,178,103,0.25)] text-[var(--app-accent)]"
                }`}
              >
                <p className="text-sm capitalize font-medium">{drink.strength}</p>
              </div>
            </div>
          )}

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

          {/* Rating */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
              {user ? "Your rating" : "Rate this drink"}
            </p>
            {user ? (
              <StarRating value={rating} onChange={handleRating} />
            ) : (
              <p className="text-xs text-slate-500">Sign in to rate cocktails and build your flavor profile.</p>
            )}
          </div>

          {/* Save button (only if rating changed and user is logged in) */}
          {user && rating !== initialRating && rating > 0 && (
            <div className="space-y-2">
              {ratingSaved ? (
                <button
                  disabled
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--app-mint)] text-black text-sm font-medium"
                >
                  ✓ Saved
                </button>
              ) : (
                <>
                  {saveError && (
                    <div className="px-3 py-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                      {saveError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRating(initialRating);
                        setSaveError(null);
                      }}
                      disabled={isSavingRating}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.05] text-slate-300 text-sm font-medium hover:bg-white/[0.08] active:bg-white/[0.1] disabled:opacity-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveRating}
                      disabled={isSavingRating}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--app-accent)] text-black text-sm font-medium hover:opacity-90 active:opacity-80 disabled:opacity-50 transition"
                    >
                      {isSavingRating ? "Saving..." : "Save Rating"}
                    </button>
                  </div>
                </>
              )}
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

  const strengthColor =
    drink.strength === "light"
      ? "bg-[rgba(125,211,199,0.12)] text-[var(--app-mint)]"
      : drink.strength === "strong"
        ? "bg-[rgba(255,99,71,0.12)] text-[#ff6347]"
        : "bg-[rgba(247,178,103,0.12)] text-[var(--app-accent)]";

  return (
    <button
      onClick={() => onTap(drink)}
      className="w-full text-left px-4 py-4 rounded-3xl bg-white/[0.04] border border-white/[0.07] active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-white truncate">{drink.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-slate-500">{drink.style}</p>
            {drink.barSignificance && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(247,178,103,0.15)] text-[var(--app-accent)]">
                ★ {drink.barSignificance}
              </span>
            )}
          </div>
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
      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
        {drink.similarDrinks.slice(0, 2).map((d: string) => (
          <span
            key={d}
            className="text-[10px] px-2.5 py-1 rounded-full bg-black/25 border border-white/[0.07] text-slate-400"
          >
            {d}
          </span>
        ))}
        {drink.strength && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full border border-white/[0.07] ${strengthColor}`}>
            {drink.strength}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  analysis,
  onBack,
  onDrinkTap,
  scanId,
  user,
  onSave,
}: {
  analysis: MenuAnalysis;
  onBack: () => void;
  onDrinkTap: (d: MenuItemAnalysis) => void;
  scanId: string | null;
  user: User | null;
  onSave: () => Promise<void>;
}) {
  const [barName, setBarName] = useState(() => {
    // Initialize with default bar name (date-based)
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return (analysis as MenuAnalysis & { barName?: string }).barName ?? `${dateStr} menu`;
  });
  const [editingBar, setEditingBar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveScanSuccess, setSaveScanSuccess] = useState(false);
  const [saveScanError, setSaveScanError] = useState<string | null>(null);

  async function saveBarName() {
    if (!scanId || !barName.trim()) return;
    await fetch("/api/scans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId, barName: barName.trim() }),
    });
    setEditingBar(false);
  }

  async function handleSave() {
    setSaveScanError(null);
    setIsSaving(true);
    try {
      await onSave();
      setSaveScanSuccess(true);
      // Auto navigate back after 1.5 seconds
      setTimeout(() => onBack(), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save menu";
      setSaveScanError(message);
    } finally {
      setIsSaving(false);
    }
  }

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

      {/* Bar name tag */}
      {user && scanId && (
        <div className="px-5 pb-2 flex-shrink-0">
          {editingBar ? (
            <div className="flex gap-2">
              <input
                value={barName}
                onChange={e => setBarName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveBarName()}
                placeholder="Bar or restaurant name"
                autoFocus
                className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-[rgba(247,178,103,0.4)]"
              />
              <button onClick={saveBarName} className="px-3 py-2 rounded-xl bg-[rgba(247,178,103,0.15)] text-[var(--app-accent)] text-sm">Save</button>
              <button onClick={() => setEditingBar(false)} className="px-3 py-2 rounded-xl bg-white/[0.05] text-slate-400 text-sm">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingBar(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 active:text-slate-300 transition-colors"
            >
              <span>📍</span>
              <span>{barName}</span>
            </button>
          )}
        </div>
      )}

      {/* Save/Discard buttons */}
      {user && (
        <div className="px-5 pt-2 pb-2 flex-shrink-0">
          {saveScanSuccess ? (
            <button
              disabled
              className="w-full px-4 py-2.5 rounded-2xl bg-[var(--app-mint)] text-black text-sm font-medium"
            >
              ✓ Saved
            </button>
          ) : (
            <div className="space-y-2">
              {saveScanError && (
                <div className="px-3 py-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {saveScanError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onBack()}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.05] text-slate-300 text-sm font-medium hover:bg-white/[0.08] active:bg-white/[0.1] disabled:opacity-50 transition"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--app-accent)] text-black text-sm font-medium hover:opacity-90 active:opacity-80 disabled:opacity-50 transition"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
    { id: "catalog", label: "Catalog", icon: <IcText /> },
    { id: "profile", label: "Profile", icon: <IcUser /> },
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

function HistoryScreen({ onSelect, user, refreshKey }: { onSelect: (scan: MenuAnalysis) => void; user: User | null; refreshKey: number }) {
  const [cloudScans, setCloudScans] = useState<MenuAnalysis[] | null>(null);
  const [loading, setLoading] = useState(false);
  const localHistory = loadHistory();

  useEffect(() => {
    if (!user) { setCloudScans(null); return; }
    setLoading(true);
    fetch(`/api/scans?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCloudScans(data.map((row: { id: string; scanned_at: string; summary: string; items: MenuAnalysis["items"]; bottle_mentions: MenuAnalysis["bottleMentions"]; raw_ocr_text: string }) => ({
            id: row.id,
            savedAt: new Date(row.scanned_at).getTime(),
            summary: row.summary,
            items: row.items ?? [],
            bottleMentions: row.bottle_mentions ?? [],
            rawOcrText: row.raw_ocr_text,
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [user, refreshKey]);

  const history = user ? (cloudScans ?? []) : localHistory;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <IcSpinner cls="w-8 h-8 text-slate-500" />
      </div>
    );
  }

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
          {history.length} saved {history.length === 1 ? "scan" : "scans"}{user ? " in your account" : ""}.
        </p>
      </header>
      <div className="px-5 pb-8 space-y-3">
        {history.map((scan) => {
          const savedAt = (scan as MenuAnalysis & { savedAt?: number }).savedAt ?? Date.now();
          const daysAgo = Math.floor((Date.now() - savedAt) / (1000 * 60 * 60 * 24));
          const dateStr = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;

          return (
            <button
              key={savedAt}
              onClick={() => onSelect(scan)}
              className="w-full text-left px-4 py-4 rounded-3xl bg-white/[0.04] border border-white/[0.07] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Scanned {dateStr}</p>
                  <p className="text-xs text-slate-500 mt-1">{scan.items.length} drinks found</p>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                    {scan.summary}
                  </p>
                </div>
                <span className="text-slate-500 text-xs mt-1">›</span>
              </div>
            </button>
          );
        })}
        {!user && (
          <button
            onClick={clearHistory}
            className="w-full py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-500 text-sm active:scale-[0.98] transition-transform mt-4"
          >
            Clear history
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Catalog screen ──────────────────────────────────────────────────────────

function CatalogScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col overflow-y-auto no-scrollbar">
      <header className="px-6 pt-6 pb-4 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Library</p>
        <h2
          className="mt-2 text-3xl text-white leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Known drinks
        </h2>
        <p className="mt-3 text-sm text-slate-400 leading-7">
          {cocktailProfiles.length} drinks in the catalog.
        </p>
      </header>
      <div className="px-5 pb-8 space-y-2">
        {cocktailProfiles.map((drink) => {
          const isOpen = expanded === drink.name;
          return (
            <button
              key={drink.name}
              onClick={() => setExpanded(isOpen ? null : drink.name)}
              className="w-full text-left px-4 py-4 rounded-3xl bg-white/[0.04] border border-white/[0.07] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{drink.name}</p>
                  <p className="text-xs text-[var(--app-accent)] mt-0.5">{drink.style}</p>
                </div>
                <span className="text-slate-500 text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-2 text-left">
                  <p className="text-xs text-slate-300 leading-5">{drink.taste}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {drink.similarDrinks.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--app-mint)]/10 text-[var(--app-mint)] border border-[var(--app-mint)]/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
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
  const [error, setError] = useState<string | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<MenuItemAnalysis | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Supabase session on mount
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function saveScanToAccount(result: MenuAnalysis) {
    if (!user) { saveResult(result); return; }
    // Save to Supabase
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const defaultBarName = `${dateStr} menu`;
    
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, scan: result, barName: defaultBarName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save scan");
    if (data.id) setCurrentScanId(data.id);
  }

  async function runAnalysis(text: string) {
    setIsAnalyzing(true);
    try {
      const body = new FormData();
      body.append("text", text);
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      const result = data as typeof data & { rawOcrText?: string };
      setAnalysis(result);
      setCurrentScanId(null);
      setScreen("results");
      setActiveTab("scan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
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
          setCurrentScanId(null);
          await saveScanToAccount(data);
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

  function handleHistorySelect(scan: MenuAnalysis) {
    setAnalysis(scan);
    setCurrentScanId(scan.id ?? null);
    setScreen("results");
    setActiveTab("scan");
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
        <div className="flex items-center gap-2">
          {user ? (
            <button onClick={() => setActiveTab("profile")} className="w-6 h-6 rounded-full bg-[rgba(247,178,103,0.3)] flex items-center justify-center" aria-label="Profile">
              <span className="text-[9px] font-bold text-[var(--app-accent)]">{user.email?.[0].toUpperCase()}</span>
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)} className="text-[11px] text-slate-400 active:text-white transition-colors">Sign in</button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "history" ? (
          <HistoryScreen onSelect={handleHistorySelect} user={user} refreshKey={refreshKey} />
        ) : activeTab === "catalog" ? (
          <CatalogScreen />
        ) : activeTab === "profile" ? (
          <ProfileScreen
            user={user}
            onSignOut={async () => { if (SUPABASE_CONFIGURED) await createClient().auth.signOut(); setUser(null); }}
            onSignIn={() => setShowAuth(true)}
            refreshKey={refreshKey}
            onRatingSaved={() => setRefreshKey(prev => prev + 1)}
          />
        ) : screen === "results" && analysis ? (
          <ResultsScreen
            analysis={analysis}
            onBack={() => setScreen("scan")}
            onDrinkTap={setSelectedDrink}
            scanId={currentScanId}
            user={user}
            onSave={async () => {
              await saveScanToAccount(analysis);
              setRefreshKey(prev => prev + 1);
              setScreen("scan");
            }}
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
            onSample={() => {}}
            menuText={menuText}
            setMenuText={setMenuText}
            onAnalyze={() => runAnalysis(menuText)}
          />
        )}

        {/* Drink detail bottom sheet */}
        {selectedDrink && (
          <DrinkSheet
            drink={selectedDrink}
            onClose={() => setSelectedDrink(null)}
            user={user}
            scanId={currentScanId}
          />
        )}

        {/* Auth modal */}
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuth={(u) => setUser(u)}
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
