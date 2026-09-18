/**
 * Side panel entry point. Mirrors the popup logic but lives in the side panel context.
 * Injected as an ES module via sidepanel.html.
 */

const SUPPORTED_SITES = [
  { patterns: ["chatgpt.com"], name: "ChatGPT" },
  { patterns: ["gemini.google.com"], name: "Gemini" },
  { patterns: ["chat.deepseek.com"], name: "DeepSeek" },
  { patterns: ["grok.com"], name: "Grok" },
  { patterns: ["perplexity.ai"], name: "Perplexity" },
  { patterns: ["claude.ai"], name: "Claude" },
  { patterns: ["chat.mistral.ai"], name: "Mistral" },
  { patterns: ["huggingface.co/chat"], name: "HuggingChat" },
  { patterns: ["meta.ai"], name: "Meta AI" },
  { patterns: ["poe.com"], name: "Poe" },
  { patterns: ["copilot.microsoft.com", "bing.com/chat"], name: "Copilot" },
  { patterns: ["phind.com"], name: "Phind" },
  { patterns: ["you.com"], name: "You.com" },
  // 2024-2025 platforms
  { patterns: ["chat.qwen.ai", "qwen.ai"], name: "Qwen Chat" },
  { patterns: ["kimi.moonshot.cn", "kimi.com"], name: "Kimi" },
  { patterns: ["chat.z.ai", "chatglm.cn"], name: "ChatGLM" },
  { patterns: ["doubao.com"], name: "Doubao" },
  { patterns: ["chat.minimax.io", "hailuoai.com"], name: "MiniMax" },
  { patterns: ["yuanbao.tencent.com"], name: "Yuanbao" },
  { patterns: ["chat.01.ai"], name: "Yi (01.ai)" },
  // Playgrounds
  { patterns: ["aistudio.google.com"], name: "Google AI Studio" },
  { patterns: ["platform.openai.com/playground"], name: "OpenAI Playground" },
  { patterns: ["console.anthropic.com", "platform.claude.com"], name: "Anthropic Console" },
  { patterns: ["groq.com"], name: "Groq" },
  { patterns: ["api.together.ai", "api.together.xyz", "together.ai"], name: "Together AI" },
  { patterns: ["coral.cohere.com", "dashboard.cohere.com"], name: "Cohere Coral" },
  { patterns: ["chat.reka.ai", "space.reka.ai"], name: "Reka" },
  // Embedded
  { patterns: ["notion.so/chat"], name: "Notion AI" },
  { patterns: ["github.com/copilot", "github.dev", "vscode.dev", "insiders.vscode.dev"], name: "GitHub Copilot Chat" },
  { patterns: ["cursor.com/agents"], name: "Cursor" },
  { patterns: ["sourcegraph.com/cody"], name: "Sourcegraph Cody" },
  { patterns: ["windsurf.com"], name: "Windsurf" },
  { patterns: ["codeium.com"], name: "Codeium" },
  { patterns: ["zed.dev"], name: "Zed" },
  { patterns: ["continue.dev"], name: "Continue" }
];

const REPOSITORY_ISSUES_URL = "https://github.com/weiyuankong/ChatArchive/issues/new";
const DEFAULT_RUNTIME_HINT =
  "DOM scrolling can slow down or pause in a background tab. Use Stop & Save or <code>Ctrl/Command+Shift+S</code> to keep partial progress.";
const PDF_RUNTIME_HINT =
  "PDF export opens a print-ready view in a new tab. Use the browser print dialog's <code>Save as PDF</code> option to keep the final file.";

const TEMPLATE_TOKENS = [
  { id: "tplPlatform", token: "{platform}" },
  { id: "tplTitle", token: "{title}" },
  { id: "tplDate", token: "{date}" },
  { id: "tplTime", token: "{time}" },
  { id: "tplSource", token: "{source}" },
  { id: "tplStrategy", token: "{strategy}" },
  { id: "tplCount", token: "{count}" }
];

function getHostName(url: string | undefined): string {
  try {
    return new URL(url || "").hostname;
  } catch {
    return "";
  }
}

function getSupportedSiteName(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsedUrl = new URL(url);
    const pageKey = `${parsedUrl.hostname}${parsedUrl.pathname}`.toLowerCase();
    const site = SUPPORTED_SITES.find(({ patterns }) =>
      patterns.some((pattern) => pageKey.includes(pattern))
    );
    return site?.name || "";
  } catch {
      return "";
    }
  }

function buildDebugReport(report: {
  host: string;
  summary?: {
    platform: string;
    messageCount: number;
    strategyId: string;
    source: string;
    partial: boolean;
    confidence: number;
    format: string;
    filename: string;
  };
  error?: string;
  options: Record<string, unknown>;
  status: "success" | "failed";
}): object {
  return {
    status: report.status,
    host: report.host,
    options: report.options,
    exportedAt: new Date().toISOString(),
    summary: report.summary || null,
    error: report.error || null
  };
}

function buildIssueUrl(report: ReturnType<typeof buildDebugReport>): string {
  const r = report as { status: string; summary?: { platform?: string }; host?: string; error?: string };
  const titlePrefix = r.status === "failed" ? "Broken export" : "Export quality issue";
  const platform = r.summary?.platform || r.host || "unknown platform";
  const title = `${titlePrefix}: ${platform}`;
  const body = [
    "## What happened",
    r.error ? r.error : "Export completed, but the output needs review.",
    "",
    "## Debug report",
    "```json",
    JSON.stringify(r, null, 2),
    "```"
  ].join("\n");
  const params = new URLSearchParams({ template: "broken-export.yml", title, body });
  return `${REPOSITORY_ISSUES_URL}?${params.toString()}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const exportButton = document.getElementById("exportBtn") as HTMLButtonElement;
  const copyButton = document.getElementById("copyBtn") as HTMLButtonElement;
  const stopButton = document.getElementById("stopBtn") as HTMLButtonElement;
  const copyReportButton = document.getElementById("copyReportBtn") as HTMLButtonElement;
  const reportIssueButton = document.getElementById("reportIssueBtn") as HTMLButtonElement;
  const refreshStatusButton = document.getElementById("refreshStatusBtn") as HTMLButtonElement;
  const settingsToggle = document.getElementById("settingsToggle") as HTMLButtonElement;
  const settingsPanel = document.getElementById("settingsPanel") as HTMLDivElement;
  const formatSelect = document.getElementById("formatSelect") as HTMLSelectElement;
  const includeMetadata = document.getElementById("includeMetadata") as HTMLInputElement;
  const filenameTemplateInput = document.getElementById("filenameTemplate") as HTMLInputElement;
  const templatePreview = document.getElementById("templatePreview") as HTMLDivElement;
  const messageLimitInput = document.getElementById("messageLimit") as HTMLInputElement;
  const scrollSpeedInput = document.getElementById("scrollSpeed") as HTMLInputElement;
  const progressBar = document.getElementById("progressBar") as HTMLDivElement;
  const statusContainer = document.getElementById("statusContainer") as HTMLDivElement;
  const statusText = document.getElementById("status") as HTMLDivElement;
  const supportText = document.getElementById("siteSupport") as HTMLDivElement;
  const runtimeHint = document.getElementById("runtimeHint") as HTMLDivElement;
  const diagnosticsPanel = document.getElementById("diagnosticsPanel") as HTMLDivElement;
  const diagPlatform = document.getElementById("diagPlatform") as HTMLSpanElement;
  const diagSource = document.getElementById("diagSource") as HTMLSpanElement;
  const diagStrategy = document.getElementById("diagStrategy") as HTMLSpanElement;
  const diagMessages = document.getElementById("diagMessages") as HTMLSpanElement;
  const diagConfidence = document.getElementById("diagConfidence") as HTMLSpanElement;
  const diagFormat = document.getElementById("diagFormat") as HTMLSpanElement;
  const diagFile = document.getElementById("diagFile") as HTMLSpanElement;
  const templateCheckboxes = TEMPLATE_TOKENS.map(({ id, token }) => ({
    token,
    element: document.getElementById(id) as HTMLInputElement
  })).filter(({ element }) => element);

  let lastReport: object | null = null;
  let exportRunning = false;

  // The side panel is not tied to a specific tab like the popup.
  // We query the active tab when an action is triggered.
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function updateSupportText(tab: chrome.tabs.Tab | undefined) {
    if (!tab?.url) {
      supportText.textContent = "Open a supported website first.";
      return;
    }
    const supportedName = getSupportedSiteName(tab.url);
    const currentHost = getHostName(tab.url);
    if (supportedName) {
      supportText.textContent = `Detected site: ${supportedName}`;
    } else if (currentHost) {
      supportText.textContent = `Detected site: ${currentHost} (not officially supported)`;
    }
  }

  async function refreshActiveTab() {
    const tab = await getActiveTab();
    updateSupportText(tab);
  }

  // Initial load
  await refreshActiveTab();

  // Load saved settings
  const settings = await chrome.storage.local.get([
    "exportFormat",
    "includeMetadata",
    "filenameTemplate",
    "messageLimit",
    "scrollSpeed",
    "settingsPanelOpen"
  ]) as {
    exportFormat?: string;
    includeMetadata?: boolean;
    filenameTemplate?: string;
    messageLimit?: number;
    scrollSpeed?: number;
    settingsPanelOpen?: boolean;
  };

  if (settings.exportFormat) formatSelect.value = settings.exportFormat;
  if (settings.includeMetadata !== undefined) includeMetadata.checked = settings.includeMetadata;
  if (settings.filenameTemplate) {
    filenameTemplateInput.value = settings.filenameTemplate;
    syncTemplateCheckboxes(settings.filenameTemplate);
    renderTemplatePreview(settings.filenameTemplate);
  } else {
    syncTemplateFromCheckboxes();
  }
  if (settings.messageLimit !== undefined) messageLimitInput.value = String(settings.messageLimit);
  if (settings.scrollSpeed !== undefined) scrollSpeedInput.value = String(settings.scrollSpeed);
  if (settings.settingsPanelOpen) setSettingsOpen(true);

  updateFormatActions();
  updateReportActions();

  function persistSettings() {
    chrome.storage.local.set({
      exportFormat: formatSelect.value,
      includeMetadata: includeMetadata.checked,
      filenameTemplate: filenameTemplateInput.value,
      messageLimit: Number(messageLimitInput.value),
      scrollSpeed: Number(scrollSpeedInput.value),
      settingsPanelOpen: settingsPanel.classList.contains("open")
    });
  }

  [includeMetadata, messageLimitInput, scrollSpeedInput].forEach((el) => {
    el.addEventListener("change", () => { persistSettings(); });
  });

  formatSelect.addEventListener("change", () => {
    updateFormatActions();
    persistSettings();
  });

  templateCheckboxes.forEach(({ element }) => {
    element.addEventListener("change", () => {
      syncTemplateFromCheckboxes();
      persistSettings();
    });
  });

  settingsToggle.addEventListener("click", () => {
    setSettingsOpen(!settingsPanel.classList.contains("open"));
    persistSettings();
  });

  function setSettingsOpen(isOpen: boolean) {
    settingsToggle.classList.toggle("open", isOpen);
    settingsPanel.classList.toggle("open", isOpen);
    settingsToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function updateFormatActions() {
    const isPdf = formatSelect.value === "pdf";
    exportButton.textContent = isPdf ? "Save as PDF" : "Export Chat";
    runtimeHint.innerHTML = isPdf ? PDF_RUNTIME_HINT : DEFAULT_RUNTIME_HINT;
    if (!exportRunning) {
      copyButton.disabled = isPdf;
    }
  }

  function updateReportActions() {
    const hasReport = Boolean(lastReport);
    copyReportButton.disabled = !hasReport;
    reportIssueButton.disabled = !hasReport;
  }

  function syncTemplateFromCheckboxes() {
    const enabledTokens: Record<string, boolean> = {};
    for (const { token, element } of templateCheckboxes) {
      enabledTokens[token] = element.checked;
    }
    const leadingParts: string[] = [];
    const trailingParts: string[] = [];
    if (enabledTokens["{platform}"]) leadingParts.push("[{platform}]");
    if (enabledTokens["{title}"]) leadingParts.push("{title}");
    if (enabledTokens["{date}"]) trailingParts.push("{date}");
    if (enabledTokens["{time}"]) trailingParts.push("{time}");
    if (enabledTokens["{source}"]) trailingParts.push("{source}");
    if (enabledTokens["{strategy}"]) trailingParts.push("{strategy}");
    if (enabledTokens["{count}"]) trailingParts.push("{count}");
    let template = leadingParts.join(" ").trim();
    if (trailingParts.length > 0) {
      template = template ? `${template} - ${trailingParts.join(" - ")}` : trailingParts.join(" - ");
    }
    if (!template) {
      template = "{title}";
      syncTemplateCheckboxes(template);
    }
    filenameTemplateInput.value = template;
    renderTemplatePreview(template);
  }

  function syncTemplateCheckboxes(template: string) {
    templateCheckboxes.forEach(({ token, element }) => {
      element.checked = template.includes(token);
    });
  }

  function renderTemplatePreview(template: string) {
    templatePreview.textContent = template;
  }

  async function injectScripts(tabId: number) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        "src/content/namespace.js",
        "src/content/utils.js",
        "src/content/platforms.js",
        "src/content/extractor.js",
        "src/content/exporters.js",
        "src/content/runner.js"
      ]
    });
  }

  copyReportButton.addEventListener("click", async () => {
    if (!lastReport) return;
    await navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2));
    statusText.textContent = "Debug report copied.";
  });

  reportIssueButton.addEventListener("click", async () => {
    if (!lastReport) return;
    const issueUrl = buildIssueUrl(lastReport);
    await chrome.tabs.create({ url: issueUrl });
  });

  stopButton.addEventListener("click", async () => {
    if (!exportRunning) return;
    const tab = await getActiveTab();
    if (!tab?.id) return;
    const response = await chrome.tabs.sendMessage(tab.id, { type: "CHAT_ARCHIVE_STOP_AND_SAVE" });
    if (response?.ok) {
      statusText.textContent = "Stop requested. Saving current progress…";
      stopButton.disabled = true;
    }
  });

  refreshStatusButton.addEventListener("click", async () => {
    await refreshRunStatus();
  });

  async function runExportAction(
    action: "export" | "copy",
    format: string,
    options: { includeMetadata: boolean; filenameTemplate: string; messageLimit: number; scrollSpeed: number }
  ) {
    const tab = await getActiveTab();
    if (!tab?.id || !tab.url?.startsWith("http")) {
      statusText.textContent = "Open a supported website first.";
      return;
    }

    exportButton.disabled = true;
    if (copyButton) copyButton.disabled = true;
    stopButton.disabled = false;
    refreshStatusButton.disabled = true;
    progressBar.style.display = "block";
    statusContainer.classList.add("loading");
    statusText.textContent = "Preparing extractor…";

    try {
      exportRunning = true;
      await injectScripts(tab.id);
      statusText.textContent = format === "pdf" ? "Preparing PDF…" : "Starting export…";

      const messageType = format === "pdf" ? "CHAT_ARCHIVE_BUILD_EXPORT" : "CHAT_ARCHIVE_START";
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: messageType,
        format,
        options
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Unable to start export.");
      }

      if (format === "pdf") {
        await openPdfPrintView(response.payload);
      }

      progressBar.style.display = "none";
      statusContainer.classList.remove("loading");
      lastReport = buildDebugReport({
        host: getHostName(tab.url),
        summary: response.summary,
        options,
        status: "success"
      });
      renderDiagnostics(response.summary);
      exportButton.disabled = false;
      if (copyButton) copyButton.disabled = false;
      refreshStatusButton.disabled = false;
      exportRunning = false;
      stopButton.disabled = true;
      updateFormatActions();
      updateReportActions();
      statusText.textContent = format === "pdf"
        ? response.summary.partial
          ? "Partial PDF opened in print view."
          : "Print-ready PDF view opened."
        : response.summary.partial
          ? "Partial export saved."
          : "Export completed.";
    } catch (error) {
      const err = error as Error;
      lastReport = buildDebugReport({
        host: getHostName(tab.url),
        error: err.message || "Export failed.",
        options,
        status: "failed"
      });
      exportButton.disabled = false;
      if (copyButton) copyButton.disabled = false;
      stopButton.disabled = true;
      refreshStatusButton.disabled = false;
      progressBar.style.display = "none";
      statusContainer.classList.remove("loading");
      exportRunning = false;
      updateFormatActions();
      updateReportActions();
      statusText.textContent = err.message || "Export failed.";
    }
  }

  exportButton.addEventListener("click", () => {
    const format = formatSelect.value;
    const options = {
      includeMetadata: includeMetadata.checked,
      filenameTemplate: filenameTemplateInput.value,
      messageLimit: Number.parseInt(messageLimitInput.value, 10) || 0,
      scrollSpeed: Number.parseInt(scrollSpeedInput.value, 10) || 200
    };
    runExportAction("export", format, options);
  });

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const format = formatSelect.value;
      if (format === "pdf") {
        statusText.textContent = "Clipboard copy is not available for PDF export.";
        return;
      }
      const options = {
        includeMetadata: includeMetadata.checked,
        filenameTemplate: filenameTemplateInput.value,
        messageLimit: Number.parseInt(messageLimitInput.value, 10) || 0,
        scrollSpeed: Number.parseInt(scrollSpeedInput.value, 10) || 200
      };
      await runExportAction("copy", format, options);
      // For copy, we need to handle the clipboard separately since CHAT_ARCHIVE_START downloads.
      // Fall back to CHAT_ARCHIVE_COPY for clipboard.
      const tab = await getActiveTab();
      if (!tab?.id) return;
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "CHAT_ARCHIVE_COPY",
        format,
        options
      });
      if (response?.ok && response.content) {
        await navigator.clipboard.writeText(response.content);
        statusText.textContent = "Copied to clipboard!";
      }
    });
  }

  function renderDiagnostics(summary: {
    platform: string;
    source: string;
    strategyId: string;
    messageCount: number;
    partial: boolean;
    confidence: number;
    format: string;
    filename: string;
  }) {
    diagnosticsPanel.style.display = "block";
    diagPlatform.textContent = summary.platform;
    diagSource.textContent = summary.source;
    diagStrategy.textContent = summary.strategyId;
    diagMessages.textContent = summary.partial ? `${summary.messageCount} (partial)` : String(summary.messageCount);
    diagConfidence.textContent = `${Math.round(summary.confidence * 100)}%`;
    diagFormat.textContent = summary.format;
    diagFile.textContent = summary.filename;
  }

  async function refreshRunStatus() {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    try {
      await injectScripts(tab.id);
      const response = await chrome.tabs.sendMessage(tab.id, { type: "CHAT_ARCHIVE_GET_STATUS" });
      if (!response?.ok) return;
      exportRunning = Boolean(response.running);
      stopButton.disabled = !exportRunning;
      refreshStatusButton.disabled = false;
      if (response.summary) {
        renderDiagnostics(response.summary);
        lastReport = buildDebugReport({
          host: getHostName(tab.url),
          summary: response.summary,
          options: {
            includeMetadata: includeMetadata.checked,
            filenameTemplate: filenameTemplateInput.value,
            messageLimit: Number.parseInt(messageLimitInput.value, 10) || 0,
            scrollSpeed: Number.parseInt(scrollSpeedInput.value, 10) || 200
          },
          status: response.error ? "failed" : "success"
        });
        updateReportActions();
      }
      if (response.running) {
        statusText.textContent = "Export still running.";
      } else if (response.error) {
        statusText.textContent = response.error;
      }
    } catch {
      // Ignore pages where the runner is not yet injected.
    }
  }

  async function openPdfPrintView(payload: { filename: string; content: string }) {
    const jobKey = `chatArchivePrintJob:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await chrome.storage.local.set({
      [jobKey]: { createdAt: Date.now(), filename: payload.filename, content: payload.content }
    });
    await chrome.tabs.create({ url: chrome.runtime.getURL(`src/print/print.html?job=${encodeURIComponent(jobKey)}`) });
  }
});