import { parquetWriteBuffer } from "hyparquet-writer";
import { estimateTokens, wordCount } from "../text.ts";
import type { Conversation } from "../types.ts";

/**
 * One row per message, flat columns, so it loads straight into DuckDB / pandas / Polars:
 *   SELECT platform, avg(char_count) FROM 'chats.parquet' GROUP BY 1
 */
export function toParquet(conversations: Conversation[]): Uint8Array {
  const rows = conversations.flatMap((conversation) =>
    conversation.messages.map((message) => ({ conversation, message }))
  );

  const buffer = parquetWriteBuffer({
    columnData: [
      { name: "conversation_id", type: "STRING", data: rows.map((r) => r.conversation.id) },
      { name: "title", type: "STRING", data: rows.map((r) => r.conversation.title) },
      { name: "platform", type: "STRING", data: rows.map((r) => r.conversation.platform.id) },
      { name: "url", type: "STRING", data: rows.map((r) => r.conversation.url) },
      {
        name: "exported_at",
        type: "TIMESTAMP",
        data: rows.map((r) => new Date(r.conversation.exportedAt))
      },
      { name: "message_index", type: "INT32", data: rows.map((r) => r.message.index) },
      { name: "role", type: "STRING", data: rows.map((r) => r.message.role) },
      { name: "author", type: "STRING", data: rows.map((r) => r.message.author) },
      { name: "content", type: "STRING", data: rows.map((r) => r.message.content) },
      { name: "char_count", type: "INT32", data: rows.map((r) => r.message.content.length) },
      { name: "word_count", type: "INT32", data: rows.map((r) => wordCount(r.message.content)) },
      {
        name: "token_estimate",
        type: "INT32",
        data: rows.map((r) => estimateTokens(r.message.content))
      },
      {
        name: "has_code",
        type: "BOOLEAN",
        data: rows.map((r) => r.message.content.includes("```"))
      },
      {
        name: "extraction_source",
        type: "STRING",
        data: rows.map((r) => r.conversation.extraction.source)
      },
      {
        name: "tags",
        type: "STRING",
        data: rows.map((r) => (r.conversation.tags ?? []).join(","))
      }
    ]
  });

  return new Uint8Array(buffer);
}
