import { spawn } from "node:child_process";

export type CommandResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<CommandResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timer = options.timeoutMs
      ? setTimeout(() => {
          child.kill("SIGTERM");
          finish({
            code: null,
            signal: "SIGTERM",
            stdout,
            stderr: `${stderr}\nCommand timed out after ${options.timeoutMs}ms`.trim(),
            durationMs: Date.now() - startedAt,
          });
        }, options.timeoutMs)
      : null;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      finish({
        code: null,
        signal: null,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        durationMs: Date.now() - startedAt,
      });
    });

    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      finish({
        code,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}
