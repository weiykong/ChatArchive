import type {
  Conversation,
  ConversationMessage,
  ExtractionSource,
  PlatformInfo,
  RawMessage,
  Role,
  TitleSource
} from "./types.ts";
import { CONVERSATION_SCHEMA } from "./types.ts";

export interface BuildConversationInput {
  platform: PlatformInfo;
  /** Label the adapter uses for the human side, e.g. "You". */
  userLabel: string;
  title: string;
  titleSource: TitleSource;
  url: string;
  messages: RawMessage[];
  source: ExtractionSource;
  strategy?: string | null;
  tags?: string[];
  confidence?: number | null;
  partial?: boolean;
  now?: Date;
}

/** FNV-1a, 32 bit. Good enough for a stable, non-cryptographic conversation id. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Strip query/hash so `?utm=…` does not change the id of the same conversation. */
export function conversationIdFor(platformId: string, url: string): string {
  let canonical = url;
  try {
    const parsed = new URL(url);
    canonical = `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    // Not a URL (tests, file exports); hash it as-is.
  }
  return `${platformId}-${fnv1a(canonical)}`;
}

export function inferRole(author: string, userLabel: string): Role {
  const normalized = author.trim().toLowerCase();
  if (normalized === userLabel.trim().toLowerCase() || normalized === "you" || normalized === "user") {
    return "user";
  }
  if (normalized === "system") {
    return "system";
  }
  if (normalized === "tool") {
    return "tool";
  }
  return "assistant";
}

export function buildConversation(input: BuildConversationInput): Conversation {
  const messages: ConversationMessage[] = input.messages.map((message, index) => ({
    index,
    role: inferRole(message.author, input.userLabel),
    author: message.author,
    content: message.content
  }));

  return {
    schema: CONVERSATION_SCHEMA,
    id: conversationIdFor(input.platform.id, input.url),
    title: input.title,
    titleSource: input.titleSource,
    platform: input.platform,
    url: input.url,
    exportedAt: (input.now ?? new Date()).toISOString(),
    ...(input.tags?.length ? { tags: input.tags } : {}),
    extraction: {
      source: input.source,
      strategy: input.strategy ?? null,
      confidence: input.confidence ?? null,
      partial: Boolean(input.partial)
    },
    messages
  };
}

export function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<Conversation>;
  return (
    candidate.schema === CONVERSATION_SCHEMA &&
    typeof candidate.id === "string" &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(
      (message) =>
        message &&
        typeof message.content === "string" &&
        ["user", "assistant", "system", "tool"].includes(message.role)
    )
  );
}

const THINK_BLOCK = /<think>[\s\S]*?<\/think>\s*/g;

/** Reasoning traces and tool-result wrappers are noise in training data. */
export function stripThinking(content: string): string {
  return content.replace(THINK_BLOCK, "").trim();
}
