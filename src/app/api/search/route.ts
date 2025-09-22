import { NextResponse } from "next/server";
import { exploreNearby } from "@/app/actions"; // Assuming exploreNearby is in actions.ts
import type { ExploreInput } from "@/lib/types";

// Extended interface for paginated search with quality filtering
interface PaginatedExploreInput extends ExploreInput {
  offset?: number;
  limit?: number;
  loadMore?: boolean; // Flag to indicate if this is a "load more" request
  qualityFilter?: 'all' | 'good' | 'excellent'; // Quality filtering
}

export async function POST(req: Request) {
  try {
    // The request body is expected to contain latitude, longitude, and optionally pagination params
    const input: PaginatedExploreInput = await req.json();

    // Basic validation for required fields
    if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }

    // Validate pagination parameters - support unlimited results
    const offset = input.offset || 0;
    const limit = input.limit || 10000; // Default to very high limit for maximum results
    const loadMore = input.loadMore || false;
    const qualityFilter = input.qualityFilter || 'good'; // Default to good quality filter

    console.log(`[SearchAPI] ${loadMore ? 'Loading more' : 'Initial search'}: offset=${offset}, limit=${limit}, quality=${qualityFilter}`);

    // Call the exploreNearby function with pagination and quality filtering
    const result = await exploreNearby({ 
      ...input, 
      offset, 
      limit, 
      loadMore,
      qualityFilter
    });

    if (result.success) {
      // Return paginated response with metadata
      return NextResponse.json({
        ...result.data,
        pagination: {
          offset,
          limit,
          hasMore: result.data.places?.length === limit, // Assume more data if we got a full page
          total: result.data.places?.length + offset, // Estimated total
        }
      });
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
