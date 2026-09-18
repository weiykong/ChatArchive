import { extractKeywords, estimateTokens } from "../text.ts";
import type { Conversation, ConversationMessage } from "../types.ts";

export interface ChunkOptions {
  /** Soft cap per chunk in characters (~4 chars/token). Default 1600, about 400 tokens. */
  maxChars?: number;
  /** Messages carried over from the previous chunk so retrieval keeps question/answer context. */
  overlapMessages?: number;
}

export interface RagChunk {
  id: string;
  text: string;
  metadata: {
    conversation_id: string;
    title: string;
    platform: string;
    url: string;
    /** Export time. Page scraping cannot recover per-message timestamps. */
    date: string;
    tags: string[];
    chunk_index: number;
    chunk_count: number;
    message_start: number;
    message_end: number;
    roles: string[];
    token_estimate: number;
  };
}

function label(message: ConversationMessage): string {
  return message.role === "user" ? "User" : message.role === "assistant" ? "Assistant" : message.role;
}

/** Split an oversize message on paragraph boundaries, never inside a fenced code block. */
export function splitLongText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const blocks: string[] = [];
  let buffer = "";
  let inFence = false;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
    }
    buffer += `${line}\n`;
    if (!inFence && line.trim() === "") {
      blocks.push(buffer);
      buffer = "";
    }
  }
  if (buffer) {
    blocks.push(buffer);
  }

  const parts: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length > maxChars) {
      parts.push(current.trim());
      current = "";
    }
    if (block.length > maxChars) {
      // A single block (long code fence or wall of text) is still too big: hard-split it.
      for (let i = 0; i < block.length; i += maxChars) {
        parts.push(block.slice(i, i + maxChars).trim());
      }
    } else {
      current += block;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts.filter(Boolean);
}

export function chunkConversation(conversation: Conversation, options: ChunkOptions = {}): RagChunk[] {
  const maxChars = options.maxChars ?? 1600;
  const overlap = options.overlapMessages ?? 1;

  interface Piece {
    text: string;
    messageIndex: number;
    role: string;
  }

  const pieces: Piece[] = conversation.messages.flatMap((message) =>
    splitLongText(message.content, maxChars - 20).map((part) => ({
      text: `${label(message)}: ${part}`,
      messageIndex: message.index,
      role: message.role
    }))
  );

  const groups: Piece[][] = [];
  let group: Piece[] = [];
  let size = 0;
  for (const piece of pieces) {
    if (group.length > 0 && size + piece.text.length > maxChars) {
      groups.push(group);
      const carried = overlap > 0 ? group.slice(-overlap) : [];
      // Do not carry an overlap that would itself overflow the next chunk.
      group = carried.filter((p) => p.text.length + piece.text.length <= maxChars);
      size = group.reduce((sum, p) => sum + p.text.length, 0);
    }
    group.push(piece);
    size += piece.text.length + 2;
  }
  if (group.length > 0) {
    groups.push(group);
  }

  const tags =
    conversation.tags && conversation.tags.length > 0
      ? conversation.tags
      : extractKeywords(conversation.messages.map((m) => m.content));
  const date = conversation.exportedAt;

  return groups.map((pieceGroup, chunkIndex) => {
    const text = pieceGroup.map((p) => p.text).join("\n\n");
    const indices = pieceGroup.map((p) => p.messageIndex);
    return {
      id: `${conversation.id}#${chunkIndex}`,
      text,
      metadata: {
        conversation_id: conversation.id,
        title: conversation.title,
        platform: conversation.platform.id,
        url: conversation.url,
        date,
        tags,
        chunk_index: chunkIndex,
        chunk_count: groups.length,
        message_start: Math.min(...indices),
        message_end: Math.max(...indices),
        roles: [...new Set(pieceGroup.map((p) => p.role))],
        token_estimate: estimateTokens(text)
      }
    };
  });
}

/** One JSON object per line; `id`/`text`/`metadata` is what LlamaIndex, LangChain and most vector DB loaders expect. */
export function toRagJsonl(conversations: Conversation[], options: ChunkOptions = {}): string {
  return conversations
    .flatMap((conversation) => chunkConversation(conversation, options))
    .map((chunk) => JSON.stringify(chunk))
    .join("\n")
    .concat("\n");
}
