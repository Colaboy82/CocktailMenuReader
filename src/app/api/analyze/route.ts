import { NextRequest, NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { analyzeMenuText } from "@/lib/menu-analysis";
import { createServiceClient } from "@/lib/supabase-server";
import { z } from "zod";
import { MenuAnalysis } from "@/lib/types";

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
      // Guard: Gemini is used for OCR only.
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
        // Gemini handles both images and PDFs natively via FilePart.
        model: google("gemini-2.5-flash"),
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
                text: "Extract cocktails from this menu. For each drink, output exactly one line in this format: DRINK NAME: ingredient1, ingredient2, ingredient3. The drink name is the title (bold or larger text). Ingredients follow below it. Ignore prices, dollar amounts, and section headers like 'Light & Playful' or 'Classics'. Never output ingredients as separate lines — always combine drink name and ingredients on a single line separated by a colon.",
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

    // Always enrich all drinks with AI-generated descriptions.
    const allDrinks = analysis.items;

    if (allDrinks.length > 0) {
      // ── Phase 1: Check global cocktail cache ──────────────────────────────
      const supabase = createServiceClient();
      const nameKeys = allDrinks.map((d) => d.name.toLowerCase().trim());

      let cachedMap: Record<string, { taste: string; style: string; strength: string; similar_drinks: string[] }> = {};

      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { data: cached } = await supabase
          .from("cocktail_cache")
          .select("name_key, taste, style, strength, similar_drinks")
          .in("name_key", nameKeys);

        if (cached) {
          for (const row of cached) {
            cachedMap[row.name_key] = row;
            // Increment hit count in background (don't await)
            supabase.from("cocktail_cache").update({ hit_count: supabase.rpc("increment", { x: 1 }) }).eq("name_key", row.name_key).then(() => {});
          }
        }
      }

      // Apply cached results immediately
      for (const drink of allDrinks) {
        const key = drink.name.toLowerCase().trim();
        const hit = cachedMap[key];
        if (hit) {
          drink.taste = hit.taste;
          drink.style = hit.style;
          drink.strength = hit.strength;
          drink.similarDrinks = hit.similar_drinks;
          drink.aiGenerated = true;
        }
      }

      // ── Phase 2: Enrich remaining drinks with Gemini ──────────────────────
      const needsEnrichment = allDrinks.filter((d) => !cachedMap[d.name.toLowerCase().trim()]);

      if (needsEnrichment.length > 0) {
        const { object } = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: z.object({
            drinks: z.array(z.object({
              name: z.string(),
              taste: z.string(),
              style: z.string(),
              strength: z.enum(["light", "medium", "strong"]),
              barSignificance: z.string().optional(),
              similarDrinks: z.array(z.string()).max(3),
            })),
          }),
          prompt: `You are an expert sommelier and bartender helping someone unfamiliar with cocktails understand what they're ordering.

For each cocktail listed below, provide:
1. taste: Exactly 2 sentences in plain, conversational English. No jargon. The first sentence describes the overall flavor character (e.g. "Its flavor is balanced and smooth, blending the warmth of whiskey with a touch of sweetness and aromatic bitters."). The second describes what you taste through the sip (e.g. "You'll notice hints of caramel and vanilla up front, with a subtle spice and a clean, lingering finish."). Do NOT use comma-separated adjective lists like "bright, zesty, fresh" — write full sentences.
2. style: A short label with spirit base and vibe (e.g. "Gin-based · light & refreshing")
3. strength: "light", "medium", or "strong"
4. barSignificance: If the menu text suggests this is a house specialty, signature, or made in-house, describe in 1-2 words. Leave empty otherwise.
5. similarDrinks: 2-3 drinks they might already know

Menu text:
${rawOcrText}

Cocktails:
${needsEnrichment.map((d) => `- ${d.name}${d.rawLine && d.rawLine !== d.name ? ` (menu: "${d.rawLine}")` : ""}`).join("\n")}`,
        });

        const cacheInserts: Array<{ name: string; name_key: string; taste: string; style: string; strength: string; similar_drinks: string[] }> = [];

        for (const aiDrink of object.drinks) {
          const match = analysis.items.find(
            (item) => item.name.toLowerCase().trim() === aiDrink.name.toLowerCase().trim()
          );
          if (match) {
            match.taste = aiDrink.taste;
            match.style = aiDrink.style;
            match.strength = aiDrink.strength;
            if (aiDrink.barSignificance) match.barSignificance = aiDrink.barSignificance;
            match.similarDrinks = aiDrink.similarDrinks;
            match.aiGenerated = true;

            // Queue for cache write
            cacheInserts.push({
              name: match.name,
              name_key: match.name.toLowerCase().trim(),
              taste: aiDrink.taste,
              style: aiDrink.style,
              strength: aiDrink.strength,
              similar_drinks: aiDrink.similarDrinks,
            });
          }
        }

        // Write new drinks to cache (upsert — don't fail if duplicate)
        if (cacheInserts.length > 0 && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          supabase.from("cocktail_cache").upsert(cacheInserts, { onConflict: "name_key" }).then(() => {});
        }
      }
    }


    // Spread the analysis fields into the response and add `rawOcrText`.
    // The raw OCR text is included so the Step 5 review screen can show
    // what the model actually read before the user confirms the analysis.
    return NextResponse.json({ ...analysis, rawOcrText });
  } catch (err) {
    console.error("[/api/analyze]", err);
    const message = err instanceof Error ? err.message : "Unexpected error";

    // Detect quota exhaustion and return a user-friendly message.
    if (message.includes("429") || message.includes("quota") || message.includes("Too Many Requests")) {
      return NextResponse.json(
        { error: "OCR limit reached for today. Paste the menu text manually instead — tap the 'Paste text' option on the scan screen." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}