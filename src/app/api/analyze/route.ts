import { NextRequest, NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";     // Gemini: OCR + AI enrichment
import { analyzeMenuText } from "@/lib/menu-analysis";
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

    // Only enrich drinks with low confidence (< 0.7).
    // This reduces API calls significantly while maintaining quality for known drinks.
    const unknownDrinks = analysis.items.filter((item) => item.confidence < 0.7);

    if (unknownDrinks.length > 0) {
    const { object } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: z.object({
        drinks: z.array(z.object({
            name: z.string(),
            taste: z.string(),
            style: z.string(),
            strength: z.enum(["light", "medium", "strong"]),
            similarDrinks: z.array(z.string()).max(3),
        })),
        }),
        prompt: `You are an expert sommelier, bartender, and spirits specialist.

For each cocktail listed below, provide:
1. A taste profile with TWO parts:
   a. Specific flavor notes with intensity scale (1=subtle, 2=moderate, 3=strong). Format: "Citrus (2), Tropical (3), Herbal (1)"
   b. A clear description in plain English (2-3 sentences, no jargon) — be conversational and approachable, as if explaining to someone who doesn't know cocktails
   Combine these into one taste field: "Flavor Notes: [list]. [Description sentences]"
2. A short style label that includes the spirit base and strength estimate (e.g. "Gin-based · light & refreshing", "Rye whiskey · spirit-forward, medium-strong")
3. Strength level: one of "light", "medium", or "strong" based on alcohol content and intensity
4. 2-3 similar drinks the guest might already know

Cocktails to describe:
${unknownDrinks.map((d) => d.name).join("\n")}`,
    });

    for (const aiDrink of object.drinks) {
        const match = analysis.items.find((item) => item.name === aiDrink.name);
        if (match) {
        match.taste = aiDrink.taste;
        match.style = aiDrink.style;
        match.strength = aiDrink.strength;
        match.similarDrinks = aiDrink.similarDrinks;
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