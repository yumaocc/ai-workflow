import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { badRequest, commandPayload, optionalText, requireText } from "@/lib/api";
import {
  codexBin,
  gptImageCheckModeScript,
  gptImageDirectory,
  gptImageGenerateScript,
  projectRoot,
} from "@/lib/paths";
import { runCommand } from "@/lib/run-command";

export const runtime = "nodejs";

type GeneratedContent = {
  title?: string;
  note?: string;
  tags?: string[];
  angle?: string;
  image_required?: boolean;
  image_prompt?: string;
  image_policy?: string;
  image_generated?: boolean;
  image_path?: string;
  image_preview_url?: string;
  image_prompt_path?: string;
  image_generation_error?: string;
  image_generation_mode?: string;
  safety_notes?: string[];
};

const imageEnvKeys = new Set([
  "ENABLE_GARDEN_IMAGEGEN",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_IMAGE_MODEL",
]);

async function readEnvFile(filePath: string) {
  try {
    const text = await readFile(filePath, "utf8");
    const values: Record<string, string> = {};

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const pivot = trimmed.indexOf("=");
      if (pivot === -1) continue;

      const key = trimmed.slice(0, pivot).trim();
      if (!imageEnvKeys.has(key)) continue;

      let value = trimmed.slice(pivot + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }

    return values;
  } catch {
    return {};
  }
}

async function buildImageGenerationEnv() {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const files = [
    path.join(homedir(), ".gateway.env"),
    path.join(projectRoot, ".gateway.env"),
    path.join(projectRoot, ".env"),
  ];

  for (const filePath of files) {
    Object.assign(env, await readEnvFile(filePath));
  }

  env.ENABLE_GARDEN_IMAGEGEN = env.ENABLE_GARDEN_IMAGEGEN || "1";
  env.OPENAI_IMAGE_MODEL = env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  return env;
}

function parseJsonBlock(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return JSON.parse(raw.slice(start, end + 1)) as GeneratedContent;
}

function buildImagePrompt(content: GeneratedContent, platform: string, brief: string) {
  const title = content.title || "API 中转站推广";
  const angle = content.angle || "面向 AI 开发者的稳定 API 接入方案";
  const basePrompt = content.image_prompt || `${title}，${angle}`;

  return JSON.stringify(
    {
      type: "社媒推广图文封面 / 短视频封面样机",
      goal: "生成一张可用于小红书、抖音或快手推广的真实社媒封面图，突出产品价值并吸引开发者点击。",
      platform,
      aspect_ratio: "1:1",
      source_brief: brief,
      background: {
        color_palette: "清爽浅色科技感背景，搭配蓝色、绿色和少量橙色强调色，避免单一深蓝或紫色调",
        texture: "细微网格、柔和噪点、轻量代码窗口元素",
      },
      main_visual: {
        subject: "抽象但真实可信的 API 网关控制台、连接线、模型节点和开发者工作流",
        position: "画面中心偏右，左侧留给标题",
      },
      title_block: {
        main_title: title,
        sub_title: angle,
        bullet_points: Array.isArray(content.tags) ? content.tags.slice(0, 3) : [],
      },
      style: {
        rendering: "像真实社媒封面或产品推广海报，不像占位图，不像通用插画",
        typography: "中文标题清晰、层级明确、不要出现乱码",
        contrast: "标题和主体在手机屏幕上清晰可读",
      },
      constraints: {
        must_keep: [
          "必须体现 API、AI 模型接入、开发者工具或稳定服务",
          "必须有明确标题区域和产品视觉区域",
          "画面可直接用于图文发布首图",
        ],
        avoid: [
          "不要使用真实平台 logo",
          "不要宣称官方、无限制、破解、绕过风控",
          "不要出现随机英文长段落或乱码文字",
        ],
      },
      user_image_prompt: basePrompt,
    },
    null,
    2,
  );
}

function toPreviewUrl(imagePath: string) {
  const relativePath = path.relative(gptImageDirectory, imagePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return "";
  return `/api/assets/image?path=${encodeURIComponent(relativePath)}`;
}

async function generateImageIfNeeded(content: GeneratedContent, platform: string, brief: string) {
  if (!content.image_required) {
    return content;
  }

  const imageEnv = await buildImageGenerationEnv();
  const modeResult = await runCommand("node", [gptImageCheckModeScript, "--json"], {
    cwd: projectRoot,
    timeoutMs: 30_000,
    env: imageEnv,
  });

  const modeOutput = modeResult.stdout || modeResult.stderr;
  const mode = modeOutput ? JSON.parse(modeOutput) : null;
  const modeName = typeof mode?.mode === "string" ? mode.mode : "unknown";

  if (modeResult.code !== 0 || modeName !== "A") {
    return {
      ...content,
      image_generated: false,
      image_generation_mode: modeName,
      image_generation_error:
        typeof mode?.summary === "string" ? mode.summary : modeResult.stderr || "gpt-image-2 当前不是 Mode A，无法在本机直接出图。",
    };
  }

  const finalPrompt = buildImagePrompt(content, platform, brief);
  const imageResult = await runCommand(
    "node",
    [gptImageGenerateScript, "--prompt", finalPrompt, "--size", "1024x1024", "--quality", "high", "--json"],
    {
      cwd: projectRoot,
      timeoutMs: 10 * 60_000,
      env: imageEnv,
    },
  );

  if (imageResult.code !== 0) {
    return {
      ...content,
      image_generated: false,
      image_generation_mode: modeName,
      image_generation_error: imageResult.stderr || imageResult.stdout || "gpt-image-2 图片生成失败。",
    };
  }

  const imageOutput = JSON.parse(imageResult.stdout);
  const savedImage = typeof imageOutput.savedImage === "string" ? imageOutput.savedImage : "";
  const savedPrompt = typeof imageOutput.savedPrompt === "string" ? imageOutput.savedPrompt : "";

  return {
    ...content,
    image_policy: "gpt-image-2",
    image_generated: Boolean(savedImage),
    image_generation_mode: modeName,
    image_path: savedImage,
    image_preview_url: savedImage ? toPreviewUrl(savedImage) : "",
    image_prompt_path: savedPrompt,
  };
}

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
      '{"title":"...","note":"...","tags":["..."],"angle":"...","image_required":true,"image_prompt":"...","image_policy":"gpt-image-2","safety_notes":["..."]}',
      "如果这条内容适合配图、封面、海报或产品视觉，image_required 必须为 true，并生成可直接交给 gpt-image-2 的中文图片提示词。",
      "如果完全不需要图片，image_required 可以为 false，image_prompt 为空字符串，但 image_policy 仍必须是 gpt-image-2。",
      "所有图片生成都必须使用 gpt-image-2，不要建议使用网络图、图库图、占位图或其它图像模型。",
      "要求：避免夸大承诺，避免绕过限制、破解、无限制、官方平替等高风险表达。",
      `目标平台：${platform}`,
      `产品描述：${brief}`,
    ].join("\n");

    const result = await runCommand(codexBin, ["exec", prompt], {
      cwd: projectRoot,
      timeoutMs: 5 * 60_000,
    });

    const payload = commandPayload(result);
    const generatedOutput = payload.cleanStdout || payload.stdout;

    if (!payload.success || !generatedOutput) {
      return Response.json(payload);
    }

    const content = parseJsonBlock(generatedOutput);
    if (!content) {
      return Response.json(payload);
    }

    const withImage = await generateImageIfNeeded(content, platform, brief);
    const enhancedOutput = JSON.stringify(withImage, null, 2);

    return Response.json({
      ...payload,
      stdout: enhancedOutput,
      cleanStdout: enhancedOutput,
      summary: withImage.image_generated
        ? "已生成推广文案，并已调用 gpt-image-2 生成图片。"
        : withImage.image_generation_error
          ? `已生成推广文案，但图片生成失败：${withImage.image_generation_error}`
          : payload.summary,
    });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid request");
  }
}
