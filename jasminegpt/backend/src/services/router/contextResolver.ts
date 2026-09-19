/**
 * JasmineGPT — Deterministic Context Resolver
 * =============================================
 * Ported from Phase 1.4 of:
 *   JasmineGPT_Phase1_Conversational_Memory_Colab_UPDATED_v1_1.ipynb
 *
 * Resolves follow-up questions to standalone queries by injecting
 * conversation memory and prior context.
 *
 * Priority:
 *   1. Deterministic pattern matching (no LLM needed)
 *   2. Memory injection (species/cultivar from stored state)
 *   3. Context injection (last resolved query topic)
 */

import type { ConversationMemory } from '../../types';

// ────────────────────────────────────────────────────────────────────────────
// Context reference patterns — verbatim from Phase 1.4 notebook
// ────────────────────────────────────────────────────────────────────────────
const CONTEXT_REFERENCE_PATTERNS: RegExp[] = [
  /\bit\b/,
  /\bthis\b/,
  /\bthat\b/,
  /\bthese\b/,
  /\bthose\b/,
  /\bthe packaging\b/,
  /\bthe treatment\b/,
  /\bthe method\b/,
  /\bthe flowers\b/,
  /\bthe storage\b/,
  /\bthe temperature\b/,
  /\bthe bags?\b/,
  /\bthe results?\b/,
  /\bthe study\b/,
  /\bhow long did\b/,
  /\bwhat temperature (?:was|were|is|are)\b/,
  /\bwhat packaging (?:was|were|is|are)\b/,
  /\bhow was .* packaged\b/,
  /\bwas .* heat[- ]sealed\b/,
  /\bwas .* heat sealed\b/,
  /\bwhat was .* used\b/,
  /\bwhat was the\b/,
  /\bwhich .* does this\b/,
  /\bwhat about\b/,
];

// ────────────────────────────────────────────────────────────────────────────
// Species / cultivar entity maps (Phase 1.3)
// ────────────────────────────────────────────────────────────────────────────
const PHASE1_SPECIES: Record<string, string> = {
  'ramanathapuram gundumalli': 'Jasminum sambac',
  'jasminum sambac': 'Jasminum sambac',
  'gundumalli': 'Jasminum sambac',
  'sambac': 'Jasminum sambac',
  'double mogra': 'Jasminum sambac',
  'single mogra': 'Jasminum sambac',
  'mogra': 'Jasminum sambac',
  'arabian jasmine': 'Jasminum sambac',
  'pacha mullai': 'Jasminum auriculatum',
  'jasminum auriculatum': 'Jasminum auriculatum',
  'auriculatum': 'Jasminum auriculatum',
  'mullai': 'Jasminum auriculatum',
  'juhi': 'Jasminum auriculatum',
  'jasminum grandiflorum': 'Jasminum grandiflorum',
  'grandiflorum': 'Jasminum grandiflorum',
  'royal jasmine': 'Jasminum grandiflorum',
  'jathimalli': 'Jasminum grandiflorum',
  'pitchi': 'Jasminum grandiflorum',
  'jasminum multiflorum': 'Jasminum multiflorum',
  'multiflorum': 'Jasminum multiflorum',
  'star jasmine': 'Jasminum multiflorum',
  'kakada': 'Jasminum multiflorum',
};

const PHASE1_CULTIVARS: Record<string, string> = {
  'ramanathapuram gundumalli': 'Ramanathapuram Gundumalli',
  'gundumalli': 'Gundumalli',
  'pacha mullai': 'Pacha Mullai ecotype',
  'double mogra': 'Double Mogra',
  'single mogra': 'Single Mogra',
  'mysuru mallige': 'Mysuru Mallige',
  'mysore mallige': 'Mysuru Mallige',
  'baramasi': 'Baramasi',
  'mogra': 'Mogra',
  'muthu mullai': 'Muthu Mullai',
  'co-1': 'CO-1',
  'co 1': 'CO-1',
  'co-2': 'CO-2',
  'co 2': 'CO-2',
};

const PHASE1_DOMAIN_TERMS: Record<string, string[]> = {
  packaging: ['packaging', 'package', 'packing', 'bag', 'polythene', 'polyethylene', 'micron', 'thermocol', 'chitosan', 'mycelium'],
  storage: ['storage', 'store', 'cold storage', 'temperature', 'shelf life', 'freshness'],
  transportation: ['transport', 'transportation', 'long-distance', 'export', 'gel ice', 'reefer'],
  pest: ['pest', 'pesticide', 'insecticide', 'bud worm', 'thrips', 'mite', 'aphid', 'whitefly'],
  nutrition: ['fertilizer', 'fertiliser', 'npk', 'nutrition', 'fertigation'],
  irrigation: ['irrigation', 'drip', 'water stress', 'watering'],
  pruning: ['pruning', 'prune', 'off season', 'flowering', 'bloom'],
  disease: ['disease', 'fungicide', 'leaf spot', 'virus', 'pathogen'],
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
export function looksContextDependent(question: string): boolean {
  const q = question.toLowerCase().trim();
  return CONTEXT_REFERENCE_PATTERNS.some((pat) => pat.test(q));
}

export function isFollowupQuestion(question: string): boolean {
  if (looksContextDependent(question)) return true;
  const words = question.trim().split(/\s+/);
  const low = question.toLowerCase();
  if (words.length <= 7 && /\b(how|what|which|where)\b/.test(low)) return true;
  return false;
}

export function extractEntities(text: string): {
  species: string | null;
  cultivar: string | null;
  domains: string[];
} {
  const q = text.toLowerCase();
  let species: string | null = null;
  let cultivar: string | null = null;

  // Longest-match first
  const sortedSpecies = Object.entries(PHASE1_SPECIES).sort(([a], [b]) => b.length - a.length);
  for (const [alias, canonical] of sortedSpecies) {
    if (q.includes(alias)) { species = canonical; break; }
  }
  const sortedCultivars = Object.entries(PHASE1_CULTIVARS).sort(([a], [b]) => b.length - a.length);
  for (const [alias, canonical] of sortedCultivars) {
    if (q.includes(alias)) { cultivar = canonical; break; }
  }

  const domains: string[] = [];
  for (const [domain, terms] of Object.entries(PHASE1_DOMAIN_TERMS)) {
    if (terms.some((t) => q.includes(t))) domains.push(domain);
  }
  return { species, cultivar, domains };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────
export interface ResolvedQuery {
  standaloneQuery: string;
  method: 'none' | 'deterministic' | 'memory_injection';
  confidence: number;
  reason: string;
  species?: string | null;
  cultivar?: string | null;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Deterministic-first follow-up resolution.
 * Mirrors resolve_followup_deterministic() from the Phase 1.4 notebook.
 */
export function resolveFollowup(
  question: string,
  recentTurns: ConversationTurn[],
  memory: ConversationMemory,
): ResolvedQuery {
  const q = question.trim();
  const currentEntities = extractEntities(q);

  // Determine effective species and cultivar context
  const effectiveSpecies = currentEntities.species || memory.species || null;
  const effectiveCultivar = currentEntities.cultivar || memory.cultivar || null;

  // ── 1. No prior turns ─────────────────────────────────────────────────
  if (recentTurns.length === 0) {
    return {
      standaloneQuery: q,
      method: 'none',
      confidence: 1.0,
      reason: 'new conversation',
      species: effectiveSpecies,
      cultivar: effectiveCultivar,
    };
  }

  // ── 2. Explicit standalone question ───────────────────────────────────
  // If the question explicitly specifies a species or cultivar, and does NOT
  // contain relative pronouns/context references that link it to prior turns,
  // it is completely standalone. Do NOT modify or append any previous context.
  const isContextDep = looksContextDependent(q);
  const hasExplicitSpeciesOrCultivar = Boolean(currentEntities.species || currentEntities.cultivar);

  if (!isContextDep && hasExplicitSpeciesOrCultivar) {
    return {
      standaloneQuery: q,
      method: 'none',
      confidence: 1.0,
      reason: 'question explicitly names the relevant species/cultivar',
      species: effectiveSpecies,
      cultivar: effectiveCultivar,
    };
  }

  // ── 3. Memory suffix if query lacks explicit species/cultivar ─────────
  const memoryParts: string[] = [];
  if (!currentEntities.species && memory.species) {
    if (memory.cultivar && !currentEntities.cultivar && !q.toLowerCase().includes(memory.cultivar.toLowerCase())) {
      memoryParts.push(`cv. ${memory.cultivar}`);
    }
    if (!q.toLowerCase().includes(memory.species.toLowerCase())) {
      memoryParts.push(memory.species);
    }
  } else if (currentEntities.species && !currentEntities.cultivar && memory.cultivar) {
    // Current query has species but not cultivar, and memory has cultivar for this species
    if (memory.species && currentEntities.species.toLowerCase() === memory.species.toLowerCase() && isContextDep) {
      if (!q.toLowerCase().includes(memory.cultivar.toLowerCase())) {
        memoryParts.push(`cv. ${memory.cultivar}`);
      }
    }
  }

  const memSuffix = memoryParts.length > 0 ? ` (${memoryParts.join(', ')})` : '';

  // ── 4. If not context-dependent ───────────────────────────────────────
  if (!isContextDep) {
    if (memSuffix) {
      return {
        standaloneQuery: `${q}${memSuffix}`.trim(),
        method: 'memory_injection',
        confidence: 0.95,
        reason: `Injected memory: ${memoryParts.join(', ')}`,
        species: effectiveSpecies,
        cultivar: effectiveCultivar,
      };
    }
    return {
      standaloneQuery: q,
      method: 'none',
      confidence: 0.95,
      reason: 'standalone question',
      species: effectiveSpecies,
      cultivar: effectiveCultivar,
    };
  }

  // ── 5. Context-dependent follow-up ────────────────────────────────────
  // Identify missing domain context from prior turns if current query has no domain
  let topicSuffix = '';
  if (currentEntities.domains.length === 0) {
    const userMsgs = recentTurns.filter((m) => m.role === 'user');
    const lastUserMsg = userMsgs[userMsgs.length - 1]?.content ?? '';
    const lastEntities = extractEntities(lastUserMsg);
    if (lastEntities.domains.length > 0) {
      topicSuffix = ` [context: ${lastEntities.domains[0]}]`;
    }
  }

  // Construct resolved query WITHOUT ever concatenating previous user question text
  let resolved = q;
  if (memSuffix) {
    resolved = `${resolved}${memSuffix}`;
  }
  if (topicSuffix && !resolved.includes(topicSuffix)) {
    resolved = `${resolved}${topicSuffix}`;
  }

  const changed = resolved !== q;

  return {
    standaloneQuery: resolved.trim(),
    method: changed ? (memSuffix ? 'memory_injection' : 'deterministic') : 'none',
    confidence: changed ? 0.9 : 0.8,
    reason: changed
      ? (memSuffix ? `Injected memory: ${memoryParts.join(', ')}` : 'Carried domain context from conversation')
      : 'no safe rewrite needed',
    species: effectiveSpecies,
    cultivar: effectiveCultivar,
  };
}
