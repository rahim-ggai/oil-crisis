import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Vessel name is required" },
      { status: 400 },
    );
  }

  if (name.length < 3) {
    return NextResponse.json(
      { error: "Name must be at least 3 characters long" },
      { status: 400 },
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_MYSHIPTRACKING_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://api.myshiptracking.com/api/v2/vessel/search?name=${encodeURIComponent(name)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `API Error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to search vessels",
      },
      { status: 500 },
    );
  }
}
