import type { Conversation } from "../types.ts";

/** JSON strings are valid YAML double-quoted scalars, which sidesteps every escaping edge case. */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

function tagFor(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface FrontmatterOptions {
  /** Extra tags, e.g. topic tags generated from the transcript. */
  tags?: string[];
}

/**
 * Markdown with YAML frontmatter, readable by Obsidian (Properties) and Logseq (page properties).
 * Headings rather than callouts keep it portable between the two.
 */
export function toMarkdownWithFrontmatter(
  conversation: Conversation,
  options: FrontmatterOptions = {}
): string {
  const tags = Array.from(
    new Set(
      [
        "ai-chat",
        tagFor(conversation.platform.id),
        ...(conversation.tags ?? []).map(tagFor),
        ...(options.tags ?? []).map(tagFor)
      ].filter(Boolean)
    )
  );

  const lines = [
    "---",
    `title: ${yamlString(conversation.title)}`,
    `aliases: [${yamlString(conversation.title)}]`,
    `created: ${conversation.exportedAt}`,
    `platform: ${yamlString(conversation.platform.name)}`,
    `source: ${yamlString(conversation.url)}`,
    `conversation_id: ${conversation.id}`,
    `message_count: ${conversation.messages.length}`,
    `partial: ${conversation.extraction.partial}`,
    `tags: [${tags.join(", ")}]`,
    "---",
    "",
    `# ${conversation.title.replace(/\n/g, " ")}`,
    ""
  ];

  for (const message of conversation.messages) {
    lines.push(`## ${message.author}`, "", message.content, "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
