import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId, scan, barName } = await req.json();
    if (!userId || !scan) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_scans")
      .insert({
        user_id: userId,
        summary: scan.summary,
        bar_name: barName ?? null,
        raw_ocr_text: scan.rawOcrText ?? "",
        items: scan.items,
        bottle_mentions: scan.bottleMentions ?? [],
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { scanId, barName } = await req.json();
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("user_scans")
      .update({ bar_name: barName })
      .eq("id", scanId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/scans PATCH] Error:", err);
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
      .from("user_scans")
      .select("id, scanned_at, summary, bar_name, raw_ocr_text, items, bottle_mentions")
      .eq("user_id", userId)
      .order("scanned_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[/api/scans GET] Error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { scanId } = await req.json();
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("user_scans")
      .delete()
      .eq("id", scanId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/scans DELETE] Error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
