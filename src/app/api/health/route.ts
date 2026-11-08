import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "chicken-factor-online-ordering",
    phase: 1,
  });
}
