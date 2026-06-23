import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { sauRoot } from "@/lib/paths";

export const runtime = "nodejs";

const platforms = [
  { id: "xiaohongshu", label: "小红书" },
  { id: "douyin", label: "抖音" },
  { id: "kuaishou", label: "快手" },
];

function parseCookieFile(fileName: string) {
  const match = fileName.match(/^(.+?)_(.+?)\.json$/);
  if (!match) return null;

  const [, platform, account] = match;
  if (!platforms.some((item) => item.id === platform)) return null;

  return { platform, account };
}

export async function GET() {
  const cookiesDir = path.join(sauRoot, "cookies");
  const entries = await fs.readdir(cookiesDir, { withFileTypes: true }).catch(() => []);

  const cookieFiles = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const parsed = parseCookieFile(entry.name);
        if (!parsed) return null;

        const fullPath = path.join(cookiesDir, entry.name);
        const stats = await fs.stat(fullPath).catch(() => null);
        if (!stats) return null;

        return {
          ...parsed,
          fileName: entry.name,
          updatedAt: stats.mtime.toISOString(),
        };
      }),
  );

  const accounts = platforms.map((platform) => {
    const files = cookieFiles
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => item.platform === platform.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return {
      ...platform,
      loggedIn: files.length > 0,
      accounts: files.map((item) => ({
        account: item.account,
        fileName: item.fileName,
        updatedAt: item.updatedAt,
      })),
    };
  });

  return NextResponse.json({
    success: true,
    cookiesDir,
    accounts,
  });
}
