import type { PlatformInfo, PlatformKind } from "./types.ts";

/**
 * - `stable`: hand-written adapter with fixture tests in this repo.
 * - `experimental`: generic heuristic adapter. The hosts are real, but the DOM selectors have
 *   NOT been verified against the live site; expect to lean on the AI fallback or to regenerate
 *   the adapter with `npm run generate:adapter`.
 * - `detect-only`: recognised (so the popup can say why it will not work) but has no
 *   extractable chat DOM in a browser tab, e.g. native editors.
 */
export type SupportLevel = "stable" | "experimental" | "detect-only";

export interface PlatformEntry extends PlatformInfo {
  /** `host` or `host/path-prefix`. Hosts match on a label boundary (`a.b.com` matches `b.com`). */
  hosts: string[];
  support: SupportLevel;
  userLabel: string;
  assistantLabel: string;
  note?: string;
}

function entry(
  id: string,
  name: string,
  kind: PlatformKind,
  support: SupportLevel,
  hosts: string[],
  extra: Partial<Pick<PlatformEntry, "userLabel" | "assistantLabel" | "note">> = {}
): PlatformEntry {
  return {
    id,
    name,
    kind,
    support,
    hosts,
    userLabel: extra.userLabel ?? "You",
    assistantLabel: extra.assistantLabel ?? name,
    ...(extra.note ? { note: extra.note } : {})
  };
}

export const PLATFORMS: readonly PlatformEntry[] = [
  // Hand-written adapters (src/content/platforms.js).
  entry("chatgpt", "ChatGPT", "chat", "stable", ["chatgpt.com"]),
  entry("gemini", "Gemini", "chat", "stable", ["gemini.google.com"]),
  entry("deepseek", "DeepSeek", "chat", "stable", ["chat.deepseek.com"]),
  entry("grok", "Grok", "chat", "stable", ["grok.com"]),
  entry("perplexity", "Perplexity", "chat", "stable", ["perplexity.ai"]),
  entry("claude", "Claude", "chat", "stable", ["claude.ai"]),
  entry("mistral", "Mistral", "chat", "stable", ["chat.mistral.ai"]),
  entry("huggingchat", "HuggingChat", "chat", "stable", ["huggingface.co/chat"]),
  entry("meta-ai", "Meta AI", "chat", "stable", ["meta.ai"]),
  entry("poe", "Poe", "chat", "stable", ["poe.com"]),
  entry("copilot", "Copilot", "chat", "stable", ["copilot.microsoft.com", "bing.com/chat"]),
  entry("phind", "Phind", "chat", "stable", ["phind.com"]),
  entry("you", "You.com", "chat", "stable", ["you.com"]),

  // 2024-2025 chat products.
  entry("qwen", "Qwen Chat", "chat", "experimental", ["chat.qwen.ai", "qwen.ai"]),
  entry("kimi", "Kimi", "chat", "experimental", ["kimi.moonshot.cn", "kimi.com"]),
  entry("chatglm", "ChatGLM", "chat", "experimental", ["chat.z.ai", "chatglm.cn"]),
  entry("doubao", "Doubao", "chat", "experimental", ["doubao.com"]),
  entry("minimax", "MiniMax", "chat", "experimental", ["chat.minimax.io", "hailuoai.com"]),
  entry("yuanbao", "Yuanbao", "chat", "experimental", ["yuanbao.tencent.com"]),
  entry("yi", "Yi (01.ai)", "chat", "experimental", ["chat.01.ai"]),

  // Developer playgrounds.
  entry("ai-studio", "Google AI Studio", "playground", "experimental", ["aistudio.google.com"], {
    assistantLabel: "Model"
  }),
  entry("openai-playground", "OpenAI Playground", "playground", "experimental", [
    "platform.openai.com/playground"
  ]),
  entry(
    "anthropic-console",
    "Anthropic Console",
    "playground",
    "experimental",
    ["console.anthropic.com", "platform.claude.com"],
    { assistantLabel: "Claude" }
  ),
  entry("groq", "Groq", "playground", "experimental", ["groq.com"]),
  entry("together", "Together AI", "playground", "experimental", [
    "api.together.ai",
    "api.together.xyz",
    "together.ai"
  ]),
  entry("cohere", "Cohere Coral", "playground", "experimental", [
    "coral.cohere.com",
    "dashboard.cohere.com"
  ]),
  entry("reka", "Reka", "chat", "experimental", ["chat.reka.ai", "space.reka.ai"]),

  // Chats embedded in other products. Only surfaces that exist as web pages can be supported.
  entry("notion-ai", "Notion AI", "embedded", "experimental", ["notion.so/chat"], {
    note: "Only the full-page Notion AI chat is detected, not the in-page sidebar."
  }),
  entry("github-copilot", "GitHub Copilot Chat", "embedded", "experimental", [
    "github.com/copilot",
    "github.dev",
    "vscode.dev",
    "insiders.vscode.dev"
  ]),
  entry("cursor", "Cursor", "embedded", "experimental", ["cursor.com/agents"], {
    note: "Cursor's desktop app cannot be reached by a browser extension; only the web agents page."
  }),
  entry("sourcegraph-cody", "Sourcegraph Cody", "embedded", "experimental", [
    "sourcegraph.com/cody"
  ]),
  entry("windsurf", "Windsurf", "embedded", "detect-only", ["windsurf.com"], {
    note: "Windsurf chat lives in the desktop editor, which a browser extension cannot read."
  }),
  entry("codeium", "Codeium", "embedded", "detect-only", ["codeium.com"], {
    note: "Codeium chat lives in editor plugins, which a browser extension cannot read."
  }),
  entry("zed", "Zed", "embedded", "detect-only", ["zed.dev"], {
    note: "Zed's assistant is native to the editor; there is no web chat to export."
  }),
  entry("continue", "Continue", "embedded", "detect-only", ["continue.dev"], {
    note: "Continue chat lives in the IDE extension; the hub site has no chat to export."
  })
];

export function matchesHostPattern(pattern: string, hostname: string, pathname = ""): boolean {
  const slash = pattern.indexOf("/");
  const host = slash === -1 ? pattern : pattern.slice(0, slash);
  const pathPrefix = slash === -1 ? "" : pattern.slice(slash);
  const normalizedHost = hostname.toLowerCase();

  const hostMatches = normalizedHost === host || normalizedHost.endsWith(`.${host}`);
  if (!hostMatches) {
    return false;
  }
  if (!pathPrefix) {
    return true;
  }
  // `/chat` must match `/chat` and `/chat/abc` but not `/chatter`.
  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

export function detectPlatformByLocation(hostname: string, pathname = ""): PlatformEntry | null {
  return (
    PLATFORMS.find((platform) =>
      platform.hosts.some((pattern) => matchesHostPattern(pattern, hostname, pathname))
    ) ?? null
  );
}

export function detectPlatform(url: string | undefined | null): PlatformEntry | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    return detectPlatformByLocation(parsed.hostname, parsed.pathname);
  } catch {
    return null;
  }
}

export function getPlatformById(id: string): PlatformEntry | undefined {
  return PLATFORMS.find((platform) => platform.id === id);
}

export function toPlatformInfo(platform: PlatformEntry): PlatformInfo {
  return { id: platform.id, name: platform.name, kind: platform.kind };
}
