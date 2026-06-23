import {
  badRequest,
  commandResponse,
  optionalText,
  parsePlatform,
  parseStringArray,
  requireText,
} from "@/lib/api";
import { sauBin, sauRoot } from "@/lib/paths";
import { runCommand } from "@/lib/run-command";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = parsePlatform(body.platform);
    const account = requireText(body.account, "account");
    const title = requireText(body.title, "title");
    const note = optionalText(body.note);
    const images = parseStringArray(body.images, "images");
    const tags = parseStringArray(body.tags ?? [], "tags");

    if (!["xiaohongshu", "douyin", "kuaishou"].includes(platform)) {
      throw new Error("note publishing currently supports xiaohongshu, douyin, and kuaishou");
    }
    if (!images.length) {
      throw new Error("at least one image is required");
    }

    const result = await runCommand(
      sauBin,
      [
        platform,
        "upload-note",
        "--account",
        account,
        "--images",
        ...images,
        "--title",
        title,
        "--note",
        note,
        "--tags",
        tags.join(","),
      ],
      {
        cwd: sauRoot,
        timeoutMs: 20 * 60_000,
      },
    );

    return commandResponse(result);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid request");
  }
}
