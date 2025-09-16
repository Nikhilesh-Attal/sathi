import { NextResponse } from "next/server";
import { exploreNearby } from "@/app/actions"; // Assuming exploreNearby is in actions.ts
import type { ExploreInput } from "@/lib/types";

export async function POST(req: Request) {
  try {
    // The request body is expected to contain latitude, longitude, and optionally radiusMeters
    const input: ExploreInput = await req.json();

    // Basic validation for required fields
    if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }

    // Call the exploreNearby function
    const result = await exploreNearby(input);

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      // Handle errors from exploreNearby
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("❌ Search API error:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

// Handle GET requests to prevent 405 errors
export async function GET(req: Request) {
  return NextResponse.json({ 
    error: "Method not allowed. Use POST with latitude and longitude in request body." 
  }, { status: 405 });
}
