/**
 * JasmineGPT — Topic Relevance Filter
 * =====================================
 * Determines the primary management topic(s) of a query and filters retrieved
 * chunks / documents to ensure only studies directly evaluating the requested
 * management practice are included in answer generation and source lists.
 *
 * Excludes studies where flowering, yield, or growth is only the outcome
 * but the intervention is an unrelated practice.
 */

import type { GeneralChunk } from '../../types';

export interface ManagementTopic {
  id: string;
  name: string;
  queryPatterns: RegExp[];
  evaluationPatterns: RegExp[];
}

export const MANAGEMENT_TOPICS: ManagementTopic[] = [
  {
    id: 'NUTRIENT_FERTILIZER',
    name: 'Fertilizer and Nutrient Management',
    queryPatterns: [
      /\b(?:fertiliz|fertiliser|nutrient|nutrition|inm\b|npk\b|fym\b|manure|compost|vermicompost|biofertiliz|bio-fertiliz|micronutrient|panchagavya|humic acid|fertigation|foliar nutrition|foliar feed|foliar spray of nutrient|azospirillum|phosphobacteria|soil fertility|nitrogen|phosphorus|potassium|nutrient scheduling)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:fertiliz|fertiliser|nutrient|nutrition|inm\b|npk\b|fym\b|manure|compost|vermicompost|biofertiliz|bio-fertiliz|micronutrient|panchagavya|humic acid|fertigation|foliar nutrition|foliar feed|foliar spray of (?:npk|zinc|boron|iron|urea|micronutrient)|azospirillum|phosphobacteria|potassium solubilizing|organic manure|nitrogen application|phosphorus application|potassium application|zinc sulphate|borax|ferrous sulphate|cow dung|farmyard manure|nutrient scheduling)\b/i,
    ],
  },
  {
    id: 'IRRIGATION_WATER',
    name: 'Irrigation and Water Management',
    queryPatterns: [
      /\b(?:irrigation|drip|water stress|watering|water requirement|soil moisture|water regime|irrigation schedule)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:irrigation|drip|water stress|watering|water requirement|soil moisture|water regime|iw\/cpe|etc\b|water management|irrigation schedule|irrigation interval|litres per plant|liters per plant)\b/i,
    ],
  },
  {
    id: 'PRUNING_CANOPY',
    name: 'Pruning and Canopy Management',
    queryPatterns: [
      /\b(?:prun(?:ing|ed|e|es)?|pruning schedule|pruning height|pruning intensity|shoot pruning|time of pruning|canopy management|defoliation)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:prun(?:ing|ed|e|es)?|pruning schedule|pruning height|pruning intensity|shoot pruning|time of pruning|pruning date|pruned|defoliation|heading back|pinching)\b/i,
    ],
  },
  {
    id: 'PEST_INSECT',
    name: 'Pest and Insect Management',
    queryPatterns: [
      /\b(?:pest|pests|insect|insects|insecticide|insecticides|pesticide|pesticides|bud worm|budworm|thrips|mite|mites|spider mite|whitefly|white fly|blossom midge|midge|aphid|aphids|borer|caterpillar|parasitoid|predator|natural enemies|ipm\b|pest management|biopesticide)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:pest|pests|insect|insects|insecticide|insecticides|pesticide|pesticides|bud worm|budworm|thrips|mite|mites|spider mite|whitefly|white fly|blossom midge|midge|aphid|aphids|borer|caterpillar|parasitoid|predator|natural enemies|ipm\b|pest management|biopesticide|hendicasis|contarinia|tetranychus|dialerodes|chrysoperla|spiders?|larvicidal|chemical spray)\b/i,
    ],
  },
  {
    id: 'DISEASE_PATHOGEN',
    name: 'Disease and Pathogen Management',
    queryPatterns: [
      /\b(?:disease|diseases|fungus|fungal|fungicide|fungicides|leaf spot|blight|wilt|pathogen|pathogens|yellow mosaic|potyvirus|rust|rot|cercospora|alternaria)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:disease|diseases|fungus|fungal|fungicide|fungicides|leaf spot|blight|wilt|pathogen|pathogens|yellow mosaic|potyvirus|rust|rot|cercospora|alternaria|mancozeb|copper oxychloride|carbendazim|bactericide)\b/i,
    ],
  },
  {
    id: 'SPACING_PLANT_DENSITY',
    name: 'Spacing and Planting Density',
    queryPatterns: [
      /\b(?:spacing|plant density|planting density|planting system|plant population|geometry|high density planting|hdp\b)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:spacing|plant density|planting density|planting system|plant population|geometry|high density planting|hdp\b|\d+(?:\.\d+)?\s*(?:m|cm)\s*x\s*\d+(?:\.\d+)?\s*(?:m|cm)|intra[- ]row|inter[- ]row)\b/i,
    ],
  },
  {
    id: 'GROWTH_REGULATORS_PGR',
    name: 'Plant Growth Regulators and Chemical Flowering Induction',
    queryPatterns: [
      /\b(?:growth regulator|growth regulators|pgr\b|plant growth regulator|paclobutrazol|thiourea|gibberellic acid|ga3\b|naa\b|ethrel|ethephon|salicylic acid|mepiquat|cultar)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:growth regulator|growth regulators|pgr\b|plant growth regulator|paclobutrazol|thiourea|gibberellic|ga3\b|naa\b|ethrel|ethephon|salicylic acid|mepiquat|cultar)\b/i,
    ],
  },
  {
    id: 'POSTHARVEST_STORAGE_PACKAGING',
    name: 'Post-Harvest Packaging, Storage and Transport',
    queryPatterns: [
      /\b(?:packaging|package|packing|storage|cold storage|shelf life|shelf-life|transport|transportation|export|chitosan|mycelium|polythene|thermocol|gel ice)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:packaging|package|packing|storage|cold storage|shelf life|shelf-life|transport|transportation|export|chitosan|mycelium|polythene|thermocol|gel ice|corrugated|heat seal|wilting)\b/i,
    ],
  },
  {
    id: 'PROPAGATION_CUTTINGS',
    name: 'Propagation and Stem Cuttings',
    queryPatterns: [
      /\b(?:propagation|cuttings?|stem cutting|semi hardwood|rooting|rooting hormone|iba\b|auxin|layering|air layering|nursery media)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:propagation|cuttings?|stem cutting|semi hardwood|rooting|rooting hormone|iba\b|auxin|layering|air layering|nursery media|media composition|growth and survivability of .* cutting)\b/i,
    ],
  },
  {
    id: 'WEED_MANAGEMENT',
    name: 'Weed Management',
    queryPatterns: [
      /\b(?:weed|weeds|weeding|herbicide|herbicides|mulch|mulching|weed control|weed management)\b/i,
    ],
    evaluationPatterns: [
      /\b(?:weed|weeds|weeding|herbicide|herbicides|mulch|mulching|weed control|weed management|un-weeded|weed density)\b/i,
    ],
  },
];

/**
 * Identify all specific management topics present in the user query.
 */
export function detectManagementTopics(query: string): ManagementTopic[] {
  const q = query.trim();
  return MANAGEMENT_TOPICS.filter((topic) =>
    topic.queryPatterns.some((pattern) => pattern.test(q)),
  );
}

/**
 * Checks whether a single chunk evaluates any of the active management topics.
 * Evaluates paper title and chunk text directly (does not rely on category alone).
 */
export function chunkEvaluatesTopics(
  chunk: GeneralChunk,
  activeTopics: ManagementTopic[],
): boolean {
  if (activeTopics.length === 0) return true;

  const titleText = (chunk.title || chunk.filename || '').toLowerCase();
  const bodyText = (chunk.text || '').toLowerCase();

  return activeTopics.some((topic) => {
    // 1. Check if paper title directly evaluates the topic
    const titleMatch = topic.evaluationPatterns.some((pattern) => pattern.test(titleText));
    if (titleMatch) return true;

    // 2. Check if chunk text directly evaluates the topic
    const bodyMatch = topic.evaluationPatterns.some((pattern) => pattern.test(bodyText));
    return bodyMatch;
  });
}

/**
 * Filter retrieved general chunks by query topic relevance.
 * Returns only chunks that directly evaluate the query's primary management topic(s).
 */
export function filterChunksByTopic(
  query: string,
  chunks: GeneralChunk[],
): {
  filteredChunks: GeneralChunk[];
  detectedTopics: ManagementTopic[];
  isTopicSpecific: boolean;
} {
  const activeTopics = detectManagementTopics(query);

  if (activeTopics.length === 0) {
    return {
      filteredChunks: chunks,
      detectedTopics: [],
      isTopicSpecific: false,
    };
  }

  const filteredChunks = chunks.filter((chunk) =>
    chunkEvaluatesTopics(chunk, activeTopics),
  );

  return {
    filteredChunks,
    detectedTopics: activeTopics,
    isTopicSpecific: true,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Symptom Detection and Evidence Gap Analysis
// ────────────────────────────────────────────────────────────────────────────

const SYMPTOM_PATTERNS: RegExp[] = [
  /\b(?:unopened|not opening|small bud|dropping|bud drop|bud fall|drying|dry bud|wilting|wilted|yellowing|yellow leaves|brown bud|purple discoloration|rotting|bud rot|shedding|deformed bud|blight|stunted growth|curling|chlorosis|leaf spot|lesions?|infestation)\b/i,
  /\bwhy (?:are|is|do|did) (?:my|the) (?:buds?|flowers?|leaves|plants?)\b/i,
  /\b(?:cause|reason) of (?:small|unopened|dropping|yellowing|wilting|drying|shedding)\b/i,
];

/**
 * Checks if the user query is asking about a plant symptom, disorder, or diagnostic observation.
 */
export function isSymptomQuery(query: string): boolean {
  return SYMPTOM_PATTERNS.some((pattern) => pattern.test(query));
}

/**
 * Checks whether a study title or chunk text directly investigates the specific symptom asked by the user.
 */
export function studyDirectlyInvestigatesSymptom(query: string, titleOrText: string): boolean {
  const lowText = titleOrText.toLowerCase();
  const lowQuery = query.toLowerCase();

  // If query is about small unopened buds / unopened buds:
  if (/small unopened buds?|unopened buds?|buds? not opening/i.test(lowQuery)) {
    return (
      /unopened buds?|buds? remain(?:ed)? unopened|blossom midge|contarinia|bud worm|hendecasis|bud borer|bud rot|gall midge/i.test(lowText) ||
      (lowText.includes('unopened') && /cause|symptom|damage|infest|disorder|loss/i.test(lowText))
    );
  }

  // If query is about bud drop / bud drying / flower drop:
  if (/bud drop|bud fall|bud drying|flower drop|flower shedding/i.test(lowQuery)) {
    return /bud drop|bud fall|bud drying|flower drop|flower shedding|abscission/i.test(lowText);
  }

  // If query is about yellowing / chlorosis / leaf spot:
  if (/yellowing|yellow leaves|chlorosis/i.test(lowQuery)) {
    return /yellowing|chlorosis|yellow mosaic|iron deficiency|nutrient deficiency/i.test(lowText);
  }

  if (/leaf spot|blight|lesion/i.test(lowQuery)) {
    return /leaf spot|alternaria|cercospora|blight|leaf blight/i.test(lowText);
  }

  if (/wilting|wilted/i.test(lowQuery)) {
    return /wilting|fusarium|root rot|wilt disease|vascular wilt/i.test(lowText);
  }

  if (/curling|leaf curl/i.test(lowQuery)) {
    return /leaf curl|thrips|mite infestation|curling/i.test(lowText);
  }

  // Fallback direct match
  const specificSymptoms = [
    'small unopened buds',
    'unopened buds',
    'bud drop',
    'bud drying',
    'yellowing',
    'leaf curl',
    'leaf spot',
    'wilting',
    'chlorosis',
    'stunted growth',
    'yellow mosaic',
  ];

  for (const symptom of specificSymptoms) {
    if (lowQuery.includes(symptom) && lowText.includes(symptom)) {
      return true;
    }
  }

  return false;
}

/**
 * Summarizes what topic/intervention an agronomic study actually evaluated.
 */
export function getStudyEvaluatedTopic(
  chunk: { title?: string; text?: string; category?: string; filename?: string },
): string {
  const text = `${chunk.title || ''} ${chunk.filename || ''} ${chunk.text || ''}`.toLowerCase();
  if (/water stress|drip irrigation|irrigation|iw\/cpe|moisture stress|water regime/.test(text)) {
    return 'water stress and irrigation schedules';
  }
  if (/nutrient|fertiliz|fertigation|npk|foliar spray|zinc|boron|urea|nitrogen|phosphorus|potassium/.test(text)) {
    return 'fertilizer and nutrient management';
  }
  if (/prun|defoliation|nipping|canopy/.test(text)) {
    return 'pruning and canopy management';
  }
  if (/storage|packaging|shelf life|post-harvest|cold storage|silver nitrate|sucrose|corrugated/.test(text)) {
    return 'post-harvest packaging and storage conditions';
  }
  if (/plant growth regulator|pgr|ga3|naa|salicylic acid|paclobutrazol/.test(text)) {
    return 'plant growth regulator applications';
  }
  if (/spacing|density|plant geometry|planting distance/.test(text)) {
    return 'plant spacing and crop density';
  }
  if (chunk.category) {
    return `${chunk.category.toLowerCase()} practices`;
  }
  return 'specific agronomic parameters';
}

const CAUSAL_PHRASES = [
  /this could be caused by/gi,
  /other factors such as/gi,
  /therefore it may be due to/gi,
  /this may be caused by/gi,
  /this might be caused by/gi,
  /this may explain why/gi,
  /this could be due to/gi,
  /it may be due to/gi,
  /it could be due to/gi,
  /possibly caused by/gi,
  /might be attributed to/gi,
  /may be attributed to/gi,
];

/**
 * Sanitizes LLM or formatted responses for symptom questions when no direct symptom evidence exists.
 * - Labels non-symptom studies as Related Evidence
 * - Replaces causal speculative phrases with factual evaluation statements
 * - Ensures Direct Answer begins with evidence gap disclaimer
 * - Ensures a clear evidence gap statement is present
 */
export function sanitizeSymptomResponse(
  content: string,
  query: string,
  chunksOrDocs: (GeneralChunk | { title?: string; text?: string; category?: string })[],
): string {
  if (!isSymptomQuery(query)) {
    return content;
  }

  const hasDirectInvestigation = chunksOrDocs.some((item) =>
    studyDirectlyInvestigatesSymptom(query, `${item.title || ''} ${item.text || ''}`),
  );

  if (hasDirectInvestigation) {
    return content;
  }

  let sanitized = content;

  // 1. Ensure Direct Answer starts with "The retrieved research does not directly investigate this symptom."
  if (!sanitized.includes('The retrieved research does not directly investigate this symptom.')) {
    if (sanitized.includes('### 1. Direct Answer')) {
      sanitized = sanitized.replace(
        /### 1\. Direct Answer\s*\n*/i,
        '### 1. Direct Answer\nThe retrieved research does not directly investigate this symptom. ',
      );
    }
  }

  // 2. Eliminate causal inference phrases and replace with non-causal evaluation statement
  const evaluatedTopic = chunksOrDocs.length > 0 ? getStudyEvaluatedTopic(chunksOrDocs[0]) : 'specific agronomic trials';

  for (const regex of CAUSAL_PHRASES) {
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(
        regex,
        `The retrieved study evaluated ${evaluatedTopic}, but it did not investigate the cause of this symptom.`,
      );
    }
  }

  // 3. Rename section heading to "Related Evidence from Retrieved Studies" when no direct study investigates the symptom
  sanitized = sanitized.replace(
    /###\s*2\.\s*Evidence from Retrieved Studies/gi,
    '### 2. Related Evidence from Retrieved Studies',
  );
  sanitized = sanitized.replace(
    /^Evidence from Retrieved Studies$/gim,
    'Related Evidence from Retrieved Studies',
  );

  // 4. Ensure no unlabelled direct evidence header for indirect studies
  if (sanitized.includes('#### Direct Evidence') && !hasDirectInvestigation) {
    sanitized = sanitized.replace(/#### Direct Evidence[^\n]*/g, '#### Related Evidence');
  }

  // 5. Ensure an evidence gap statement is present
  const hasGapStatement =
    sanitized.includes('does not investigate') ||
    sanitized.includes('did not investigate') ||
    sanitized.includes('cannot be drawn') ||
    sanitized.includes('No direct evidence') ||
    sanitized.includes('evidence gap');

  if (!hasGapStatement) {
    sanitized += '\n\nNo direct evidence on the cause of this symptom is evaluated in the retrieved research.';
  }

  return sanitized;
}

