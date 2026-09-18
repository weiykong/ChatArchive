/** ~4 chars per token is the usual rule of thumb for English; CJK is closer to 1-2, so this errs low. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const STOPWORDS = new Set(
  (
    "a about after all also an and any are as at be because been but by can could did do does " +
    "for from get got had has have how i if in into is it its just like make me more my no not of " +
    "on one or our out over please so some than that the their them then there these they this " +
    "to up us use using was we were what when which who why will with would you your"
  ).split(" ")
);

/**
 * Cheap, dependency-free topic tags: the most frequent non-stopword terms, with a boost for
 * words in the first user message and for code-ish identifiers. Replaced by LLM tags when available.
 */
export function extractKeywords(texts: string[], limit = 5): string[] {
  const counts = new Map<string, number>();
  texts.forEach((text, textIndex) => {
    const withoutCode = text.replace(/```[\s\S]*?```/g, " ");
    for (const match of withoutCode.toLowerCase().matchAll(/[a-z][a-z0-9+#.-]{2,}/g)) {
      const word = match[0].replace(/[.-]+$/, "");
      if (word.length < 3 || STOPWORDS.has(word)) {
        continue;
      }
      counts.set(word, (counts.get(word) ?? 0) + (textIndex === 0 ? 3 : 1));
    }
  });

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function slugify(value: string, maxLength = 80): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}
