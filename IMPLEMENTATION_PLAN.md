# Spirit Note — Implementation Plan

> A polished web app that scans cocktail menus and returns tasting notes, similar drinks, and bottle references. Hosted on Vercel, no user accounts in V1, free or low-cost AI throughout.

---

## Status snapshot

| Area | Status |
|---|---|
| Next.js App Router scaffold | ✅ Done |
| Polished UI shell + dark theme | ✅ Done |
| Local deterministic parser (`menu-analysis.ts`) | ✅ Done |
| Sample menu + intake form | ✅ Done |
| Mobile smartphone UI (phone frame on desktop) | ✅ Done |
| OCR wiring | ⏳ Step 2 |
| AI model for tasting notes | ⏳ Step 3 |
| Review + correction screen | ⏳ Step 5 |
| Vercel deploy | ⏳ Step 7 |

---

## How this pipeline works

Every scan moves through five stages. Understanding the flow explains why each step was built in this order:

```
User uploads photo / PDF / pastes text
             ↓
   [ Step 2 — OCR ]
   Gemini Flash reads the image and returns plain text
             ↓
   [ Step 1 — Local parser ]
   Catalog matches known drinks instantly — free, no hallucination
             ↓
   [ Step 3 — AI enrichment ]
   Gemini fills in tasting notes only for drinks NOT in the catalog
             ↓
   [ Step 5 — Review screen ]
   User can correct OCR errors before committing
             ↓
   [ Render ]
   Phone-frame UI shows drink cards, similar drinks, bottle references
```

**Why not send the image straight to an AI and ask for everything in one call?**
That works but has three problems: vision tokens are expensive, one big call is slow (4–8 seconds), and the model will hallucinate bottle names that are not actually on the menu. OCR first converts the image to text cheaply and reliably. The local catalog then answers correctly on well-known drinks with zero API cost. The AI only runs on the remaining items the catalog doesn’t recognize.

**Why build a local parser before wiring AI?**
The catalog covers roughly 80% of cocktail menus correctly, returns in milliseconds, and never invents a bottle name. Building it first also locks in the output shape — `MenuItemAnalysis`, `BottleMention`, `MenuAnalysis` — so the AI step has a clear contract to fill instead of returning free-form text.

---

## Step 1 — Foundation (complete)

**Why this step exists:** Before any AI or OCR, the app needs a skeleton that already looks and feels like the product. Building the UI and a deterministic local parser first means you can test the full experience on any device without needing an API key, the results screen and drink card format are locked in before wiring AI (so the AI has a clear shape to return), and if OCR ever fails in production the paste-text fallback still gives users the full experience.

**What:** Replace the scaffold defaults with the product shell: a polished dark-themed mobile app UI, a local analysis helper, and a results view — all working without any external API keys.

**Completed files:**

```
src/
  app/
    page.tsx     ← full mobile app UI (scan, results, drink detail sheet, bottom nav)
    layout.tsx   ← Fraunces + Space Grotesk fonts, Spirit Note metadata
    globals.css  ← dark theme, phone frame CSS, scan corner animation, sheet slide-up
  lib/
    menu-analysis.ts  ← cocktail catalog parser + bottle library + flavor keyword fallback
```

**UI design decision:** The app renders as a 390×844px phone frame on desktop (with layered box-shadow chrome) and fills the full screen on mobile. This gives the product a native-app feel across all viewports.

**Screens implemented:**
- **Scan** — animated camera button with corner markers, upload/paste options, sample menu shortcut
- **Results** — scrollable drink cards with confidence badge, similar-drink tags, bottle reference section
- **Drink detail** — bottom sheet (slide-up animation) with full taste note, confidence bar, similar drinks, bottles
- **History** — placeholder screen (wires in at Step 6)
- **About** — build status board and pipeline explainer
- **Bottom nav** — Scan / History / About tabs with iOS home indicator

**Current state:** Build passes cleanly. Run `npm run dev` and open `http://localhost:3000`.

**Verified:**
- [x] Phone frame renders on desktop, full-screen on mobile
- [x] "Try sample menu" → drink cards appear
- [x] Tap a drink card → detail sheet slides up
- [x] File input accepts images and PDFs (OCR not yet wired)
- [x] `npm run build` passes with zero type or lint errors

### 1a — Update the app metadata and fonts

**Why:** Two fonts with distinct roles give the app a premium feel without a design system. Fraunces is a high-contrast serif that reads as upscale on headings. Space Grotesk is a geometric sans-serif that stays legible at 12–14px on a phone screen. Next.js self-hosts both from Google Fonts at build time — no render-blocking requests at runtime.

In `src/app/layout.tsx`, swap Geist for the display/body font pair and update the title:

```ts
import { Fraunces, Space_Grotesk } from "next/font/google";

const displayFont = Fraunces({ variable: "--font-display", subsets: ["latin"] });
const bodyFont = Space_Grotesk({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spirit Note",
  description: "Scan cocktail menus and turn them into tasting notes, bottle references, and similar drinks.",
};
```

### 1b — Add the dark theme to `globals.css`

**Why:** All colors live in CSS custom properties in one file. Changing the accent color or swapping a surface requires editing one line. The dark background (#090d1a, deep navy) is deliberate — bars are dim and a dark UI reduces eye strain in low light while feeling premium. The `@theme inline` block is Tailwind v4’s way of mapping CSS variables to its utility class system. The `100dvh` unit is used instead of `100vh` because `100vh` on mobile Safari includes the browser chrome, causing the frame to overflow the visible screen.

Replace the default light-mode variables with the product color palette:

```css
:root {
  --background: #050816;
  --foreground: #f4efe7;
  --surface: rgba(9, 14, 26, 0.82);
  --surface-strong: rgba(12, 18, 34, 0.95);
  --accent: #f7b267;
  --accent-strong: #ffd6a5;
  --mint: #7dd3c7;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-body);
  --font-mono: var(--font-body);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body), system-ui, sans-serif;
  /* Optional ambient gradient */
  background-image:
    radial-gradient(circle at top left, rgba(247,178,103,0.18), transparent 32%),
    linear-gradient(180deg, #08111f 0%, #050816 40%, #04050c 100%);
}
```

### 1c — Create `src/lib/menu-analysis.ts`

**Why a local parser before AI?** Running every request through a model costs money, adds 2–4 seconds of latency, and risks hallucinated bottle names. The local catalog handles the most common cocktails instantly and for free. The AI step (Step 3) only runs on the drinks it doesn’t recognize. The `confidence` value returned by each `parseLine` call is the signal that tells Step 3 whether enrichment is needed: `0.94` means catalog match (skip AI), `0.55–0.86` means keyword fallback (enrich with AI).

**Why export TypeScript types from this file?** The same shape (`MenuItemAnalysis`, `BottleMention`, `MenuAnalysis`) is used by the parser, the API route, and the React components. Defining types once here prevents the three layers from drifting out of sync as the code evolves.

This file is the core local parser. It must export:

- `sampleMenuText` — a hardcoded sample menu string for testing without a real upload
- `analyzeMenuText(text: string): MenuAnalysis` — the main function
- Types: `MenuAnalysis`, `MenuItemAnalysis`, `BottleMention`

Key internals to implement:

1. **Cocktail profile catalog** — an array of known drinks, each with `name`, `aliases`, `style`, `taste` (two-sentence description), `similarDrinks[]`, and `bottleHints[]`.
2. **Bottle library** — an array of named spirits/modifiers, each with `name` and `description`.
3. **Flavor keyword map** — regex patterns (e.g. `/smok|mezcal/i`) mapped to flavor notes and similar drink names, used as a fallback for unknown drinks.
4. **`analyzeLine(line)`** — tries to match a line to the profile catalog; falls back to keyword detection if no profile matches.
5. **`detectBottleMentions(text)`** — scans the full menu text for bottle library names and returns matched entries.
6. **`analyzeMenuText(text)`** — splits text into lines, filters likely drink lines (using `|`, `—`, `-` separators or short line length), runs `analyzeLine` on each, and calls `detectBottleMentions` on the full text.

Minimum catalog to include for the sample menu to work:
- Mezcal Paloma, Paper Plane, French 75, Oaxacan Old Fashioned, Negroni Sbagliato, Old Cuban

Minimum bottle library entries:
- Aperol, Campari, Amaro Nonino, Prosecco, Angostura Bitters, Del Maguey Vida Mezcal

### 1d — Replace `src/app/page.tsx` with the product UI

**Why `"use client"` at the top?** React Server Components (the Next.js App Router default) cannot use `useState`, event handlers, or browser APIs. The scan page needs all three. `"use client"` tells Next.js to render this component in the browser.

**Why separate sub-components (`ScanScreen`, `ResultsScreen`, `DrinkSheet`, `BottomNav`)?** Each screen has its own state and layout. Keeping them in separate functions makes each piece independently readable without a component library.

**Why inline SVG icons instead of Lucide or Heroicons?** We use six icons total. Every icon library adds bundle weight. Inline SVGs are 4–8 lines each, add zero dependencies, and inherit the parent’s text color via `currentColor`.

This is a `"use client"` component. It must manage these state values:

```ts
const [menuText, setMenuText] = useState(sampleMenuText);
const [selectedFile, setSelectedFile] = useState<string | null>(null);
const [analysis, setAnalysis] = useState<MenuAnalysis>(() => analyzeMenuText(sampleMenuText));
const [status, setStatus] = useState("Ready to parse a menu sample or your own text.");
const [isAnalyzing, setIsAnalyzing] = useState(false);
```

UI sections to build:

1. **Hero section** — app name badge, headline, feature pill list
2. **Intake form** — file input (`accept="image/*,application/pdf" capture="environment"`), textarea for pasted text, Analyze and Load sample buttons, status bar
3. **Analysis preview** — summary line, top 3 drink cards with name + taste + confidence
4. **Full drink breakdown** — all parsed drinks, each with style, taste note, similar drinks panel, bottles panel
5. **Bottle references sidebar** — list of matched bottle entries from the library
6. **Build path sidebar** — static list of what comes next (OCR, API route, model)

**Run locally after completing Step 1:**

```bash
npm run dev
# open http://localhost:3000
```

**Verify:**

- [ ] Page loads with the Spirit Note hero section and dark theme
- [ ] "Load sample menu" populates the textarea and drink cards update
- [ ] "Analyze menu" re-runs the parser and updates all result sections
- [ ] File input accepts images and PDFs (no OCR yet — UI only)
- [ ] `npm run build` passes with no type or lint errors

---

## Step 2 — OCR + Upload pipeline

**Why this step exists:** The Step 1 file input already accepts uploads, but `handleFileChange` is a stub that just loads sample text. This step replaces that stub with a real server-side route that sends the file to Gemini Flash, extracts the menu text, and runs it through the local parser.

**Why a server-side API route instead of calling Gemini from the browser?** API keys must never appear in browser JavaScript — they are visible to anyone who opens DevTools. Next.js App Router API routes run on Vercel’s servers, so the key stays private. The browser only talks to `/api/analyze` on your own domain and never touches Google’s API directly.

**Why Gemini Flash instead of GPT-4o-mini?** Gemini 2.0 Flash has a free tier (15 req/min, 1M tokens/day), handles images and PDFs natively in a single API call, and costs ~$0.10/1M tokens after the free tier. GPT-4o-mini has no free tier. Both use the same Vercel AI SDK interface, so swapping providers later is a one-line change.

**Depends on:** Step 1

### 2a — Choose a provider

**Recommended: Google Gemini Flash** — free tier (15 req/min, 1M tokens/day), handles images and PDFs in a single call, no separate OCR account needed.

```bash
# `ai` is the Vercel AI SDK — a single interface for all AI providers.
# Using it means you can swap Gemini for OpenAI by changing one line without
# rewriting your API calls.
# `@ai-sdk/google` is the Gemini provider that plugs into the AI SDK.
npm install ai @ai-sdk/google
```

Get a free key at https://aistudio.google.com/app/apikey, then create `.env.local` in the project root:

```
# .env.local is already in .gitignore — it will never be committed to git.
# The variable name must match exactly: the @ai-sdk/google package reads it automatically.
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

### 2b — Create the API route

Create `src/app/api/analyze/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";           // AI SDK core: sends a prompt, returns text
import { google } from "@ai-sdk/google";     // Gemini provider: reads GOOGLE_GENERATIVE_AI_API_KEY
import { analyzeMenuText } from "@/lib/menu-analysis"; // our local parser from Step 1

// Vercel serverless functions default to a 10-second timeout.
// OCR on a large PDF can take 15–25 seconds, so we extend it.
// Hobby plan max: 60s. Pro plan max: 300s.
export const maxDuration = 30;

// Next.js App Router matches the exported function name to the HTTP method.
// Exporting `POST` means this route only accepts POST requests.
export async function POST(req: NextRequest) {
  try {
    // File uploads use multipart/form-data encoding, not JSON.
    // `req.formData()` parses that encoding and returns a Web API FormData object.
    const formData = await req.formData();

    // `formData.get("file")` returns the uploaded File object, or null if absent.
    // The field name "file" must match what the browser sends: `body.append("file", file)`.
    const file = formData.get("file") as File | null;

    // `formData.get("text")` handles the paste-text path.
    // Pasted text bypasses OCR entirely — no Gemini call needed, no API cost.
    const text = formData.get("text") as string | null;

    // Start with the pasted text (trimmed), or an empty string.
    // If a file is present, this will be overwritten by the OCR result below.
    let rawOcrText = text?.trim() ?? "";

    if (file && file.size > 0) {
      // Guard: if the developer forgot to add the key to .env.local,
      // return a readable 503 "Service Unavailable" instead of a cryptic 401 from Google.
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return NextResponse.json(
          { error: "Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local." },
          { status: 503 },
        );
      }

      // `file.type` is the MIME type the browser detected, e.g. "image/jpeg" or "application/pdf".
      const mime = file.type;

      // `file.arrayBuffer()` converts the File to raw bytes.
      // The AI SDK accepts ArrayBuffer directly — no base64 encoding needed.
      const bytes = await file.arrayBuffer();

      // `generateText` sends a message to Gemini and returns the model’s plain text response.
      // The destructured `{ text: extracted }` renames `text` to `extracted` to avoid
      // shadowing the outer `text` variable from formData above.
      const { text: extracted } = await generateText({
        // `google("gemini-2.0-flash")` creates a model handle.
        // The provider reads GOOGLE_GENERATIVE_AI_API_KEY from process.env automatically.
        model: google("gemini-2.0-flash"),
        messages: [
          {
            role: "user",
            content: [
              // `FilePart` handles both images and PDFs in the AI SDK.
              // `type: "file" as const` narrows the TypeScript type to the literal "file" —
              // required because the content array is a discriminated union.
              // IMPORTANT: the field is `mediaType` (not `mimeType`). The Vercel AI SDK uses
              // IANA standard naming. Using `mimeType` causes a TypeScript compile error.
              { type: "file" as const, data: bytes, mediaType: mime },
              {
                type: "text" as const,
                // Keep the prompt minimal. The model’s only job here is text extraction.
                // A short, direct prompt uses fewer tokens and avoids unwanted commentary.
                text: "Extract all text from this cocktail menu. Raw text only, preserve line breaks, no commentary.",
              },
            ],
          },
        ],
      });

      // `.trim()` removes leading/trailing whitespace that OCR often adds.
      rawOcrText = extracted.trim();
    }

    // If there is still no text, the file was unreadable (blurry, wrong format, empty upload).
    // 422 = "Unprocessable Content" — the request was valid but we couldn’t extract anything.
    if (!rawOcrText) {
      return NextResponse.json(
        { error: "No menu text found. Try uploading a clearer photo." },
        { status: 422 },
      );
    }

    // Run the local parser on the text. This is the same function used in the
    // client-side stub from Step 1 — it works identically on the server.
    const analysis = analyzeMenuText(rawOcrText);

    // Spread the analysis fields into the response and add `rawOcrText`.
    // The raw OCR text is included so the Step 5 review screen can show
    // what the model actually read before the user confirms the analysis.
    return NextResponse.json({ ...analysis, rawOcrText });
  } catch (err) {
    // Log the full error server-side for debugging in Vercel function logs.
    // Never send a raw stack trace to the browser — that exposes internal details.
    console.error("[/api/analyze]", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
```

> **Note on the `FilePart` type:** The Vercel AI SDK uses `mediaType` (not `mimeType`) on `FilePart`. Both images and PDFs go through the `file` type with the appropriate `mediaType` string.

### 2c — Wire the frontend

In `src/app/page.tsx`, in the `Home` component:

**1. Add an error state:**
```ts
// null = no error. A string = the last request failed and should be shown in the UI.
// The error is cleared on the next analysis attempt.
const [error, setError] = useState<string | null>(null);
```

**2. Replace `handleFileChange` with a real API call:**
```ts
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
      setAnalysis(data);
      setScreen("results");
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
```

**3. Add `error` to the `ScanScreen` props and display it.**
Add `error?: string | null` to the `ScanScreen` props type, and render a small red `<p>` above the “Try with a sample menu” link when `error` is truthy.

**4. Add `rawOcrText?: string` to `MenuAnalysis` in `menu-analysis.ts`.**
This optional field carries the raw OCR text back to the browser for the Step 5 review screen. The `?` makes it optional so the local paste path (which has no OCR text) still satisfies the type.

**Verify:**
- [ ] Upload a phone photo of a real menu → drink cards appear
- [ ] Upload a PDF → text extracted correctly
- [ ] Missing API key shows a readable error in the UI
- [ ] Paste text still works with no API key

---

## Step 3 — AI model for tasting notes

**Why this step exists:** The local catalog handles common cocktails confidently (confidence ≥ 0.9). But any real menu has house specials, seasonal drinks, or regional classics not in the catalog. Without this step, those drinks get keyword-based placeholder notes like “expect a bright, zesty profile.” This step enriches low-confidence items with proper two-sentence tasting notes from Gemini.

**Why enrich only low-confidence items?** Cost and speed. The enrichment call sends drink names and styles to Gemini and gets back tasting notes — roughly 500 tokens per batch. Running it on every drink regardless of catalog confidence triples the cost and adds unnecessary latency on menus where the catalog already knows the answer.

**Why `generateObject` instead of `generateText`?** `generateText` returns an unstructured string that you would then parse back into the `MenuItemAnalysis` shape — fragile and error-prone. `generateObject` takes a Zod schema and forces the model to return valid JSON that matches your type exactly. If the model returns something malformed, the AI SDK retries automatically.

**Why never let the model generate bottle names?** Language models predict plausible text, not factual text. A model asked “what bottles are in this drink?” will confidently name bottles that sound right but may not be on the menu. Bottle data comes only from the OCR text extraction step.

**What:** Replace the deterministic taste descriptions in `menu-analysis.ts` with AI-generated ones for drinks that are not in the local catalog.

**Depends on:** Step 2

### 3a — Add a generation step to the API route

After OCR extracts raw text and the local parser produces structured drink records, send the unknown drinks to the model:

```ts
import { generateObject } from "ai";  // structured output: validates response against a Zod schema
import { z } from "zod";              // schema definition and validation library

// Only enrich drinks the catalog didn't recognize confidently.
// confidence < 0.9 means the parser fell back to keyword matching, so the
// tasting note is generic and worth replacing with a real AI-generated one.
const unknownDrinks = analysis.items.filter((item) => item.confidence < 0.9);

if (unknownDrinks.length > 0) {
  const { object } = await generateObject({
    model: google("gemini-2.0-flash"),

    // The schema is the contract between us and the model.
    // `generateObject` validates the response against this shape.
    // If the model returns a wrong type or missing field, the SDK retries up to 3 times.
    schema: z.object({
      drinks: z.array(z.object({
        // The name must match what we sent in the prompt exactly —
        // we use it as a lookup key to merge the AI note back into the analysis.
        name: z.string(),
        taste: z.string(),                    // two-sentence tasting note
        style: z.string(),                    // short label e.g. "tropical sour"
        similarDrinks: z.array(z.string()),   // exactly three similar drinks
      })),
    }),

    prompt: `You are a professional bartender and cocktail educator.
For each of the following cocktails, write:
- A two-sentence tasting note describing how the drink should taste.
- One style label (e.g. "tropical sour", "stirred spirit-forward").
- Three similar drinks the guest might enjoy.

Cocktails to describe:
${unknownDrinks.map((d) => `- ${d.name}: ${d.style}`).join("\n")}`,
  });

  // Merge AI-generated notes back into the analysis items.
  // We match by name so the same object reference gets updated in place.
  for (const aiDrink of object.drinks) {
    const match = analysis.items.find((item) => item.name === aiDrink.name);
    if (match) {
      match.taste = aiDrink.taste;
      match.style = aiDrink.style;
      match.similarDrinks = aiDrink.similarDrinks;
      // Do NOT update match.bottles — grounding rule:
      // bottle data comes from text extraction only, never from model generation.
    }
  }
}
```

### 3b — Grounding rule

**Why this rule exists:** Language models hallucinate. Asking the model “what bottles are in this drink?” produces confident but invented answers. The grounding rule is simple: the model is only allowed to generate tasting notes and similar-drink suggestions. Bottle names come from the OCR text extraction step exclusively — if a bottle wasn’t on the scanned menu, it will not appear in the results.

### 3c — Install Zod (if not already present)

```bash
# Zod is a TypeScript-first schema validation library.
# The AI SDK’s `generateObject` uses a Zod schema to validate and type the model output.
# If the model returns something that doesn’t match the schema, the SDK retries automatically.
npm install zod
```

**Verify:**

- [ ] A drink not in the local catalog (e.g. "Jungle Bird", "Naked and Famous") gets a plausible AI-generated tasting note
- [ ] Bottle mentions are still text-only and accurate
- [ ] Response latency is under 4 seconds on a fast connection
- [ ] If the model returns an error, the deterministic fallback note is shown instead

---

## Step 4 — Data model hardening

**Why this step exists:** After Steps 2 and 3, the types for `MenuAnalysis` and related shapes exist in three places: `menu-analysis.ts`, the API route, and the React components. When types are duplicated they drift — a field added to the parser type but forgotten in the API route causes a runtime bug TypeScript can’t catch because the two definitions are independent. Moving all types to `src/lib/types.ts` means one change propagates to all three layers automatically.

**Why add `aiGenerated: boolean` to `MenuItemAnalysis`?** The UI can then show a small badge next to AI-enriched drinks vs. catalog matches. This transparency helps users understand when the app is highly confident (catalog, instant) vs. when it consulted the model (which could occasionally be wrong).

**What:** Lock in the TypeScript types so every layer — OCR output, parser, API response, and UI — shares one schema.

**Depends on:** Steps 2 and 3

### 4a — Add a shared types file

Create `src/lib/types.ts`:

```ts
export type BottleMention = {
  name: string;
  description: string;
  reason: string;
};

export type MenuItemAnalysis = {
  name: string;
  style: string;
  taste: string;
  similarDrinks: string[];
  bottles: string[];
  confidence: number;
  aiGenerated: boolean;
};

export type MenuAnalysis = {
  summary: string;
  items: MenuItemAnalysis[];
  bottleMentions: BottleMention[];
  rawOcrText?: string;
};
```

### 4b — Update `menu-analysis.ts` and the API route to import from `types.ts`

Remove the duplicate type definitions from `menu-analysis.ts` and import from the shared file.

**Verify:**

- [ ] `npm run build` completes with no type errors
- [ ] API route response JSON matches the `MenuAnalysis` shape exactly

---

## Step 5 — Review and correction screen

**Why this step exists:** OCR is the most failure-prone step in the pipeline. Dim photos, stylized restaurant fonts, curved menu layouts, and handwriting all produce garbled text. If bad OCR text goes straight into the parser without a chance to correct it, the drink cards will show nonsense names and wrong tasting notes. The review screen pauses the flow after OCR returns and shows the raw extracted text in an editable textarea. The user can fix “Negroni Sbaqliato” → “Negroni Sbagliato” before clicking Analyze — the correction happens once and the results are right.

**Why skip the review screen for pasted text?** Pasted text is already human-verified. The review step is only useful when OCR could have made a mistake.

**What:** Show the raw OCR text before the final analysis is committed, so users can fix misreads before they corrupt the drink cards.

**Depends on:** Steps 2 to 4

### 5a — Add an intermediate state to the page

In `src/app/page.tsx`, add a `reviewing` state between uploading and displaying results:

```ts
type PageState = "idle" | "uploading" | "reviewing" | "done";
const [pageState, setPageState] = useState<PageState>("idle");
const [ocrText, setOcrText] = useState("");
```

### 5b — Show an editable OCR text area after upload

When the API returns raw OCR output, pause before running the analysis:

```tsx
{pageState === "reviewing" && (
  <section>
    <p>Review the extracted text. Edit any misread words before analyzing.</p>
    <textarea
      value={ocrText}
      onChange={(e) => setOcrText(e.target.value)}
      rows={20}
    />
    <button onClick={confirmAndAnalyze}>Looks good — analyze</button>
    <button onClick={reset}>Start over</button>
  </section>
)}
```

### 5c — Return raw OCR text from the API route

Add `rawOcrText` to the API response so the frontend can display it in the review step.

**Verify:**

- [ ] After uploading a photo, the OCR text is shown before drink cards appear
- [ ] Editing the OCR text and clicking analyze changes the output
- [ ] Passing clean pasted text skips the review step entirely

---

## Step 6 — Local persistence (no accounts)

**Why this step exists:** Without saving results, every browser refresh wipes the analysis. A user who scans a menu at a bar and wants to reference it the next day has to re-upload the photo. `localStorage` solves this with zero infrastructure — no database, no sign-in, no API calls.

**Why `localStorage` instead of a database?** A database requires authentication to associate records with a user, which requires sign-in, which we explicitly excluded from V1. `localStorage` is private to the browser and has no storage cost.

**Why cap at 10 entries?** `localStorage` has a ~5 MB limit per origin. One `MenuAnalysis` object is roughly 3–5 KB. At 10 entries that is ~50 KB — well within limits. Without a cap, a power user could silently fill the storage and trigger unpredictable data-loss errors.

**Why `savedAt: Date.now()`?** The timestamp lets the History screen display “scanned 3 days ago” and sort results by recency. Without it, the order is arbitrary insertion order.

**What:** Save the last N results in `localStorage` so users can return to a previous scan without losing work.

**Depends on:** Step 1

### 6a — Add a persistence helper

Create `src/lib/history.ts`:

```ts
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
```

### 6b — Call `saveResult` after a successful analysis

In the page submit handler, call `saveResult(analysis)` after setting state.

### 6c — Add a history drawer or section (optional for MVP)

Show the last 3 saved results as dismissible cards at the bottom of the page.

**Verify:**

- [ ] Analyze a menu, refresh the page, and the result is still visible from history
- [ ] History is capped at 10 entries and does not grow unbounded
- [ ] No network requests are made for history — it is entirely local

---

## Step 7 — Vercel deploy

**Why this step exists:** `npm run dev` only runs on your laptop. Vercel takes the same `npm run build` output and deploys it globally — HTTPS, CDN, and serverless function support for the API route, all with zero configuration for a Next.js project.

**Why add environment variables to the Vercel dashboard instead of committing them?** Your `.env.local` file lives only on your machine. The Vercel build runs on Vercel’s servers which have no access to your local filesystem. You add the variables in the Vercel dashboard so the production server can read them at runtime — API keys never touch a git commit.

**Why run a local production build before pushing?** Vercel builds are identical to `npm run build`. Catching type errors and missing imports locally takes seconds. Discovering them in a failed Vercel deploy takes 2–3 minutes and pollutes the deploy history.

**What:** Push to GitHub and import into Vercel for a live hosted URL.

**Depends on:** Steps 1 through 6

### 7a — Add environment variables

Ensure `.env.local` is in `.gitignore` (it is by default). Before deploying, add your production secrets to Vercel:

1. Go to https://vercel.com → your project → Settings → Environment Variables
2. Add each variable from `.env.local`:
   - `OPENAI_API_KEY` (if using OpenAI)
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (if using Google Vision)

### 7b — Run a final production build locally

```bash
npm run build
npm run start
# test at http://localhost:3000 against real menus before pushing
```

### 7c — Push to GitHub

```bash
git add -A
git commit -m "feat: spirit note MVP"
git push origin main
```

### 7d — Import into Vercel

1. Go to https://vercel.com/new
2. Select your GitHub repo
3. Leave the framework preset as **Next.js** (auto-detected)
4. Add environment variables from step 7a
5. Click **Deploy**

### 7e — Test the live URL

- [ ] Upload a real menu photo → drink cards appear
- [ ] Camera capture works on an iPhone or Android device
- [ ] Page loads in under 3 seconds on a mobile connection
- [ ] No runtime errors in the Vercel function logs

---

## Step 8 — Validation pass

**Why this step exists:** A passing build does not mean the app produces useful output. OCR accuracy on dim photos, hallucination risk on unusual drinks, and bottle-matching precision are all product risks that only surface on real menus. Running a structured test set before calling V1 done catches the failure modes that matter most.

**Why set thresholds before testing?** Without a target, “good enough” is subjective. Thresholds (e.g. drink extraction accuracy ≥ 0.85) give you a clear pass/fail signal and force you to fix real problems instead of shipping something that almost works.

**What:** Measure output quality against real menus before calling V1 done.

**Depends on:** Steps 2 to 7

### 8a — Collect a test set

Gather at least 10 menus:

| # | Type | Difficulty |
|---|---|---|
| 1–3 | Clean PDF | Easy |
| 4–7 | Phone photo, good light | Medium |
| 8–10 | Dim light, stylized type, angled shot | Hard |

### 8b — Score each output

For each menu, record:

| Metric | Formula | MVP threshold |
|---|---|---|
| Drink extraction accuracy | `correct names / actual names` | ≥ 0.85 |
| Bottle precision | `true mentions / predicted mentions` | ≥ 0.80 |
| Similar drink usefulness | Human score 1–5 | ≥ 3.5 |
| Taste note plausibility | Human score 1–5 | ≥ 3.5 |

### 8c — Fix the most common failure modes

Most likely failure points in priority order:

1. OCR fails on stylized or hand-lettered menus → add a retry with a different OCR mode or model fallback
2. Drink names are split across lines → improve the line-joining logic in the parser
3. Tasting notes are generic or hallucinated → add more cocktail profiles to the local catalog before reaching for the model
4. Bottle names are missed → expand the `bottleLibrary` array in `menu-analysis.ts`

---

## Environment variables reference

| Variable | Used for | How to get it |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini Flash OCR (Step 2) and AI tasting notes (Step 3) | Free at https://aistudio.google.com/app/apikey |

Create `.env.local` in the project root for local development. This file is already in `.gitignore` by default and will never be committed.

For Vercel production: add the same key in the Vercel dashboard under **Settings → Environment Variables**.

---

## Cost estimates (free-tier baseline)

| Provider | Free tier | After free tier |
|---|---|---|
| Vercel hosting | Unlimited hobby deploys | — |
| Gemini 2.0 Flash | 15 req/min, 1M tokens/day | ~$0.10/1M input tokens |
| Vercel Blob (optional, for file storage) | 500 MB | ~$0.023/GB |

For typical usage (~50 scans/day), the monthly cost after the free tier is under $2.

---

## Key decisions made so far

- **Input scope:** Photos, PDFs, and live camera capture
- **Bottle identification:** Text mentions only — no bottle image recognition in V1
- **User accounts:** None — anonymous and session-based only
- **Polish priority:** UI and UX quality is a first-class requirement, not an afterthought
- **OCR strategy:** Dedicated OCR step before model inference — not raw image prompting as the primary path
- **Persistence:** `localStorage` only — no database in V1
