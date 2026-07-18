import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId, cocktailName, stars, scanId, style, taste, strength, similarDrinks, bottles, barName } = await req.json();
    if (!userId || !cocktailName || !stars) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("user_ratings").upsert(
      {
        user_id: userId,
        cocktail_name: cocktailName,
        stars,
        scan_id: scanId ?? null,
        rated_at: new Date().toISOString(),
        style: style ?? null,
        taste: taste ?? null,
        strength: strength ?? null,
        similar_drinks: similarDrinks ?? null,
        bottles: bottles ?? null,
        bar_name: barName ?? null,
      },
      { onConflict: "user_id,cocktail_name" },
    );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/ratings POST] Error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_ratings")
      .select(`
        cocktail_name,
        stars,
        rated_at,
        scan_id,
        style,
        taste,
        strength,
        similar_drinks,
        bottles,
        bar_name,
        user_scans ( bar_name, items )
      `)
      .eq("user_id", userId)
      .order("rated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[/api/ratings GET] Error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
