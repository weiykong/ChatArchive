/** A message as produced by the DOM/state/API extractors. */
export interface RawMessage {
  author: string;
  content: string;
  strategy?: string;
}

export type Role = "user" | "assistant" | "system" | "tool";

export type TitleSource = "page" | "document" | "derived" | "llm" | "untitled";

export type ExtractionSource = "dom" | "state" | "api" | "page" | "ai-selectors" | "ai-text";

export interface ConversationMessage {
  index: number;
  role: Role;
  author: string;
  content: string;
}

export type PlatformKind = "chat" | "playground" | "embedded";

export interface PlatformInfo {
  id: string;
  name: string;
  kind: PlatformKind;
}

/**
 * Standardized interchange schema. Bump the version suffix on breaking changes;
 * consumers should check `schema` before reading anything else.
 */
export const CONVERSATION_SCHEMA = "chatarchive.conversation/v1";

export interface Conversation {
  schema: typeof CONVERSATION_SCHEMA;
  /** Stable across re-exports of the same URL, so downstream tools can upsert. */
  id: string;
  title: string;
  titleSource: TitleSource;
  platform: PlatformInfo;
  url: string;
  exportedAt: string;
  /** Topic tags (LLM-generated when enabled). Optional so v1 consumers stay valid. */
  tags?: string[];
  extraction: {
    source: ExtractionSource;
    strategy: string | null;
    confidence: number | null;
    partial: boolean;
  };
  messages: ConversationMessage[];
}

export interface ExportPayload {
  filename: string;
  mimeType: string;
  /** Text for text formats, base64 for binary formats (Parquet). */
  content: string;
  encoding: "utf8" | "base64";
  metadata?: unknown;
}
