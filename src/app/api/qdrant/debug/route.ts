import { NextResponse } from "next/server";
import { qdrantClient } from "@/lib/qdrant";

export async function GET() {
  try {
    const collection = process.env.QDRANT_COLLECTION!;
    const info = await qdrantClient.getCollection(collection);
    const sample = await qdrantClient.scroll(collection, { limit: 3, with_payload: true });
    return NextResponse.json({ ok: true, info, sample });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, stack: e.stack }, { status: 500 });
  }
}
