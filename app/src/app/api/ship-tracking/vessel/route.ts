import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imo = searchParams.get("imo");

  if (!imo) {
    return NextResponse.json(
      { error: "IMO number is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_MYSHIPTRACKING_API_KEY;
  console.log("API Key:", apiKey);

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://api.myshiptracking.com/api/v2/vessel?imo=${imo}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
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
          error instanceof Error
            ? error.message
            : "Failed to fetch vessel data",
      },
      { status: 500 },
    );
  }
}
