import { NextResponse } from "next/server";

const platforms = new Set(["xiaohongshu", "douyin", "kuaishou", "bilibili", "tencent", "youtube"]);
const ansiPattern =
  /[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
const orphanAnsiPattern = /\[(?:\d{1,3})(?:;\d{1,3})*m/g;
const qrPathPattern = /(?:\/[^\s"'<>|]+qrcode[^\s"'<>|]*\.png)/gi;
const terminalArtPattern = /[█▀▄▌▐░▒▓■□◆◇●○╔╗╚╝║═╭╮╰╯│─┌┐└┘├┤┬┴┼]/g;

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function requireText(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePlatform(value: unknown) {
  const platform = requireText(value, "platform");
  if (!platforms.has(platform)) {
    throw new Error(`unsupported platform: ${platform}`);
  }
  return platform;
}

export function parseStringArray(value: unknown, name: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function stripAnsi(value: string) {
  return value.replace(ansiPattern, "").replace(orphanAnsiPattern, "");
}

function isTerminalArtLine(line: string) {
  const compact = line.replace(/\s/g, "");
  if (compact.length < 8) return false;

  const matches = compact.match(terminalArtPattern)?.length ?? 0;
  return matches >= 8 && matches / compact.length > 0.35;
}

function cleanCommandOutput(value: string) {
  const withoutAnsi = stripAnsi(value).replace(/\r/g, "");
  const lines = withoutAnsi
    .split("\n")
    .filter((line) => !isTerminalArtLine(line))
    .map((line) => line.trimEnd());

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractQrImagePath(...values: string[]) {
  for (const value of values) {
    const [match] = value.match(qrPathPattern) ?? [];
    if (match) return match;
  }
  return "";
}

function firstUsefulLine(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && line.length < 180);
}

function buildSummary(result: {
  code: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  cleanStdout: string;
  cleanStderr: string;
  qrImagePath: string;
}) {
  if (result.qrImagePath) {
    return "已生成登录二维码。请在下方查看二维码图片路径，用手机扫码后等待命令完成。";
  }

  if (result.code === 0) {
    return firstUsefulLine(result.cleanStdout) || `命令执行完成，用时 ${result.durationMs}ms。`;
  }

  const exitLabel = result.signal ? `信号 ${result.signal}` : `退出码 ${result.code ?? "unknown"}`;
  return firstUsefulLine(result.cleanStderr) || firstUsefulLine(result.cleanStdout) || `命令执行失败，${exitLabel}。`;
}

export function commandPayload(result: {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}) {
  const cleanStdout = cleanCommandOutput(result.stdout);
  const cleanStderr = cleanCommandOutput(result.stderr);
  const qrImagePath = extractQrImagePath(cleanStdout, cleanStderr, result.stdout, result.stderr);
  const summary = buildSummary({
    code: result.code,
    signal: result.signal,
    durationMs: result.durationMs,
    cleanStdout,
    cleanStderr,
    qrImagePath,
  });

  return {
    success: result.code === 0,
    ...result,
    summary,
    cleanStdout,
    cleanStderr,
    qrImagePath,
  };
}

export function commandResponse(result: {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}) {
  return NextResponse.json(commandPayload(result));
}
