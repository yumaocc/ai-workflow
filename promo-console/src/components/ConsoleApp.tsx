"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Input,
  TextArea,
} from "@heroui/react";

type CommandResult = {
  success: boolean;
  stdout?: string;
  stderr?: string;
  summary?: string;
  cleanStdout?: string;
  cleanStderr?: string;
  qrImagePath?: string;
  durationMs?: number;
  error?: string;
  sauBin?: string;
  sauExists?: boolean;
};

type ConsoleAppProps = {
  mode?: "home" | "accounts" | "generate";
};

const platforms = [
  { id: "xiaohongshu", label: "小红书" },
  { id: "douyin", label: "抖音" },
  { id: "kuaishou", label: "快手" },
];

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as CommandResult;
}

function outputText(result: CommandResult | null) {
  if (!result) return "还没有执行记录。";
  return [
    result.error ? `error:\n${result.error}` : "",
    result.stdout ? `stdout:\n${result.stdout}` : "",
    result.stderr ? `stderr:\n${result.stderr}` : "",
    result.durationMs ? `duration: ${result.durationMs}ms` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function cleanOutputText(result: CommandResult | null) {
  if (!result) return "";
  return [
    result.cleanStdout ? `stdout\n${result.cleanStdout}` : "",
    result.cleanStderr ? `stderr\n${result.cleanStderr}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseJsonBlock(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return JSON.parse(raw.slice(start, end + 1)) as {
    title?: string;
    note?: string;
    tags?: string[];
  };
}

export default function ConsoleApp({ mode = "home" }: ConsoleAppProps) {
  const [platform, setPlatform] = useState("xiaohongshu");
  const [account, setAccount] = useState("main");
  const [brief, setBrief] = useState(
    "推广一个稳定的 API 中转站，支持 OpenAI、Claude、Gemini，面向 AI 开发者和工具开发者。",
  );
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("AI工具,开发者,API");
  const [images, setImages] = useState("");
  const [health, setHealth] = useState<CommandResult | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [busyAction, setBusyAction] = useState("");

  const showAccounts = mode === "home" || mode === "accounts";
  const showGenerate = mode === "home" || mode === "generate";
  const showPublish = mode === "home";

  const imageList = useMemo(
    () =>
      images
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [images],
  );

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch((error) => setHealth({ success: false, error: error.message }));
  }, []);

  const run = async (label: string, action: () => Promise<CommandResult>) => {
    setBusyAction(label);
    setLastResult(null);
    try {
      const result = await action();
      setLastResult(result);
    } catch (error) {
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusyAction("");
    }
  };

  const applyGeneratedJson = () => {
    const generatedOutput = lastResult?.cleanStdout || lastResult?.stdout;
    if (!generatedOutput) return;
    try {
      const data = parseJsonBlock(generatedOutput);
      if (!data) return;
      if (data.title) setTitle(data.title);
      if (data.note) setNote(data.note);
      if (Array.isArray(data.tags)) setTags(data.tags.join(","));
    } catch {
      return;
    }
  };

  return (
    <main className="console-page">
      <header className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">Local Promo Console</p>
          <h1>AI 推广工作台</h1>
          <p>
            用 Codex 生成图文内容，用 social-auto-upload 执行账号登录和发布。所有动作都在本机运行。
          </p>
        </div>
        <div className="hero-actions">
          <Chip color={health?.sauExists ? "success" : "danger"} variant="soft">
            {health?.sauExists ? "sau 已就绪" : "sau 未找到"}
          </Chip>
          <Chip variant="soft">{busyAction ? `运行中：${busyAction}` : "空闲"}</Chip>
        </div>
      </header>

      {lastResult ? (
        <div className={lastResult.success ? "result-banner result-banner--success" : "result-banner result-banner--error"}>
          <strong>{lastResult.success ? "执行成功" : "执行失败"}</strong>
          <span>{lastResult.summary || lastResult.error || "查看下方日志获取详情。"}</span>
        </div>
      ) : null}

      <nav className="link-strip" aria-label="页面导航">
        <Link href="/">
          <Button variant={mode === "home" ? "primary" : "secondary"} size="sm">
            概览
          </Button>
        </Link>
        <Link href="/accounts">
          <Button variant={mode === "accounts" ? "primary" : "secondary"} size="sm">
            账号登录
          </Button>
        </Link>
        <Link href="/generate">
          <Button variant={mode === "generate" ? "primary" : "secondary"} size="sm">
            Codex 图文
          </Button>
        </Link>
      </nav>

      <section className="content-grid">
        {showAccounts ? (
          <Card className="tool-card">
            <Card.Header>
              <div>
                <p className="section-kicker">Account</p>
                <Card.Title>抖音 / 小红书 / 快手登录</Card.Title>
                <Card.Description>
                  点击登录会调用 sau CLI，并弹出本机 Chrome。Cookie 保存在 social-auto-upload 的 cookies 目录。
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="field-grid">
                <div className="field-label">
                  <span>平台</span>
                  <div className="segmented-control">
                    {platforms.map((item) => (
                      <Button
                        key={item.id}
                        size="sm"
                        variant={platform === item.id ? "primary" : "secondary"}
                        onClick={() => setPlatform(item.id)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <label className="field-label">
                  <span>账号名</span>
                  <Input value={account} onChange={(event) => setAccount(event.target.value)} />
                </label>
              </div>
            </Card.Content>
            <Card.Footer className="card-actions">
              <Button
                onClick={() =>
                  run("检查账号", () => postJson("/api/accounts/check", { platform, account }))
                }
                isDisabled={Boolean(busyAction)}
                variant="primary"
              >
                检查 Cookie
              </Button>
              <Button
                onClick={() =>
                  run("登录账号", () =>
                    postJson("/api/accounts/login", { platform, account, headed: true }),
                  )
                }
                isDisabled={Boolean(busyAction)}
                variant="secondary"
              >
                登录账号
              </Button>
            </Card.Footer>
          </Card>
        ) : null}

        {showGenerate ? (
          <Card className="tool-card">
            <Card.Header>
              <div>
                <p className="section-kicker">Generate</p>
                <Card.Title>调用 Codex CLI 生成图文</Card.Title>
                <Card.Description>
                  输出要求是 JSON，便于后续把标题、正文、标签填入发布表单。
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content>
              <label className="field-label">
                <span>推广需求</span>
                <TextArea value={brief} rows={5} onChange={(event) => setBrief(event.target.value)} />
              </label>
            </Card.Content>
            <Card.Footer className="card-actions">
              <Button
                onClick={() => run("生成内容", () => postJson("/api/generate", { platform, brief }))}
                isDisabled={Boolean(busyAction)}
              >
                生成图文
              </Button>
              <Button
                variant="secondary"
                onClick={applyGeneratedJson}
                isDisabled={!lastResult?.stdout && !lastResult?.cleanStdout}
              >
                填入发布表单
              </Button>
            </Card.Footer>
          </Card>
        ) : null}

        {showPublish ? (
          <Card className="tool-card wide-card">
            <Card.Header>
              <div>
                <p className="section-kicker">Publish</p>
                <Card.Title>图文发布</Card.Title>
                <Card.Description>
                  当前支持小红书、抖音和快手图文。图片路径先使用每行一个绝对路径。
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="field-grid">
                <label className="field-label">
                  <span>标题</span>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label className="field-label">
                  <span>标签，逗号分隔</span>
                  <Input value={tags} onChange={(event) => setTags(event.target.value)} />
                </label>
              </div>
              <label className="field-label">
                <span>正文</span>
                <TextArea value={note} rows={6} onChange={(event) => setNote(event.target.value)} />
              </label>
              <label className="field-label">
                <span>图片路径，每行一个绝对路径</span>
                <TextArea
                  value={images}
                  rows={4}
                  placeholder="/Users/q/Desktop/work/ai-workflow/social-auto-upload/videos/demo1.png"
                  onChange={(event) => setImages(event.target.value)}
                />
              </label>
            </Card.Content>
            <Card.Footer className="card-actions">
              <Button
                onClick={() =>
                  run("发布图文", () =>
                    postJson("/api/publish/note", {
                      platform,
                      account,
                      title,
                      note,
                      tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
                      images: imageList,
                    }),
                  )
                }
                isDisabled={Boolean(busyAction)}
              >
                发布
              </Button>
            </Card.Footer>
          </Card>
        ) : null}

        <Card className="tool-card wide-card">
          <Card.Header>
            <div className="log-header">
              <div>
                <p className="section-kicker">Logs</p>
                <Card.Title>最近一次执行结果</Card.Title>
              </div>
              <Chip color={lastResult?.success ? "success" : "default"} variant="soft">
                {lastResult ? (lastResult.success ? "成功" : "失败") : "等待执行"}
              </Chip>
            </div>
          </Card.Header>
          <Card.Content>
            <TerminalOutput result={lastResult} />
          </Card.Content>
        </Card>
      </section>
    </main>
  );
}

function TerminalOutput({ result }: { result: CommandResult | null }) {
  const cleanText = cleanOutputText(result);
  const rawText = outputText(result);

  if (!result) {
    return (
      <div className="terminal-panel terminal-panel--empty">
        <div className="terminal-topline">
          <span className="terminal-dot terminal-dot--red" />
          <span className="terminal-dot terminal-dot--yellow" />
          <span className="terminal-dot terminal-dot--green" />
          <span className="terminal-title">local shell</span>
        </div>
        <div className="terminal-empty">还没有执行记录。</div>
      </div>
    );
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-topline">
        <span className="terminal-dot terminal-dot--red" />
        <span className="terminal-dot terminal-dot--yellow" />
        <span className="terminal-dot terminal-dot--green" />
        <span className="terminal-title">local shell</span>
        {result.durationMs ? <span className="terminal-duration">{result.durationMs}ms</span> : null}
      </div>

      <div className="terminal-body">
        <section className="terminal-section">
          <div className="terminal-section-title">summary</div>
          <p className={result.success ? "terminal-summary terminal-summary--success" : "terminal-summary terminal-summary--error"}>
            {result.summary || result.error || (result.success ? "命令执行完成。" : "命令执行失败。")}
          </p>
        </section>

        {result.qrImagePath ? (
          <section className="terminal-section">
            <div className="terminal-section-title">qr image</div>
            <code className="terminal-path">{result.qrImagePath}</code>
          </section>
        ) : null}

        {cleanText ? (
          <section className="terminal-section">
            <div className="terminal-section-title">clean output</div>
            <pre className="terminal-pre">{cleanText}</pre>
          </section>
        ) : null}

        {result.error ? (
          <section className="terminal-section">
            <div className="terminal-section-title">client error</div>
            <pre className="terminal-pre terminal-pre--error">{result.error}</pre>
          </section>
        ) : null}

        <details className="terminal-raw">
          <summary>查看原始输出</summary>
          <pre className="terminal-pre terminal-pre--raw">{rawText}</pre>
        </details>
      </div>
    </div>
  );
}
