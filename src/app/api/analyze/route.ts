import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";           // AI SDK core: sends a prompt, returns text
import { groq } from "@ai-sdk/groq";        // Groq provider: reads GROQ_API_KEY
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
      // return a readable 503 "Service Unavailable" instead of a cryptic 401 from Groq.
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(
          { error: "Add GROQ_API_KEY to .env.local." },
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
        // `groq("mixtral-8x7b-32768")` uses Groq's fast inference.
        // The provider reads GROQ_API_KEY from process.env automatically.
        model: groq("mixtral-8x7b-32768"),
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
                text: "Extract menu text. Preserve line breaks.",
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
        model: groq("mixtral-8x7b-32768"),

        // The schema is the contract between us and the model.
        // `generateObject` validates the response against this shape.
        // If the model returns a wrong type or missing field, the SDK retries up to 3 times.
        schema: z.object({
        drinks: z.array(z.object({
            name: z.string(),
            taste: z.string(),                    // two-sentence tasting note
            similarDrinks: z.array(z.string()).max(2),   // two similar drinks
        })),
        }),

        prompt: `For each cocktail, write a two-sentence tasting note and suggest two similar drinks.

    Cocktails:
    ${unknownDrinks.map((d) => d.name).join(", ")}`,
    });

    // Merge AI-generated notes back into the analysis items.
    for (const aiDrink of object.drinks) {
        const match = analysis.items.find((item) => item.name === aiDrink.name);
        if (match) {
        match.taste = aiDrink.taste;
        match.similarDrinks = aiDrink.similarDrinks;
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