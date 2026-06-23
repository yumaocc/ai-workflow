import path from "node:path";

export const projectRoot = process.cwd();

export const sauRoot =
  process.env.SAU_ROOT ||
  path.resolve(projectRoot, "..", "social-auto-upload");

export const sauBin =
  process.env.SAU_BIN || path.join(sauRoot, ".venv", "bin", "sau");

export const codexBin = process.env.CODEX_BIN || "codex";
