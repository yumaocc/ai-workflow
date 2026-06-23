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
import fs from "node:fs";

export const runtime = "nodejs";

const schedulePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

function assertImageFiles(images: string[]) {
  for (const image of images) {
    if (!fs.existsSync(image)) {
      throw new Error(`image file not found: ${image}`);
    }
    const stat = fs.statSync(image);
    if (!stat.isFile()) {
      throw new Error(`image path is not a file: ${image}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = parsePlatform(body.platform);
    const account = requireText(body.account, "account");
    const title = requireText(body.title, "title");
    const note = optionalText(body.note);
    const images = parseStringArray(body.images, "images");
    const tags = parseStringArray(body.tags ?? [], "tags");
    const schedule = optionalText(body.schedule);
    const bgm = optionalText(body.bgm);
    const headed = body.headed !== false;

    if (!["xiaohongshu", "douyin", "kuaishou"].includes(platform)) {
      throw new Error("note publishing currently supports xiaohongshu, douyin, and kuaishou");
    }
    if (!images.length) {
      throw new Error("at least one image is required");
    }
    if (schedule && !schedulePattern.test(schedule)) {
      throw new Error("schedule must use format YYYY-MM-DD HH:mm");
    }

    assertImageFiles(images);

    const args = [
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
      headed ? "--headed" : "--headless",
    ];

    if (schedule) {
      args.push("--schedule", schedule);
    }
    if (platform === "douyin" && bgm) {
      args.push("--bgm", bgm);
    }

    const result = await runCommand(
      sauBin,
      args,
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
