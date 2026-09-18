import { stripThinking } from "../conversation.ts";
import type { Conversation } from "../types.ts";

export interface JsonlOptions {
  /** Add a `metadata` object per line. Off by default: OpenAI-style fine-tuning APIs reject unknown keys. */
  includeMetadata?: boolean;
  /** Drop `<think>…</think>` reasoning traces. Default true. */
  stripThinking?: boolean;
}

/**
 * Chat-format JSONL: one line per conversation, `{"messages":[{"role","content"}…]}`.
 * This is the shape OpenAI, Together, Fireworks, and most open-source SFT trainers
 * (TRL, Axolotl, Unsloth) accept directly.
 */
export function toJsonl(conversation: Conversation, options: JsonlOptions = {}): string {
  const shouldStrip = options.stripThinking !== false;
  const messages = conversation.messages
    .map((message) => ({
      role: message.role,
      content: shouldStrip ? stripThinking(message.content) : message.content
    }))
    .filter((message) => message.content.length > 0);

  const record: Record<string, unknown> = { messages };
  if (options.includeMetadata) {
    record.metadata = {
      id: conversation.id,
      title: conversation.title,
      platform: conversation.platform.name,
      url: conversation.url,
      exported_at: conversation.exportedAt
    };
  }

  return `${JSON.stringify(record)}\n`;
}
