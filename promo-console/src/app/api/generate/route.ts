import { badRequest, commandResponse, optionalText, requireText } from "@/lib/api";
import { codexBin, projectRoot } from "@/lib/paths";
import { runCommand } from "@/lib/run-command";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const brief = requireText(body.brief, "brief");
    const platform = optionalText(body.platform) || "xiaohongshu";
    const prompt = [
      "你是一个社媒推广内容生成助手。",
      "请根据产品描述生成可编辑的推广内容。",
      "只输出 JSON，不要输出 Markdown，不要解释。",
      "JSON 格式必须是：",
      '{"title":"...","note":"...","tags":["..."],"angle":"...","safety_notes":["..."]}',
      "要求：避免夸大承诺，避免绕过限制、破解、无限制、官方平替等高风险表达。",
      `目标平台：${platform}`,
      `产品描述：${brief}`,
    ].join("\n");

    const result = await runCommand(codexBin, ["exec", prompt], {
      cwd: projectRoot,
      timeoutMs: 5 * 60_000,
    });

    return commandResponse(result);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid request");
  }
}
