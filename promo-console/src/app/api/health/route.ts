import fs from "node:fs";
import { NextResponse } from "next/server";
import { codexBin, sauBin, sauRoot } from "@/lib/paths";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    success: true,
    sauRoot,
    sauBin,
    sauExists: fs.existsSync(sauBin),
    codexBin,
  });
}
