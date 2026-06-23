import { badRequest, commandResponse, parsePlatform, requireText } from "@/lib/api";
import { sauBin, sauRoot } from "@/lib/paths";
import { runCommand } from "@/lib/run-command";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = parsePlatform(body.platform);
    const account = requireText(body.account, "account");
    const result = await runCommand(sauBin, [platform, "check", "--account", account], {
      cwd: sauRoot,
      timeoutMs: 90_000,
    });

    return commandResponse(result);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid request");
  }
}
