import { buildFilename } from "../filename.ts";
import type { Conversation, ExportPayload } from "../types.ts";
import { toConversationJson } from "./conversation-json.ts";
import { toJsonl } from "./jsonl.ts";
import { toMarkdownWithFrontmatter } from "./markdown-frontmatter.ts";
import { toParquet } from "./parquet.ts";
import { toRagJsonl } from "./rag-chunks.ts";

/**
 * Formats produced from a normalized `Conversation`. The older formats (md, html, pdf, txt,
 * csv, json, obsidian) are still built inside the content script by src/content/exporters.js.
 */
export const ADVANCED_FORMATS = [
  "jsonl",
  "parquet",
  "md-frontmatter",
  "conversation-json",
  "rag-jsonl"
] as const;

export type AdvancedFormat = (typeof ADVANCED_FORMATS)[number];

export function isAdvancedFormat(value: string): value is AdvancedFormat {
  return (ADVANCED_FORMATS as readonly string[]).includes(value);
}

export interface FormatOptions {
  filenameTemplate?: string;
  includeMetadata?: boolean;
  maxChunkChars?: number;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

export function formatConversation(
  format: AdvancedFormat,
  conversation: Conversation,
  options: FormatOptions = {}
): ExportPayload {
  const name = (extension: string) => buildFilename(conversation, extension, options.filenameTemplate);

  switch (format) {
    case "jsonl":
      return {
        filename: name("jsonl"),
        mimeType: "application/x-ndjson;charset=utf-8",
        encoding: "utf8",
        content: toJsonl(conversation, { includeMetadata: options.includeMetadata })
      };
    case "parquet":
      return {
        filename: name("parquet"),
        mimeType: "application/vnd.apache.parquet",
        encoding: "base64",
        content: toBase64(toParquet([conversation]))
      };
    case "md-frontmatter":
      return {
        filename: name("md"),
        mimeType: "text/markdown;charset=utf-8",
        encoding: "utf8",
        content: toMarkdownWithFrontmatter(conversation)
      };
    case "conversation-json":
      return {
        filename: name("conversation.json"),
        mimeType: "application/json;charset=utf-8",
        encoding: "utf8",
        content: toConversationJson(conversation)
      };
    case "rag-jsonl":
      return {
        filename: name("chunks.jsonl"),
        mimeType: "application/x-ndjson;charset=utf-8",
        encoding: "utf8",
        content: toRagJsonl([conversation], { maxChars: options.maxChunkChars })
      };
  }
}
