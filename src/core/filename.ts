import { slugify } from "./text.ts";
import type { Conversation } from "./types.ts";

const UNSAFE_FILENAME_CHARS = '<>:"/\\|?*\u0000-\u001f';
const UNSAFE_FILENAME = new RegExp(`[${UNSAFE_FILENAME_CHARS}]`, "g");

export function sanitizeFilename(name: string): string {
  return name.replace(UNSAFE_FILENAME, "-").replace(/\s+/g, " ").replace(/^\.+/, "").trim().slice(0, 180);
}

/** Same `{token}` template the popup already uses for the legacy formats. */
export function buildFilename(
  conversation: Conversation,
  extension: string,
  template?: string
): string {
  const iso = conversation.exportedAt;
  const values: Record<string, string> = {
    platform: conversation.platform.name,
    title: slugify(conversation.title) || "export",
    date: iso.slice(0, 10),
    time: iso.slice(11, 19).replace(/:/g, "-"),
    source: conversation.extraction.source,
    strategy: conversation.extraction.strategy ?? "unknown",
    count: String(conversation.messages.length)
  };

  const fallback = `[${values.platform}] ${values.title} - ${values.date}`;
  const rendered = template ? template.replace(/\{(\w+)\}/g, (_, token) => values[token] ?? "") : fallback;
  const base = sanitizeFilename(rendered) || sanitizeFilename(fallback);
  return base.endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}
