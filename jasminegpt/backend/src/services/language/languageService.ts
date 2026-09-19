/**
 * JasmineGPT — Multilingual Engine (English ↔ Kannada)
 * =======================================================
 * Production-ready multilingual service providing:
 * 1. Automatic Language Detection (English, Kannada script, transliterated mixed)
 * 2. Query Normalization (translates Kannada/mixed queries to English, preserving cultivars & agronomic entities)
 * 3. Scientific Entity & Citation Placeholder Masking (protects entities, titles, DOIs, numbers before translation)
 * 4. Markdown-Preserving Kannada Response Translation (translates only natural language text, keeping tables and headings intact)
 * 5. Deterministic Offline Fallback translation when LLM is offline
 */

import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import type { LanguagePreference, DetectedLanguage } from '../../types';

// ────────────────────────────────────────────────────────────────────────────
// 1. Language Detection
// ────────────────────────────────────────────────────────────────────────────

const KANNADA_UNICODE_REGEX = /[\u0C80-\u0CFF]/;

const TRANSLITERATED_KANNADA_PATTERNS: RegExp[] = [
  /\b(?:yavaga|yava|yavudu|yavudhu)\b/i,
  /\b(?:madbeku|madabeku|madodu|maduva|madalu)\b/i,
  /\b(?:hege|hegey|heg)\b/i,
  /\b(?:enu|yenu)\b/i,
  /\b(?:beku|bekagide|beku?)\b/i,
  /\b(?:gobbara|gobbaravannu|gobbarada)\b/i,
  /\b(?:neeru|neerannu|neerina)\b/i,
  /\b(?:mallige|malligey|malligeya)\b/i,
  /\b(?:gundumalli\s*ge|mallige\s*ge)\b/i,
  /\b(?:kottige|kottige\s*gobbara)\b/i,
  /\b(?:roga|rogagalu|keeta|keetagalu)\b/i,
  /\b(?:kattarisu|kattarisuvudu|kattarisabeku)\b/i,
  /\b(?:koylu|koyilu)\b/i,
  /\b(?:araluvudu|araladilla|aralalla)\b/i,
  /\b(?:huvu|huvugalu|moggu|moggugalu)\b/i,
  /\b(?:chiguruvudu|chiguru)\b/i,
  /\b(?:belavani|belavanige)\b/i,
  /\b(?:unopened\s*buds\s*ge|buds\s*ge)\b/i,
];

/**
 * Detects whether the input message is in English, native Kannada script, or transliterated Kannada.
 */
export function detectLanguage(
  text: string,
  preference?: LanguagePreference,
): { detected: DetectedLanguage; target: 'en' | 'kn' } {
  if (!text) {
    return { detected: 'en', target: 'en' };
  }

  // 1. Check native Kannada Unicode characters
  const hasKannadaScript = KANNADA_UNICODE_REGEX.test(text);

  // 2. Check transliterated Kannada keywords
  const transliteratedMatchCount = TRANSLITERATED_KANNADA_PATTERNS.filter((pattern) =>
    pattern.test(text),
  ).length;

  const isDetectedKannada = hasKannadaScript || transliteratedMatchCount >= 1;
  const detectedLang: DetectedLanguage = isDetectedKannada ? 'kn' : 'en';

  // 3. Resolve target language according to user preference
  let targetLang: 'en' | 'kn' = detectedLang;
  if (preference === 'kn') {
    targetLang = 'kn';
  } else if (preference === 'en') {
    targetLang = 'en';
  }

  return { detected: detectedLang, target: targetLang };
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Protected Entities & Placeholder Masking
// ────────────────────────────────────────────────────────────────────────────

const PROTECTED_ENTITIES: string[] = [
  'Jasminum sambac',
  'Jasminum auriculatum',
  'Jasminum grandiflorum',
  'Jasminum multiflorum',
  'Ramanathapuram Gundumalli',
  'Mysuru Mallige',
  'Hadagali Mallige',
  'Udupi Mallige',
  'Gundumalli',
  'Baramasi',
  'Mogra',
  'Single Mogra',
  'Double Mogra',
  'Kakada',
  'Suvasini',
  'Pacha Mullai',
  'Arka Arpan',
  'Arka Surabhi',
  'Co.1',
  'Co.2',
  'Panchagavya',
  'Humic acid',
  'Boric acid',
  'Salicylic acid',
  'Silver nitrate',
  'Chitosan',
  'Corrugated fiber board',
  'CFB',
  'LDPE',
  'HDPE',
  'PP packaging',
  'NPK',
  'GA3',
  'NAA',
  '100% IW/CPE',
  '80% IW/CPE',
  '60% IW/CPE',
  'IW/CPE',
  'Contarinia maculipennis',
  'Hendecasis duplifascialis',
  'Tetranychus urticae',
];

interface PlaceholderMap {
  maskedText: string;
  replacements: Map<string, string>;
}

/**
 * Detects whether the text is already translated Kannada content
 * to ensure translation runs strictly once and never on already translated Kannada content.
 */
export function isAlreadyKannada(text: string): boolean {
  if (!text) return false;
  // Count Kannada Unicode characters (U+0C80 to U+0CFF)
  const kannadaMatches = text.match(/[\u0C80-\u0CFF]/g);
  if ((kannadaMatches?.length ?? 0) >= 5) {
    return true;
  }
  return /###\s*\d+\.\s*[\u0C80-\u0CFF]/.test(text);
}

/**
 * Checks whether any word or phrase (1 to 8 words) repeats consecutively more than `maxConsecutive` times.
 * Default maxConsecutive = 3, meaning if a word or phrase repeats more than 3 consecutive times
 * (i.e. appears consecutively 4 or more times, or repeats >3 times in unbroken sequence), it returns true.
 */
export function hasConsecutiveRepetition(text: string, maxConsecutive: number = 3): boolean {
  if (!text) return false;

  // 1. Quick regex check for unbroken word repetitions (with or without spaces)
  // E.g., word word word word or wordwordwordword
  const unspacedRegex = /([\p{L}\u0C80-\u0CFF]{3,})\1{3,}/u;
  if (unspacedRegex.test(text)) {
    return true;
  }

  // 2. Tokenize words containing Unicode letters (Kannada or Latin)
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim())
    .filter((w) => w.length > 0 && /[\p{L}\u0C80-\u0CFF]/u.test(w));

  if (words.length <= maxConsecutive) {
    return false;
  }

  // 3. Check n-gram phrases (n = 1 to 8 words)
  const maxNgram = Math.min(8, Math.floor(words.length / (maxConsecutive + 1)));

  for (let n = 1; n <= maxNgram; n++) {
    for (let i = 0; i <= words.length - n * (maxConsecutive + 1); i++) {
      const phrase = words.slice(i, i + n).join(' ').toLowerCase();
      let matchCount = 1;
      let j = i + n;

      while (j + n <= words.length) {
        const nextPhrase = words.slice(j, j + n).join(' ').toLowerCase();
        if (nextPhrase === phrase) {
          matchCount++;
          j += n;
          if (matchCount > maxConsecutive) {
            return true;
          }
        } else {
          break;
        }
      }
    }
  }

  return false;
}

/**
 * Deduplicates excessive consecutive identical words
 * (where a word repeats 3 or more consecutive times) down to a single clean occurrence.
 */
export function deduplicateRepetitions(text: string): string {
  if (!text) return text;
  return text.replace(
    /(?:^|\s)([\p{L}\u0C80-\u0CFF]{2,})(?:\s+\1){2,}(?=\s|$)/gu,
    (match, word) => {
      const leadingSpace = match.startsWith(' ') ? ' ' : '';
      return `${leadingSpace}${word}`;
    },
  );
}

/**
 * Replaces scientific entities, paper titles, DOIs, citations, numbers, and ratios with indexed placeholders.
 */
export function maskProtectedEntities(text: string): PlaceholderMap {
  const replacements = new Map<string, string>();
  let count = 0;
  let result = text;

  // 1. Mask Paper Titles from bullet lists (e.g. "- **Paper Title**: ...")
  const paperTitleRegex = /(- \*\*Paper Title\*\*:\s*)([^\n]+)/g;
  result = result.replace(paperTitleRegex, (_match, prefix, title) => {
    const key = `{{TITLE_MASK_${count++}}}`;
    replacements.set(key, title);
    return `${prefix}${key}`;
  });

  // 2. Mask DOIs
  const doiRegex = /\b(?:doi:\s*|https?:\/\/doi\.org\/)?(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/gi;
  result = result.replace(doiRegex, (match) => {
    const key = `{{DOI_MASK_${count++}}}`;
    replacements.set(key, match);
    return key;
  });

  // 3. Mask Author-Year Citations (e.g. "Jawaharlal et al., 2012" or "(Choudhury et al., 2019)")
  const citationRegex = /\(?\b[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?,\s*(?:19|20)\d{2}\)?/g;
  result = result.replace(citationRegex, (match) => {
    const key = `{{CITE_MASK_${count++}}}`;
    replacements.set(key, match);
    return key;
  });

  // 4. Mask Protected Entities (cultivars, species, chemicals)
  for (const entity of PROTECTED_ENTITIES) {
    const regex = new RegExp(`\\b${entity.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, (matchedStr) => {
      const key = `{{ENTITY_MASK_${count++}}}`;
      replacements.set(key, matchedStr);
      return key;
    });
  }

  // 5. Mask fertilizer ratios (e.g. "60:120:120 g", "150:100:100 g/plant/year", "60:120:120")
  const ratioRegex = /\b\d+(?::\d+)+(?:\s*(?:g\/plant\/year|g\/plant|kg\/ha|t\/ha|g))?\b/gi;
  result = result.replace(ratioRegex, (match) => {
    const key = `{{RATIO_MASK_${count++}}}`;
    replacements.set(key, match);
    return key;
  });

  // 6. Mask exact temperatures, percentages, and units (e.g. 4°C, 3%, 0.4%, 500 ppm, 45 cm)
  const tempAndUnitRegex = /(?:(?<=\s|^)\d+(?:\.\d+)?|\b\d+(?:\.\d+)?)\s*(?:°C|%|ppm|mg\/l|g\/plant\/year|g\/plant|t\/ha|kg\/ha|g|cm|mm|days|hrs|hours)(?=\s|[.,;!?)]|$)/gi;
  result = result.replace(tempAndUnitRegex, (match) => {
    const key = `{{UNIT_MASK_${count++}}}`;
    replacements.set(key, match);
    return key;
  });

  return { maskedText: result, replacements };
}

/**
 * Restores all masked placeholders in the translated text back to their exact original strings.
 */
export function unmaskProtectedEntities(text: string, replacements: Map<string, string>): string {
  let restored = text;
  for (const [placeholder, originalValue] of replacements.entries()) {
    // Handle potential whitespace added around placeholders by translation
    const flexiblePattern = new RegExp(
      placeholder.replace(/[{}]/g, '\\$&').replace('_', '[_\\s]*'),
      'g',
    );
    restored = restored.replace(flexiblePattern, originalValue);
  }
  return restored;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Query Normalization (Kannada / Mixed → English)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Intent-extraction table — ordered from most-specific (multi-word) to least-specific (single-word)
 * so that phrases like "ಹೂ ಬಿಡುವಿಕೆ" are matched before the single-word "ಹೂ" entry.
 * Each entry also carries a `canonicalIntent` label used to anchor the LLM translation prompt.
 */
const KANNADA_TERM_MAP: Array<{ pattern: RegExp; replacement: string; canonicalIntent?: string }> = [
  // ── Multi-word phrases (must come first) ─────────────────────────────────
  { pattern: /ಹೂ\s*ಬಿಡುವಿಕೆ/gi, replacement: 'flowering', canonicalIntent: 'flowering' },
  { pattern: /\bಸಣ್ಣ\s*ಮೊಗ್ಗುಗಳು\b|\bತೆರೆಯದ\s*ಮೊಗ್ಗುಗಳು\b/gi, replacement: 'small unopened buds' },
  { pattern: /\bgundumalli\s*ge\b/gi, replacement: 'for Gundumalli' },
  { pattern: /\byavaga\s*madbeku\b|\byavaga\s*madabeku\b/gi, replacement: 'when should be done' },
  { pattern: /\bpruning\s*yavaga\s*madbeku\b/gi, replacement: 'when to do pruning' },
  { pattern: /\bneeru\s*yavaga\s*kodbeku\b/gi, replacement: 'irrigation schedule' },
  { pattern: /\bgobbara\s*yavudu\s*uttama\b/gi, replacement: 'which fertilizer is best', canonicalIntent: 'fertilizer nutrient management' },
  // ── Single-word agricultural topic terms (canonical intent anchors) ───────
  { pattern: /\bಮಲ್ಲಿಗೆಗೆ\b|\bಮಲ್ಲಿಗೆ\b/gi, replacement: 'jasmine Jasminum sambac' },
  { pattern: /\bಗುಂಡುಮಲ್ಲಿಗೆ\b/gi, replacement: 'Gundumalli' },
  // Fertilizer & nutrient management — ಗೊಬ್ಬರ (fertilizer) and ಪೋಷಕಾಂಶ (nutrient)
  {
    pattern: /\bಗೊಬ್ಬರ\b|\bಗೊಬ್ಬರಗಳು\b|\bಪೋಷಕಾಂಶ\b|\bಪೋಷಕಾಂಶಗಳು\b/gi,
    replacement: 'fertilizer nutrient management',
    canonicalIntent: 'fertilizer nutrient management',
  },
  { pattern: /\bನೀರು\b|\bನೀರಾವರಿ\b/gi, replacement: 'irrigation watering', canonicalIntent: 'irrigation' },
  // Pruning — ಕತ್ತರಿಸುವಿಕೆ and all variants
  {
    pattern: /\bಕತ್ತರಿಸು\b|\bಕತ್ತರಿಸುವುದು\b|\bಕತ್ತರಿಕೆ\b|\bಕತ್ತರಿಸುವಿಕೆ\b/gi,
    replacement: 'pruning',
    canonicalIntent: 'pruning',
  },
  { pattern: /\bಸಂಗ್ರಹಣೆ\b|\bಶೇಖರಣೆ\b/gi, replacement: 'storage post-harvest', canonicalIntent: 'storage post-harvest' },
  { pattern: /\bಪ್ಯಾಕಿಂಗ್\b|\bಪ್ಯಾಕೇಜಿಂಗ್\b/gi, replacement: 'packaging packing', canonicalIntent: 'packaging' },
  { pattern: /\bರೋಗ\b|\bಕೀಟ\b/gi, replacement: 'disease pest', canonicalIntent: 'disease pest management' },
  { pattern: /\bಯಾವಾಗ\b/gi, replacement: 'when' },
  { pattern: /\bಹೇಗೆ\b/gi, replacement: 'how' },
  { pattern: /\bಯಾವ\b|\bಏನು\b/gi, replacement: 'which' },
  { pattern: /\bಉತ್ತಮ\b|\bಸೂಕ್ತ\b/gi, replacement: 'recommended best' },
  { pattern: /\bಇಳುವರಿ\b/gi, replacement: 'yield flower production' },
  // ಹೂ (single) must come AFTER multi-word ಹೂ ಬಿಡುವಿಕೆ
  { pattern: /\bಹೂವು\b|\bಹೂಗಳು\b|\bಮೊಗ್ಗು\b|\bಹೂ\b/gi, replacement: 'flower buds' },
  { pattern: /\bಹಳದಿ\b/gi, replacement: 'yellowing' },
  { pattern: /\bಉದುರುವುದು\b/gi, replacement: 'drop shedding' },
];

/**
 * Deterministically extracts canonical agricultural intent labels from a Kannada (or mixed) query
 * by scanning KANNADA_TERM_MAP entries that carry a `canonicalIntent` label.
 *
 * Returns a deduplicated, ordered array of English intent strings such as
 * ["fertilizer nutrient management", "flowering"] for a query containing ಗೊಬ್ಬರ + ಹೂ ಬಿಡುವಿಕೆ.
 *
 * These intents are injected into the LLM translation prompt so the LLM cannot
 * inadvertently drift the topic (e.g. translate a fertilizer query into pruning terms).
 */
function extractIntentHints(query: string): string[] {
  const seen = new Set<string>();
  const intents: string[] = [];
  for (const { pattern, canonicalIntent } of KANNADA_TERM_MAP) {
    if (!canonicalIntent) continue;
    // Reset lastIndex for global RegExp before testing
    const re = new RegExp(pattern.source, pattern.flags);
    if (re.test(query) && !seen.has(canonicalIntent)) {
      seen.add(canonicalIntent);
      intents.push(canonicalIntent);
    }
  }
  return intents;
}

/**
 * Translates Kannada or transliterated queries into normalized English for retrieval,
 * strictly preserving cultivar names, species, and agricultural entities.
 *
 * Intent-anchoring strategy:
 * 1. Deterministically extract canonical agricultural intents from the raw Kannada query
 *    using `extractIntentHints()` BEFORE any LLM call.
 * 2. Inject those detected intents as hard constraints into the LLM prompt so the model
 *    cannot drift the topic (e.g. translate a fertilizer query into pruning vocabulary).
 * 3. After LLM translation, append the detected intents as explicit retrieval keywords so
 *    ChromaDB embedding similarity is anchored to the correct topic even if the LLM phrasing
 *    is imprecise.
 * 4. Dictionary fallback applies the full KANNADA_TERM_MAP if the LLM is unavailable.
 */
export async function normalizeQueryToEnglish(
  query: string,
  sourceLang: DetectedLanguage,
): Promise<string> {
  if (sourceLang === 'en') {
    return query;
  }

  // ── Step 1: Deterministic intent extraction (runs regardless of LLM availability) ──
  const detectedIntents = extractIntentHints(query);
  const intentAnchor = detectedIntents.length > 0 ? detectedIntents.join(', ') : '';
  logger.info({ detectedIntents }, 'Kannada intent hints extracted for query normalization');

  // ── Step 2: LLM translation with intent anchoring ────────────────────────────────
  if (env.OPENROUTER_API_KEY) {
    try {
      // Build an intent-constraint line only when we detected specific topics
      const intentConstraintLine =
        intentAnchor
          ? `- The query is specifically about: ${intentAnchor}. Your translation MUST use exactly these topic terms. Do NOT use synonyms that could mismatch retrieval (e.g. if the topic is "fertilizer nutrient management", do NOT output "pruning" or "trimming").\n`
          : '';

      const prompt =
        `You are a translation assistant for agricultural queries about jasmine flowers (Jasminum sambac / Jasminum auriculatum).\n` +
        `Translate the following Kannada / mixed Kannada query into clear, concise English for searching an English scientific research database.\n\n` +
        `CRITICAL RULES:\n` +
        intentConstraintLine +
        `- Preserve exact agricultural entities: Jasminum sambac, Jasminum auriculatum, Gundumalli, Ramanathapuram Gundumalli, Mogra, Baramasi, Mysuru Mallige, Panchagavya, Humic acid, NPK, GA3, NAA, IW/CPE.\n` +
        `- Do not translate cultivar names.\n` +
        `- Output ONLY the translated English query, nothing else.\n\n` +
        `Query: ${query}`;

      const response = await axios.post(
        `${env.OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: env.OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.0,
          max_tokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 8_000,
        },
      );

      const translated: string = response.data?.choices?.[0]?.message?.content?.trim() ?? '';
      if (translated && translated.length > 3) {
        const clean = translated.replace(/^["']|["']$/g, '').trim();
        // ── Step 3: Append intent anchor as a retrieval safety guarantee ──────────────
        // Even if the LLM translation is phrased differently, appending the canonical
        // topic terms ensures the embedding query vector is pulled toward the correct
        // section of the vector space.
        if (intentAnchor && !detectedIntents.every((intent) => clean.toLowerCase().includes(intent.toLowerCase().split(' ')[0]))) {
          logger.info({ intentAnchor }, 'Appending intent anchor to LLM-translated query');
          return `${clean} [${intentAnchor}]`;
        }
        return clean;
      }
    } catch (err) {
      logger.warn({ err }, 'LLM query normalization failed — using dictionary fallback');
    }
  }

  // ── Step 4: Dictionary fallback ───────────────────────────────────────────────────
  let normalized = query;
  for (const { pattern, replacement } of KANNADA_TERM_MAP) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Response Translation to Kannada (Markdown & Table Preserving)
// ────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER_MAP: Array<{
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: any[]) => string);
}> = [
  {
    pattern: /###\s*1\.\s*Direct Answer/gi,
    replacement: '### 1. ನೇರ ಉತ್ತರ (Direct Answer)',
  },
  {
    pattern: /###\s*2\.\s*Evidence from Retrieved Studies/gi,
    replacement: '### 2. ಸಂಶೋಧನಾ ಅಧ್ಯಯನಗಳ ಸಾಕ್ಷ್ಯ (Evidence from Retrieved Studies)',
  },
  {
    pattern: /###\s*2\.\s*Related Evidence from Retrieved Studies/gi,
    replacement: '### 2. ಸಂಬಂಧಿತ ಸಂಶೋಧನಾ ಸಾಕ್ಷ್ಯ (Related Evidence from Retrieved Studies)',
  },
  {
    pattern: /####\s*Direct Evidence(?:\s*\(([^)]+)\))?/gi,
    replacement: (_match: string, cultivar?: string) =>
      cultivar ? `#### ನೇರ ಸಾಕ್ಷ್ಯ (${cultivar})` : '#### ನೇರ ಸಾಕ್ಷ್ಯ (Direct Evidence)',
  },
  {
    pattern: /####\s*Related Cultivar Evidence(?:\s*\(([^)]+)\))?/gi,
    replacement: (_match: string, cultivar?: string) =>
      cultivar ? `#### ಸಂಬಂಧಿತ ತಳಿ ಸಾಕ್ಷ್ಯ (${cultivar})` : '#### ಸಂಬಂಧಿತ ತಳಿ ಸಾಕ್ಷ್ಯ (Related Cultivar Evidence)',
  },
  {
    pattern: /####\s*Related Evidence/gi,
    replacement: '#### ಸಂಬಂಧಿತ ಸಾಕ್ಷ್ಯ (Related Evidence)',
  },
  {
    pattern: /###\s*3\.\s*Research Scope/gi,
    replacement: '### 3. ಸಂಶೋಧನಾ ವ್ಯಾಪ್ತಿ (Research Scope)',
  },
  {
    pattern: /- \*\*Key Finding\*\*:/gi,
    replacement: '- **ಪ್ರಮುಖ ಸಂಶೋಧನೆ (Key Finding)**:',
  },
  {
    pattern: /- \*\*Experimental Conditions\*\*:/gi,
    replacement: '- **ಪ್ರಾಯೋಗಿಕ ಪರಿಸ್ಥಿತಿಗಳು (Experimental Conditions)**:',
  },
  {
    pattern: /- \*\*Reported Outcome\*\*:/gi,
    replacement: '- **ದಾಖಲಾದ ಫಲಿತಾಂಶ (Reported Outcome)**:',
  },
];

/**
 * Applies deterministic section header and agricultural disclaimer translations,
 * strictly preserving markdown structure, tables, and lists.
 */
export function applyDeterministicFallback(sourceText: string): string {
  let fallback = sourceText;
  for (const { pattern, replacement } of SECTION_HEADER_MAP) {
    fallback = fallback.replace(pattern, replacement as any);
  }
  // Translate common standard disclaimer sentences in fallback
  fallback = fallback.replace(
    /The retrieved research does not directly investigate this symptom\./gi,
    'ಲಭ್ಯವಿರುವ ಸಂಶೋಧನೆಯು ಈ ರೋಗಲಕ್ಷಣವನ್ನು ನೇರವಾಗಿ ತನಿಖೆ ಮಾಡಿಲ್ಲ.',
  );
  fallback = fallback.replace(
    /No direct evidence on the cause of this symptom is evaluated in the retrieved research\./gi,
    'ಲಭ್ಯವಿರುವ ಸಂಶೋಧನಾ ಅಧ್ಯಯನಗಳಲ್ಲಿ ಈ ರೋಗಲಕ್ಷಣದ ಕಾರಣದ ಬಗ್ಗೆ ನೇರ ಸಾಕ್ಷ್ಯ ಲಭ್ಯವಿಲ್ಲ.',
  );
  fallback = fallback.replace(
    /These experimental findings apply strictly to the evaluated agronomic treatments and do not establish causal factors or remedies for the observed symptom\./gi,
    'ಈ ಪ್ರಾಯೋಗಿಕ ಸಂಶೋಧನೆಗಳು ಕೇವಲ ಪರೀಕ್ಷಿಸಿದ ಕೃಷಿ ನಿರ್ವಹಣಾ ವಿಧಾನಗಳಿಗೆ ಅನ್ವಯಿಸುತ್ತವೆ ಮತ್ತು ರೋಗಲಕ್ಷಣಕ್ಕೆ ನೇರ ಕಾರಣವನ್ನು ನಿರ್ಧರಿಸುವುದಿಲ್ಲ.',
  );
  return fallback;
}

/**
 * Translates the final rendered, citation-reconciled English response into Kannada,
 * strictly preserving all markdown structures (headings, tables, lists) and entity placeholders.
 *
 * Repetition Guard:
 * If the translated output contains a word or phrase repeating more than 3 consecutive times,
 * the translation is regenerated once using the original English response.
 *
 * Guarantees:
 * 1. Translation runs strictly once on the finalized English response.
 * 2. Never translates already translated Kannada content.
 * 3. Preserves Markdown structure, paper titles, citations, numbers, units, cultivar names, and DOIs.
 * 4. Repetition guard regenerates once on repetition loop, and applies deduplication fallback if still repeating.
 */
export async function translateResponseToTarget(
  responseContent: string,
  targetLang: 'en' | 'kn',
): Promise<string> {
  // 1. Only translate if target is Kannada and content exists
  if (targetLang === 'en' || !responseContent) {
    return responseContent;
  }

  // 2. Never translate already translated Kannada content
  if (isAlreadyKannada(responseContent)) {
    logger.info('Response already contains Kannada content — skipping redundant translation');
    return responseContent;
  }

  // If response is the standard insufficient evidence statement:
  if (responseContent.trim() === 'The available research does not provide sufficient evidence.') {
    return 'ಲಭ್ಯವಿರುವ ಸಂಶೋಧನಾ ಅಧ್ಯಯನಗಳಲ್ಲಿ ಈ ಪ್ರಶ್ನೆಗೆ ನೇರ ಸಾಕ್ಷ್ಯ ಲಭ್ಯವಿಲ್ಲ.';
  }

  // Step 1: Mask protected entities, DOIs, paper titles, citations, numbers, units, and cultivars
  const { maskedText, replacements } = maskProtectedEntities(responseContent);

  // Helper to execute LLM translation
  const callTranslationLLM = async (retry: boolean): Promise<string> => {
    if (!env.OPENROUTER_API_KEY) {
      return '';
    }

    const antiRepetitionRule = retry
      ? '5. CRITICAL: Avoid ANY repetitive loops. Do NOT repeat any word or phrase consecutively. Use natural, varied Kannada sentences.\n'
      : '5. Do NOT repeat words or phrases consecutively. Write concise, natural, non-repetitive Kannada sentences.\n';

    const prompt =
      `You are a professional agricultural translator for Indian jasmine farmers.\n` +
      `Translate the following agricultural advisory response from English into natural, fluent, and farmer-friendly Kannada.\n\n` +
      `CRITICAL RULES:\n` +
      `1. PRESERVE THE COMPLETE MARKDOWN STRUCTURE EXACTLY:\n` +
      `   - All headings (### 1., ### 2., ### 3., ####)\n` +
      `   - All bullet lists (- **Paper Title**:, - **Key Finding**:, etc.)\n` +
      `   - All table syntax (| Column | Column |, |---|---|)\n` +
      `   - All bold (**...**) and italic (*...*) markers\n` +
      `   - All line breaks and empty lines\n` +
      `2. PRESERVE ALL PLACEHOLDERS (e.g. {{ENTITY_MASK_0}}, {{TITLE_MASK_0}}, {{DOI_MASK_0}}, {{UNIT_MASK_0}}, {{RATIO_MASK_0}}, etc.) EXACTLY AS THEY ARE. NEVER TRANSLATE, ALTER, OR OMIT PLACEHOLDERS.\n` +
      `3. Translate only natural language sentences and descriptions into Kannada.\n` +
      `4. Output ONLY the translated markdown response, with no conversational preamble or postscript.\n` +
      antiRepetitionRule +
      `\nMarkdown Text to Translate:\n\n` +
      `${maskedText}`;

    try {
      const response = await axios.post(
        `${env.OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: env.OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: retry ? 0.4 : 0.2,
          max_tokens: 1200,
        },
        {
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 25_000,
        },
      );

      const content: string = response.data?.choices?.[0]?.message?.content?.trim() ?? '';
      return content.length > 20 ? content : '';
    } catch (err) {
      logger.warn({ err, retry }, 'LLM response translation to Kannada failed');
      return '';
    }
  };

  // Step 2: First translation pass
  const translatedMaskedText = await callTranslationLLM(false);
  let finalKannadaText = '';

  if (translatedMaskedText) {
    const unmasked = unmaskProtectedEntities(translatedMaskedText, replacements);

    // Step 3: Repetition Guard Check
    if (hasConsecutiveRepetition(unmasked, 3)) {
      logger.warn(
        'Repetition loop detected in Kannada translation candidate (>3 consecutive times) — regenerating once using original English response',
      );
      // Regenerate the translation once using the original English response
      const retryMaskedText = await callTranslationLLM(true);
      if (retryMaskedText) {
        const retryUnmasked = unmaskProtectedEntities(retryMaskedText, replacements);
        if (!hasConsecutiveRepetition(retryUnmasked, 3)) {
          finalKannadaText = retryUnmasked;
        } else {
          logger.warn(
            'Regenerated translation still contained repetition — falling back to deterministic fallback with deduplication',
          );
          const fallbackMasked = applyDeterministicFallback(maskedText);
          finalKannadaText = deduplicateRepetitions(
            unmaskProtectedEntities(fallbackMasked, replacements),
          );
        }
      } else {
        // Retry call failed or timed out — apply fallback
        const fallbackMasked = applyDeterministicFallback(maskedText);
        finalKannadaText = deduplicateRepetitions(
          unmaskProtectedEntities(fallbackMasked, replacements),
        );
      }
    } else {
      finalKannadaText = unmasked;
    }
  }

  // Step 4: Fallback if LLM translation was completely unavailable
  if (!finalKannadaText) {
    const fallbackMasked = applyDeterministicFallback(maskedText);
    finalKannadaText = unmaskProtectedEntities(fallbackMasked, replacements);
  }

  // Final repetition guard guarantee: deduplicate any stray consecutive repetitions
  if (hasConsecutiveRepetition(finalKannadaText, 3)) {
    finalKannadaText = deduplicateRepetitions(finalKannadaText);
  }

  return finalKannadaText;
}
