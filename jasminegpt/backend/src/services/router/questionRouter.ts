/**
 * JasmineGPT — Question Router (Node.js side)
 * =============================================
 * Mirrors the top-level routing logic from the Python sidecar but runs
 * in Node.js for fast, synchronous routing decisions before any HTTP call.
 *
 * Routes:
 *   MEMORY_UPDATE  — farmer profile statement; update memory, no RAG
 *   GENERAL_RAG    — pest/nutrition/irrigation/pruning/disease/cultivation
 *   POSTHARVEST    — packaging/storage/transport/harvesting (evidence-gated)
 *
 * Source: router.py (route_top_level) and Phase 1.1 notebook
 */

import type { RouteType, ConversationMemory } from '../../types';
import { looksContextDependent } from './contextResolver';

// ────────────────────────────────────────────────────────────────────────────
// Profile statement patterns (Phase 1.1 — verbatim)
// ────────────────────────────────────────────────────────────────────────────
const PROFILE_PATTERNS: RegExp[] = [
  /^i grow /i,
  /^i am growing /i,
  /^i'm growing /i,
  /^my crop is /i,
  /^i cultivate /i,
  /^i am cultivating /i,
  /^i'm cultivating /i,
  /^my farm (?:has|grows|produces) /i,
  /^i (?:mainly |primarily )?(?:farm|grow) /i,
  /^we grow /i,
  /^we cultivate /i,
  /^our crop is /i,
  /^our farm grows /i,
  /^i (?:have |own )?a jasmine farm/i,
  /^my jasmine (?:variety|cultivar|crop|farm) is /i,
];

// ────────────────────────────────────────────────────────────────────────────
// Post-harvest domain keywords → POSTHARVEST
// ────────────────────────────────────────────────────────────────────────────
const POSTHARVEST_KEYWORDS: string[] = [
  'packaging', 'package', 'packing', 'polythene', 'polyethylene',
  'thermocol', 'chitosan', 'mycelium', 'micron', 'heat seal',
  'shelf life', 'cold storage', 'cold room', 'refrigerat',
  'transport', 'transportation', 'long-distance', 'export', 'reefer',
  'shipping', 'transit', 'journey',
  'harvesting', 'harvest time', 'harvest timing', 'plucking', 'picking',
  'post-harvest', 'postharvest', 'post harvest',
  'gel ice', 'gel-ice', 'boric acid',
];

// These must appear in the question itself (not just in memory)
// and their presence alone is sufficient to trigger POSTHARVEST
const POSTHARVEST_STRONG: RegExp[] = [
  /\bshelf life\b/i,
  /\bcold stor/i,
  /\bstor(?:age|ing|e)\b/i,
  /\bpackag/i,
  /\btransport/i,
  /\bharvest/i,
  /\bpost[- ]harvest/i,
  /\breefer\b/i,
  /\bchitosan\b/i,
  /\bmycelium\b/i,
  /\bexport packag/i,
  /\bgel ice\b/i,
  /\bMAP\b/,
  /\bmodified atmosphere/i,
  /\bpassive.{0,10}(?:package|packag|map)\b/i,
  /\brefrigerat/i,
  /\btemperature.{0,30}(?:store|jasmine|sambac|flower)/i,
  /\bshelf.{0,10}life/i,
  /\bfresh(?:ness)?.{0,20}(?:store|storage|packag)/i,
];

// ────────────────────────────────────────────────────────────────────────────
// General-RAG domain keywords → GENERAL_RAG
// ────────────────────────────────────────────────────────────────────────────
const GENERAL_TERMS: Record<string, string[]> = {
  pest: ['pest', 'pesticide', 'insecticide', 'bud worm', 'thrips', 'mite', 'aphid', 'whitefly', 'borer'],
  nutrition: ['fertilizer', 'fertiliser', 'npk', 'nutrition', 'fertigation', 'micronutrient', 'manure', 'compost'],
  irrigation: ['irrigation', 'drip', 'water stress', 'watering', 'soil moisture'],
  pruning: ['pruning', 'prune', 'off season', 'flowering strategy', 'bloom', 'defoliation', 'paclobutrazol'],
  disease: ['disease', 'fungicide', 'leaf spot', 'virus', 'pathogen', 'blight'],
  breeding: ['chromosome', 'mutagen', 'genotype', 'floral biology', 'speciation', 'breeding'],
  variety: ['varieties', 'morphological', 'qualitative'],
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
export function isProfileStatement(question: string): boolean {
  const isProfileMatch = PROFILE_PATTERNS.some((p) => p.test(question.trim()));
  if (!isProfileMatch) return false;

  // If the statement also contains a question or management query, route to RAG
  const hasQuestionSign =
    question.includes('?') ||
    /\b(?:what|which|how|when|why|where|recommend|fertiliz|npk|prun|irrigat|water|pest|disease|yield|stor|shelf life|packag|dosage|spray|apply|management|best|give|help)\b/i.test(
      question,
    );

  if (hasQuestionSign) {
    return false;
  }

  return true;
}

function isPostharvestQuestion(q: string): boolean {
  const low = q.toLowerCase();
  return (
    POSTHARVEST_STRONG.some((p) => p.test(low)) ||
    POSTHARVEST_KEYWORDS.some((kw) => low.includes(kw))
  );
}

function isGeneralRagQuestion(q: string): boolean {
  const low = q.toLowerCase();
  return Object.values(GENERAL_TERMS).some((terms) =>
    terms.some((t) => low.includes(t)),
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────
export function routeQuestion(
  question: string,
  memory: ConversationMemory = {},
): RouteType {
  // 1. Profile statement → MEMORY_UPDATE (no RAG)
  if (isProfileStatement(question)) return 'MEMORY_UPDATE';

  const phQuestion = isPostharvestQuestion(question);
  const genQuestion = isGeneralRagQuestion(question);

  // 2. Post-harvest domain detected
  if (phQuestion) {
    // If it's also a pest/nutrition question without a clear packaging/storage
    // signal, prefer GENERAL_RAG to avoid misfiring
    if (genQuestion && !POSTHARVEST_STRONG.some((p) => p.test(question.toLowerCase()))) {
      return 'GENERAL_RAG';
    }
    return 'POSTHARVEST';
  }

  // 3. General RAG domain detected
  if (genQuestion) return 'GENERAL_RAG';

  // 4. Memory-guided: if last route was POSTHARVEST and question is a follow-up
  if (memory.last_route === 'POSTHARVEST' && looksContextDependent(question)) {
    return 'POSTHARVEST';
  }

  // 5. Default to GENERAL_RAG for any jasmine question
  return 'GENERAL_RAG';
}
