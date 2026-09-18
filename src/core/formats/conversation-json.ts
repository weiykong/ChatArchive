import type { Conversation } from "../types.ts";

export function toConversationJson(conversation: Conversation): string {
  return `${JSON.stringify(conversation, null, 2)}\n`;
}
