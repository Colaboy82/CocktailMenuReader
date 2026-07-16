import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";           // AI SDK core: sends a prompt, returns text
import { google } from "@ai-sdk/google";     // Gemini provider: reads GOOGLE_GENERATIVE_AI_API_KEY
import { analyzeMenuText } from "@/lib/menu-analysis"; // our local parser from Step 1
import { generateObject } from "ai";  // structured output: validates response against a Zod schema
import { z } from "zod";              // schema definition and validation library
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
        // `google("gemini-1.5-flash-latest")` creates a model handle.
        // The provider reads GOOGLE_GENERATIVE_AI_API_KEY from process.env automatically.
        model: google("gemini-1.5-flash-latest"),
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

    // Only enrich drinks the catalog didn't recognize confidently.
    // confidence < 0.9 means the parser fell back to keyword matching, so the
    // tasting note is generic and worth replacing with a real AI-generated one.
    const unknownDrinks = analysis.items.filter((item) => item.confidence < 0.9);

    if (unknownDrinks.length > 0) {
    const { object } = await generateObject({
        model: google("gemini-1.5-flash-latest"),

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