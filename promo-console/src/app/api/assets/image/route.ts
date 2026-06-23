import { readFile } from "node:fs/promises";
import path from "node:path";
import { gptImageDirectory } from "@/lib/paths";

export const runtime = "nodejs";

function contentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path") || "";
  const filePath = path.resolve(gptImageDirectory, rawPath);
  const relativePath = path.relative(gptImageDirectory, filePath);

  if (!rawPath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return Response.json({ success: false, error: "Invalid image path" }, { status: 400 });
  }

  try {
    const bytes = await readFile(filePath);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ success: false, error: "Image not found" }, { status: 404 });
  }
}
