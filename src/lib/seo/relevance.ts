const STOPWORDS = new Set([
  "de", "het", "een", "en", "of", "van", "voor", "met", "op", "in", "te", "je",
  "jouw", "mijn", "wat", "is", "hoe", "waarom", "welke", "beste", "zijn", "aan",
  "bij", "door", "naar", "die", "dat", "als", "the", "a", "an", "of", "for",
  "with", "to", "how", "what", "best", "your",
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9àâäéèêëïîôöùûüç]+/i)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

/**
 * Bouwt de woordenschat van het bedrijf uit niche, doelgroep, seeds en paginatitels.
 *
 * Woorden die in meer dan de helft van de zoekwoorden voorkomen (voor een
 * AI-bedrijf is dat bijvoorbeeld "ai") zeggen niets over relevantie — daarmee
 * zou "ai foto maken" net zo goed matchen als "ai training". Die filteren we weg.
 */
export function buildVocabulary(
  context: string[],
  keywords: string[]
): Set<string> {
  const vocabulary = new Set(context.flatMap(tokenize));

  const frequency = new Map<string, number>();
  for (const keyword of keywords) {
    for (const token of new Set(tokenize(keyword))) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  const ubiquitous = keywords.length * 0.5;
  for (const [token, count] of frequency) {
    if (count > ubiquitous) vocabulary.delete(token);
  }
  return vocabulary;
}

/** Deelt dit zoekwoord minstens één betekenisvol woord met de dienstverlening? */
export function isRelevant(keyword: string, vocabulary: Set<string>): boolean {
  const tokens = tokenize(keyword);
  if (tokens.length === 0) return false;
  return tokens.some((token) => vocabulary.has(token));
}
