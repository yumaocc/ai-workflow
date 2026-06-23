import path from "node:path";

export const projectRoot = process.cwd();

export const sauRoot =
  process.env.SAU_ROOT ||
  path.resolve(projectRoot, "..", "social-auto-upload");

export const sauBin =
  process.env.SAU_BIN || path.join(sauRoot, ".venv", "bin", "sau");

export const codexBin = process.env.CODEX_BIN || "codex";

export const gptImageSkillRoot =
  process.env.GPT_IMAGE_2_SKILL_ROOT ||
  "/Users/q/.codex/skills/gpt-image-2";

export const gptImageCheckModeScript = path.join(gptImageSkillRoot, "scripts", "check-mode.js");

export const gptImageGenerateScript = path.join(gptImageSkillRoot, "scripts", "generate.js");

export const gptImageOutputRoot = path.join(projectRoot, "garden-gpt-image-2");

export const gptImageDirectory = path.join(gptImageOutputRoot, "image");
