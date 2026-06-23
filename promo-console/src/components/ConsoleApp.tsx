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

type PublishPayload = {
  platform: string;
  account: string;
  title: string;
  note: string;
  tags: string[];
  images: string[];
  schedule?: string;
  bgm?: string;
  headed: boolean;
};

type AccountStatus = {
  success: boolean;
  cookiesDir?: string;
  accounts?: {
    id: string;
    label: string;
    loggedIn: boolean;
    accounts: {
      account: string;
      fileName: string;
      updatedAt: string;
    }[];
  }[];
  error?: string;
};

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

type ConsoleAppProps = {
  mode?: "home" | "accounts" | "generate";
};

const platforms = [
  { id: "xiaohongshu", label: "小红书" },
  { id: "douyin", label: "抖音" },
  { id: "kuaishou", label: "快手" },
];

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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
  return JSON.parse(raw.slice(start, end + 1)) as GeneratedContent;
}

function parseGeneratedContent(result: CommandResult | null) {
  const generatedOutput = result?.cleanStdout || result?.stdout;
  if (!generatedOutput) return null;

  try {
    return parseJsonBlock(generatedOutput);
  } catch {
    return null;
  }
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
  const [schedule, setSchedule] = useState("");
  const [bgm, setBgm] = useState("");
  const [headedPublish, setHeadedPublish] = useState(true);
  const [health, setHealth] = useState<CommandResult | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [busyAction, setBusyAction] = useState("");

  const showAccounts = mode === "home" || mode === "accounts";
  const showGenerate = mode === "home" || mode === "generate";
  const showPublish = mode === "home" || mode === "generate";

  const imageList = useMemo(
    () =>
      images
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [images],
  );

  const selectedPlatformStatus = accountStatus?.accounts?.find((item) => item.id === platform);
  const selectedAccountLoggedIn = Boolean(
    selectedPlatformStatus?.accounts.some((item) => item.account === account),
  );
  const publishReady = Boolean(title.trim() && imageList.length && !busyAction);

  const refreshAccountStatus = () => {
    fetch("/api/accounts/status")
      .then((res) => res.json())
      .then(setAccountStatus)
      .catch((error) =>
        setAccountStatus({
          success: false,
          error: error instanceof Error ? error.message : "账号状态读取失败",
        }),
      );
  };

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch((error) => setHealth({ success: false, error: error.message }));
    refreshAccountStatus();
  }, []);

  const run = async (
    label: string,
    action: () => Promise<CommandResult>,
    options?: { refreshAccounts?: boolean; onSuccess?: (result: CommandResult) => void },
  ) => {
    setBusyAction(label);
    setLastResult(null);
    try {
      const result = await action();
      setLastResult(result);
      if (result.success) {
        options?.onSuccess?.(result);
      }
      if (options?.refreshAccounts) {
        refreshAccountStatus();
      }
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
    const data = generatedContent || parseGeneratedContent(lastResult);
    if (!data) return;
    if (data.title) setTitle(data.title);
    if (data.note) setNote(data.note);
    if (Array.isArray(data.tags)) setTags(data.tags.join(","));
    if (data.image_path) {
      setImages((current) => {
        const existing = current
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
        return existing.includes(data.image_path as string)
          ? current
          : [...existing, data.image_path].join("\n");
      });
    }
  };

  const runGenerate = () =>
    run("生成内容", () => postJson("/api/generate", { platform, brief }), {
      onSuccess: (result) => {
        const parsed = parseGeneratedContent(result);
        setGeneratedContent(parsed);
        if (parsed) {
          if (parsed.title) setTitle(parsed.title);
          if (parsed.note) setNote(parsed.note);
          if (Array.isArray(parsed.tags)) setTags(parsed.tags.join(","));
          if (parsed.image_path) {
            setImages((current) => {
              const existing = current
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean);
              return existing.includes(parsed.image_path as string)
                ? current
                : [...existing, parsed.image_path].join("\n");
            });
          }
        }
      },
    });

  const buildPublishPayload = (): PublishPayload => ({
    platform,
    account,
    title,
    note,
    tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
    images: imageList,
    schedule: schedule.trim() || undefined,
    bgm: platform === "douyin" ? bgm.trim() || undefined : undefined,
    headed: headedPublish,
  });

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
          <>
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
                    run("检查账号", () => postJson("/api/accounts/check", { platform, account }), {
                      refreshAccounts: true,
                    })
                  }
                  isDisabled={Boolean(busyAction)}
                  variant="primary"
                >
                  检查 Cookie
                </Button>
                <Button
                  onClick={() =>
                    run(
                      "登录账号",
                      () => postJson("/api/accounts/login", { platform, account, headed: true }),
                      { refreshAccounts: true },
                    )
                  }
                  isDisabled={Boolean(busyAction)}
                  variant="secondary"
                >
                  登录账号
                </Button>
              </Card.Footer>
            </Card>

            <LoggedInPlatformsCard status={accountStatus} onRefresh={refreshAccountStatus} />
          </>
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
                onClick={runGenerate}
                isDisabled={Boolean(busyAction)}
              >
                生成图文
              </Button>
              <Button
                variant="secondary"
                onClick={applyGeneratedJson}
                isDisabled={!generatedContent && !lastResult?.stdout && !lastResult?.cleanStdout}
              >
                填入发布表单
              </Button>
            </Card.Footer>
          </Card>
        ) : null}

        {showGenerate ? (
          <GeneratedContentCard content={generatedContent} onApply={applyGeneratedJson} />
        ) : null}

        {showPublish ? (
          <PublishCard
            platform={platform}
            account={account}
            title={title}
            note={note}
            tags={tags}
            images={images}
            imageList={imageList}
            schedule={schedule}
            bgm={bgm}
            headedPublish={headedPublish}
            selectedAccountLoggedIn={selectedAccountLoggedIn}
            onPlatformChange={setPlatform}
            onAccountChange={setAccount}
            onTitleChange={setTitle}
            onNoteChange={setNote}
            onTagsChange={setTags}
            onImagesChange={setImages}
            onScheduleChange={setSchedule}
            onBgmChange={setBgm}
            onHeadedPublishChange={setHeadedPublish}
            onPublish={() => run("发布图文", () => postJson("/api/publish/note", buildPublishPayload()))}
            isBusy={Boolean(busyAction)}
            canPublish={publishReady}
          />
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

function GeneratedContentCard({
  content,
  onApply,
}: {
  content: GeneratedContent | null;
  onApply: () => void;
}) {
  return (
    <Card className="tool-card generated-card">
          <Card.Header>
            <div className="log-header">
              <div>
                <p className="section-kicker">Draft</p>
                <Card.Title>生成结果</Card.Title>
            <Card.Description>这里展示可编辑的图文草稿；需要图片时会直接调用 gpt-image-2 生成本地图片。</Card.Description>
              </div>
          <Chip color={content?.image_generated ? "success" : content ? "warning" : "default"} variant="soft">
            {content?.image_generated ? "图文已生成" : content ? "已生成文案" : "等待生成"}
          </Chip>
            </div>
          </Card.Header>
      <Card.Content>
        {content ? (
          <div className="generated-preview">
            <section className="generated-section">
              <span>标题</span>
              <h3>{content.title || "未生成标题"}</h3>
            </section>
            <section className="generated-section">
              <span>正文</span>
              <p>{content.note || "未生成正文"}</p>
            </section>
            {content.tags?.length ? (
              <section className="generated-section">
                <span>标签</span>
                <div className="generated-tags">
                  {content.tags.map((tag) => (
                    <Chip key={tag} size="sm" variant="soft">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </section>
            ) : null}
            {content.angle ? (
              <section className="generated-section">
                <span>切入角度</span>
                <p>{content.angle}</p>
              </section>
            ) : null}
            {content.image_required || content.image_prompt ? (
              <section className="generated-section generated-section--image">
                <span>图片生成</span>
                <p>
                  图片策略：{content.image_policy || "gpt-image-2"}
                  <br />
                  {content.image_generated
                    ? `已通过 ${content.image_generation_mode || "Mode A"} 生成图片`
                    : content.image_required
                      ? "需要生成配图"
                      : "当前内容未要求配图"}
                </p>
                {content.image_preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="generated-image-preview" src={content.image_preview_url} alt="gpt-image-2 生成的推广配图" />
                ) : null}
                {content.image_path ? (
                  <code className="generated-image-path">{content.image_path}</code>
                ) : null}
                {content.image_prompt_path ? (
                  <code className="generated-image-path">prompt: {content.image_prompt_path}</code>
                ) : null}
                {content.image_generation_error ? (
                  <pre className="generated-image-error">{content.image_generation_error}</pre>
                ) : null}
                {content.image_prompt ? <pre className="generated-image-prompt">{content.image_prompt}</pre> : null}
              </section>
            ) : null}
            {content.safety_notes?.length ? (
              <section className="generated-section">
                <span>安全提示</span>
                <ul className="generated-notes">
                  {content.safety_notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="generated-empty">
            输入推广需求后点击“生成图文”，生成结果会显示在这里。
          </div>
        )}
      </Card.Content>
      <Card.Footer className="card-actions">
        <Button size="sm" variant="primary" onClick={onApply} isDisabled={!content}>
          填入发布表单
        </Button>
      </Card.Footer>
    </Card>
  );
}

function PublishCard({
  platform,
  account,
  title,
  note,
  tags,
  images,
  imageList,
  schedule,
  bgm,
  headedPublish,
  selectedAccountLoggedIn,
  onPlatformChange,
  onAccountChange,
  onTitleChange,
  onNoteChange,
  onTagsChange,
  onImagesChange,
  onScheduleChange,
  onBgmChange,
  onHeadedPublishChange,
  onPublish,
  isBusy,
  canPublish,
}: {
  platform: string;
  account: string;
  title: string;
  note: string;
  tags: string;
  images: string;
  imageList: string[];
  schedule: string;
  bgm: string;
  headedPublish: boolean;
  selectedAccountLoggedIn: boolean;
  onPlatformChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onImagesChange: (value: string) => void;
  onScheduleChange: (value: string) => void;
  onBgmChange: (value: string) => void;
  onHeadedPublishChange: (value: boolean) => void;
  onPublish: () => void;
  isBusy: boolean;
  canPublish: boolean;
}) {
  return (
    <Card className="tool-card wide-card publish-card">
      <Card.Header>
        <div className="log-header">
          <div>
            <p className="section-kicker">Publish</p>
            <Card.Title>图文发布</Card.Title>
            <Card.Description>
              使用 social-auto-upload 执行小红书、抖音和快手图文发布。生成后的图片路径会自动填入这里。
            </Card.Description>
          </div>
          <Chip color={selectedAccountLoggedIn ? "success" : "warning"} variant="soft">
            {selectedAccountLoggedIn ? "账号已登录" : "未确认登录"}
          </Chip>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="field-grid">
          <div className="field-label">
            <span>发布平台</span>
            <div className="segmented-control">
              {platforms.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={platform === item.id ? "primary" : "secondary"}
                  onClick={() => onPlatformChange(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <label className="field-label">
            <span>账号名</span>
            <Input value={account} onChange={(event) => onAccountChange(event.target.value)} />
          </label>
        </div>

        <div className="publish-status-row">
          <span className={selectedAccountLoggedIn ? "publish-status publish-status--ok" : "publish-status"}>
            {selectedAccountLoggedIn ? "Cookie 文件已发现" : "发布前建议先完成登录或检查 Cookie"}
          </span>
          <span className="publish-status">{imageList.length ? `${imageList.length} 张图片` : "还没有图片"}</span>
        </div>

        <div className="field-grid">
          <label className="field-label">
            <span>标题</span>
            <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
          </label>
          <label className="field-label">
            <span>标签，逗号分隔</span>
            <Input value={tags} onChange={(event) => onTagsChange(event.target.value)} />
          </label>
        </div>

        <label className="field-label">
          <span>正文</span>
          <TextArea value={note} rows={6} onChange={(event) => onNoteChange(event.target.value)} />
        </label>

        <label className="field-label">
          <span>图片路径，每行一个绝对路径</span>
          <TextArea
            value={images}
            rows={4}
            placeholder="/Users/q/Desktop/work/ai-workflow/promo-console/garden-gpt-image-2/image/demo.png"
            onChange={(event) => onImagesChange(event.target.value)}
          />
        </label>

        {imageList.length ? (
          <div className="publish-image-list">
            {imageList.map((image) => (
              <code key={image}>{image}</code>
            ))}
          </div>
        ) : null}

        <div className="field-grid">
          <label className="field-label">
            <span>定时发布，可选</span>
            <Input
              value={schedule}
              placeholder="2026-06-23 18:30"
              onChange={(event) => onScheduleChange(event.target.value)}
            />
          </label>
          <label className="field-label">
            <span>抖音 BGM，可选</span>
            <Input
              value={bgm}
              disabled={platform !== "douyin"}
              placeholder={platform === "douyin" ? "输入音乐关键词" : "仅抖音支持"}
              onChange={(event) => onBgmChange(event.target.value)}
            />
          </label>
        </div>

        <div className="publish-options">
          <Button
            size="sm"
            variant={headedPublish ? "primary" : "secondary"}
            onClick={() => onHeadedPublishChange(true)}
          >
            有界面发布
          </Button>
          <Button
            size="sm"
            variant={!headedPublish ? "primary" : "secondary"}
            onClick={() => onHeadedPublishChange(false)}
          >
            无头发布
          </Button>
        </div>
      </Card.Content>
      <Card.Footer className="card-actions">
        <Button onClick={onPublish} isDisabled={!canPublish || isBusy}>
          发布图文
        </Button>
        {!title.trim() ? <span className="inline-hint">需要标题</span> : null}
        {!imageList.length ? <span className="inline-hint">至少需要一张图片</span> : null}
      </Card.Footer>
    </Card>
  );
}

function LoggedInPlatformsCard({
  status,
  onRefresh,
}: {
  status: AccountStatus | null;
  onRefresh: () => void;
}) {
  const loggedInCount = status?.accounts?.filter((item) => item.loggedIn).length ?? 0;

  return (
    <Card className="tool-card account-status-card">
      <Card.Header>
        <div className="log-header">
          <div>
            <p className="section-kicker">Session</p>
            <Card.Title>已登录平台</Card.Title>
            <Card.Description>根据本机 cookies 目录判断，只显示文件状态，不读取 Cookie 内容。</Card.Description>
          </div>
          <Chip color={loggedInCount > 0 ? "success" : "default"} variant="soft">
            {status ? `${loggedInCount} / ${platforms.length}` : "读取中"}
          </Chip>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="platform-status-list">
          {(status?.accounts ?? platforms.map((item) => ({ ...item, loggedIn: false, accounts: [] }))).map((item) => (
            <div key={item.id} className={item.loggedIn ? "platform-status platform-status--active" : "platform-status"}>
              <div className="platform-status-main">
                <span className={item.loggedIn ? "status-dot status-dot--active" : "status-dot"} />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.loggedIn ? `${item.accounts.length} 个账号已登录` : "未发现登录 Cookie"}</p>
                </div>
              </div>
              {item.loggedIn ? (
                <div className="platform-account-list">
                  {item.accounts.map((accountItem) => (
                    <div key={accountItem.fileName} className="platform-account">
                      <span>{accountItem.account}</span>
                      <time dateTime={accountItem.updatedAt}>{formatUpdatedAt(accountItem.updatedAt)}</time>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {status?.error ? <p className="status-error">{status.error}</p> : null}
        {status?.cookiesDir ? <p className="status-path">目录：{status.cookiesDir}</p> : null}
      </Card.Content>
      <Card.Footer className="card-actions">
        <Button size="sm" variant="secondary" onClick={onRefresh} isDisabled={!status}>
          刷新状态
        </Button>
      </Card.Footer>
    </Card>
  );
}
