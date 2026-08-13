/**
 * Size arithmetic: characters and an estimated token count.
 *
 * The token count is an ESTIMATE, not a tokenizer. Real tokenizers differ
 * between vendors and shipping one would mean shipping a vocabulary file,
 * which buys precision the thresholds here do not deserve. Four characters
 * per token is the common rule of thumb for English prose, and it is
 * deterministic: same text, same number, always. Every message that shows a
 * token number calls it an estimate.
 */

/** Characters per estimated token. */
export const CHARS_PER_TOKEN = 4

/**
 * Moveworks' published hard maximum for one chunk under structure-aware
 * chunking. Above this the vendor's own software splits the piece further.
 * Their target size is 256 tokens; the target is context for the finding,
 * not a threshold, because ordinary 200-word sections sit above it.
 */
export const MOVEWORKS_HARD_MAX_TOKENS = 512
export const MOVEWORKS_TARGET_TOKENS = 256

/** Characters of a snippet a Moveworks user is shown in chat. */
export const MOVEWORKS_SNIPPET_CHARS = 500

/** Collapsed length: runs of whitespace count as one character. */
export function displayLength(text: string): number {
  return text.replace(/\s+/g, ' ').trim().length
}

/** Estimated tokens for a piece of text. Deterministic, no model. */
export function estimateTokens(text: string): number {
  return Math.ceil(displayLength(text) / CHARS_PER_TOKEN)
}
