/**
 * JasmineGPT — LLM Service (OpenRouter)
 * =======================================
 * Calls the LLM ONLY when evidence is supported (DIRECT_EVIDENCE or MULTIPLE_STUDIES).
 * NEVER called for INSUFFICIENT_EVIDENCE.
 *
 * Uses OpenRouter API (OpenAI-compatible endpoint).
 * API key is read from OPENROUTER_API_KEY environment variable — never hard-coded.
 */

import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { Errors } from '../../utils/errors';
import type { PostHarvestDoc, GeneralChunk, ProfileFact, PostHarvestChunk } from '../../types';
import { isSymptomQuery } from '../router/topicFilter';

const SYSTEM_PROMPT = `You are JasmineGPT, an evidence-grounded AI assistant for jasmine farmers.

PURPOSE
Answer user questions using ONLY the retrieved research context provided with the request.

## Core Rules

1. Use only retrieved evidence.
2. Never use pretrained knowledge, assumptions, or external information.
3. Every factual claim must be supported by the retrieved text.
4. If evidence is missing, state that clearly instead of guessing.

## Evidence Priority

Determine relevance in this order:

1. Retrieved text (highest priority)
2. Paper title
3. Experimental description
4. Metadata category (lowest priority)

Do not reject a relevant paper because its metadata category is incorrect.

## Species & Cultivar Safety

Target species:
- Jasminum sambac
- Jasminum auriculatum

Never present results from another species as direct evidence.

If only cross-species evidence exists, explicitly label it as:
"Cross-species evidence."

Always preserve cultivar names exactly as reported (e.g., Gundumalli, Mogra).

## Numerical Safety

Never invent, estimate, round, or calculate values for:
- fertilizer doses
- pesticide concentrations
- irrigation amounts
- temperature
- humidity
- spacing
- percentages
- storage duration
- treatment intervals

If the value is absent, say:

"The retrieved papers do not specify this value."

## Experimental Scope

Report findings exactly as the study reports them.

Use wording such as:
- "The study reported..."
- "In this experiment..."
- "For Jasminum sambac cv. Gundumalli..."

Do not convert experimental results into universal recommendations unless the source explicitly recommends them.

## Handling Partial Evidence

If retrieved evidence is directly relevant:
- Answer using the supported findings.
- Cite the paper title.

If evidence is only partially relevant:
- State what the research supports.
- Clearly identify what remains unsupported.
- Do not reply with insufficient evidence if useful partial evidence exists.

Return the exact sentence below ONLY when no retrieved text meaningfully answers the question:

"The available research does not provide sufficient evidence."

## Answer Style

Be concise, farmer-friendly, and scientifically accurate.

Never mention:
- similarity score
- embedding score
- vector search
- retrieval confidence

Always cite the retrieved paper title(s) used in the answer.`;

const FORMAT_INSTRUCTIONS = `
==================================================
RESPONSE FORMAT INSTRUCTIONS (MANDATORY)
==================================================
Format your response clearly for a jasmine farmer using this exact 3-part structure:

### 1. Direct Answer
Provide a concise 1–2 sentence direct answer based strictly on the retrieved evidence.
- If the retrieved evidence directly answers the question, give the direct finding.
- If the retrieved evidence only partially answers the question, answer what is supported by the evidence and clearly state which requested details are unavailable.

### 2. Evidence from Retrieved Studies
Present the evidence clearly for each relevant study:
- **Paper Title**: [Exact paper title]
- **Key Finding**: [Main finding from the study]
- **Experimental Conditions**: [Specific parameters tested: temperature, packaging, treatment/chemicals, cultivar, storage duration, etc.]
- **Reported Outcome**: [Specific measured results and metrics, ONLY if explicitly present in the text]

*(Note: When comparing multiple treatments, conditions, or papers, you may use a clean markdown table. Synthesize findings across papers without merging separate experimental results into a single generalized recommendation.)*

### 3. Research Scope
Provide exactly 1 sentence stating that findings apply only to the tested experimental conditions and specific cultivars/treatments evaluated.

- SYMPTOM RESPONSES & EVIDENCE GAP HANDLING:
  * When the user asks about a specific symptom, damage, observation, or plant disorder (e.g., small unopened buds, yellowing leaves, premature bud drop, wilting, curling, etc.):
  * Identify whether the retrieved study directly investigates the user's specific symptom.
  * If no retrieved study directly investigates the symptom:
    - In "### 1. Direct Answer", begin with: "The retrieved research does not directly investigate this symptom."
    - Rename Section 2 from "### 2. Evidence from Retrieved Studies" to "### 2. Related Evidence from Retrieved Studies".
    - Label individual studies under "#### Related Evidence" (never under Direct Evidence).
    - NEVER write causal phrases such as:
      * "This could be caused by..."
      * "Other factors such as..."
      * "Therefore it may be due to..."
      * "This may be caused by..."
      * "This may explain why..."
      * "This could be due to..."
    - Instead write:
      "The retrieved study evaluated [evaluated practice X], but it did not investigate the cause of this symptom."
    - End with a clear evidence-gap statement when no direct symptom evidence exists (e.g., "No direct evidence on the cause or diagnosis of this symptom is evaluated in the retrieved research.").
    - Do NOT infer causes from pretrained knowledge or speculate on causes.
    - Keep the evidence summary brief (3–5 lines).
- CULTIVAR SPECIFICITY & CROSS-CULTIVAR SEPARATION:
  * When the user specifies a cultivar (e.g., Ramanathapuram Gundumalli, Gundumalli, Baramasi, etc.), prioritize retrieved studies for that exact cultivar.
  * Present results under two separate headings when multiple cultivars are retrieved:
    - "### Direct Evidence ([Target Cultivar Name])" for studies on the same species, same cultivar, and same management topic.
    - "### Related Cultivar Evidence ([Other Cultivar Name])" for studies on the same species but a different cultivar. Clearly label it as related evidence and do NOT merge it into the direct recommendation.
  * NEVER write "You should..." using cross-cultivar evidence. State that findings apply to the tested cultivar's experimental conditions.
  * Preserve all cultivar names exactly as retrieved.
- TOPIC RELEVANCE: Focus strictly on the primary management practice/topic requested in the user question. Include only evidence from retrieved studies whose title or text directly evaluates that requested management intervention. Exclude any study where flowering, growth, or yield is merely the outcome of an unrelated management practice (e.g., exclude pruning when asked about fertilizer).
- 1:1 CITATION CONSISTENCY: Every study provided in the retrieved context that has relevant evidence must have a corresponding summary block in "### 2. Evidence from Retrieved Studies" (or "### 2. Related Evidence from Retrieved Studies"). If a study provides supporting or secondary findings, include a concise summary with its exact paper title. Do not omit relevant studies provided in the context, and never cite or invent studies not provided.
- Use ONLY facts and numerical values directly stated in the retrieved text. Never invent, estimate, or extrapolate facts or numbers.
- Preserve species, cultivar, author, year, and all numerical values exactly as retrieved.
- Never mention similarity scores, embedding scores, vector search, or retrieval confidence.
- Keep the overall response concise and under ~350 words unless the user explicitly requested detailed research.
- If and ONLY if NONE of the retrieved chunks meaningfully answer the user's question, output strictly:
"The available research does not provide sufficient evidence."
(Do NOT output this sentence when useful partial evidence exists).`;

function buildPostHarvestPrompt(
  query: string,
  documents: PostHarvestDoc[],
  profileFacts: ProfileFact[],
  resolvedQuery: string,
  chunks?: PostHarvestChunk[],
  targetCultivar?: string,
  targetSpecies?: string,
): string {
  const contextBlocks = documents.map((doc) => {
    const facts = profileFacts.find((p) => p.document_id === doc.document_id);
    const docChunks = chunks ? chunks.filter((c) => c.document_id === doc.document_id) : [];

    const lines: string[] = [
      `SOURCE:\n${doc.title} (${doc.authors}, ${doc.year}) [ID: ${doc.document_id}]`,
      `SPECIES:\n${doc.species} | CULTIVAR: ${doc.cultivar}`,
    ];
    if (doc.limitations) {
      lines.push(`LIMITATIONS:\n${doc.limitations}`);
    }
    if (facts && facts.facts.length > 0) {
      lines.push(`VERIFIED FACTS:\n${facts.facts.map((f) => `- ${f}`).join('\n')}`);
    }
    if (docChunks.length > 0) {
      lines.push(`EVIDENCE TEXT:\n${docChunks.map((c) => c.text).join('\n\n')}`);
    }
    return lines.join('\n\n');
  });

  const contextText = contextBlocks.join('\n\n==================================================\n\n');

  const isSymptom = isSymptomQuery(resolvedQuery || query);
  const symptomHeader = isSymptom
    ? `[SYMPTOM QUERY NOTICE]\n` +
      `The user is asking about a plant symptom/observation. If no retrieved study directly investigates this symptom:\n` +
      `1. Begin Direct Answer with: "The retrieved research does not directly investigate this symptom."\n` +
      `2. Rename Section 2 heading to "### 2. Related Evidence from Retrieved Studies".\n` +
      `3. Label the study under "#### Related Evidence".\n` +
      `4. Write: "The retrieved study evaluated post-harvest storage and packaging conditions, but it did not investigate the cause of this symptom."\n` +
      `5. NEVER write causal phrases like "This could be caused by...", "Other factors such as...", or "Therefore it may be due to...".\n` +
      `6. End with a clear evidence-gap statement.\n\n`
    : '';

  // Chunk-aware cultivar separation + evidence-scoped Direct Answer wording
  const cultivarInstruction = buildCultivarInstruction(
    documents.slice(0, 4).map((d) => ({ title: d.title, text: '', cultivar: d.cultivar })),
    targetCultivar
  );

  // Active-species header: prevents LLM from mixing evidence from other jasmine species
  const speciesHeader = targetSpecies
    ? `ACTIVE SPECIES: ${targetSpecies}\n` +
      `The user grows ${targetSpecies}. Present ONLY studies on ${targetSpecies} as direct evidence.\n` +
      `If a retrieved study is on a different jasmine species, present it ONLY under a clearly labelled section: "#### Related Species Evidence" and NEVER as a direct recommendation.\n\n`
    : '';

  return (
    `==================================================\n` +
    `CONTEXT\n` +
    `==================================================\n\n` +
    `${contextText}\n\n` +
    `==================================================\n` +
    `USER QUESTION\n` +
    `==================================================\n\n` +
    `${speciesHeader}` +
    `${cultivarInstruction}` +
    `${symptomHeader}` +
    `${resolvedQuery || query}\n\n` +
    FORMAT_INSTRUCTIONS
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cultivar-separation instruction builder (used by buildGeneralPrompt)
// ─────────────────────────────────────────────────────────────────────────────

/** Known cultivar aliases → canonical display names, longest first. */
const CULTIVAR_ALIASES_FOR_DETECTION: Array<[string, string]> = [
  ['ramanathapuram gundumalli', 'Ramanathapuram Gundumalli'],
  ['mysuru mallige', 'Mysuru Mallige'],
  ['mysore mallige', 'Mysuru Mallige'],
  ['double mogra', 'Double Mogra'],
  ['single mogra', 'Single Mogra'],
  ['pacha mullai', 'Pacha Mullai'],
  ['muthu mullai', 'Muthu Mullai'],
  ['gundumalli', 'Gundumalli'],
  ['baramasi', 'Baramasi'],
  ['mogra', 'Mogra'],
  ['co-1', 'CO-1'],
  ['co-2', 'CO-2'],
];

/** Scan chunk titles + text for known cultivar names. */
function detectCultivarsInChunks(chunks: { title?: string; text?: string; cultivar?: string }[]): Set<string> {
  const found = new Set<string>();
  for (const c of chunks) {
    const haystack = `${c.title || ''} ${c.text || ''} ${c.cultivar || ''}`.toLowerCase();
    for (const [alias, canonical] of CULTIVAR_ALIASES_FOR_DETECTION) {
      if (haystack.includes(alias)) {
        found.add(canonical);
        break; // one per chunk
      }
    }
  }
  return found;
}

/**
 * Builds a cultivar-separation + evidence-scoped wording instruction block.
 *
 * Fires when:
 *   a) An explicit targetCultivar is set, OR
 *   b) Multiple cultivars are detected in the retrieved chunks.
 *
 * Always mandates evidence-scoped Direct Answer language to prevent absolute
 * recommendations like "December 2nd week is the best pruning time."
 */
function buildCultivarInstruction(
  chunks: { title?: string; text?: string; cultivar?: string }[],
  targetCultivar?: string,
): string {
  const detectedCultivars = detectCultivarsInChunks(chunks);
  const hasMixed = detectedCultivars.size >= 2;
  const hasTarget = Boolean(targetCultivar);

  if (!hasTarget && !hasMixed) {
    // Single or unknown cultivar, no explicit target — only add scoped-wording rule
    return (
      `EVIDENCE-SCOPED DIRECT ANSWER (MANDATORY):\n` +
      `The "### 1. Direct Answer" section MUST use scoped language tied to the retrieved study's experimental conditions.\n` +
      `  ✗ NEVER: "December 2nd week is the best pruning time."\n` +
      `  ✓ ALWAYS: "Among the retrieved Jasminum sambac studies, pruning during the 2nd week of December was reported to produce higher flower yield under the tested experimental conditions."\n\n`
    );
  }

  // Determine the primary cultivar for the "Direct Evidence" label
  const primaryCultivar =
    targetCultivar ||
    (detectedCultivars.size >= 1 ? [...detectedCultivars][0] : null);

  const detectedList = [...detectedCultivars].join(', ');

  const lines: string[] = [];
  if (primaryCultivar) lines.push(`USER TARGET CULTIVAR: ${primaryCultivar}`);
  if (hasMixed) lines.push(`RETRIEVED CULTIVARS IN CONTEXT: ${detectedList}`);

  lines.push(
    `CULTIVAR SEPARATION RULES (MANDATORY):`,
    `1. TOPIC FILTER FIRST: Determine the primary management topic (e.g., fertilizer, pruning, irrigation, storage) requested by the user. Include ONLY studies whose intervention matches that topic. Completely EXCLUDE any unrelated intervention studies (e.g., do not include pruning studies in a fertilizer question), even if they share the same outcome (flowering or yield).`,
    `2. Inside "### 2. Evidence from Retrieved Studies", create two clearly labelled sub-sections for the remaining TOPIC-RELEVANT studies:`,
    `   a) "#### Direct Evidence${primaryCultivar ? ` (${primaryCultivar})` : ''}" — for studies on ${primaryCultivar || 'the target cultivar'} or studies that do not specify a cultivar.`,
    `   b) "#### Related Cultivar Evidence" — for studies on any OTHER cultivar (e.g., Baramasi when user grows Mogra). Name the other cultivar explicitly.`,
    `3. NEVER merge yield values, timing, or treatment results from different cultivars into one recommendation.`,
    `4. EVIDENCE-SCOPED DIRECT ANSWER (MANDATORY): "### 1. Direct Answer" MUST use scoped language:`,
    `   ✗ NEVER: "December 2nd week is the best pruning time."`,
    `   ✓ ALWAYS: "Among the retrieved Jasminum sambac studies, pruning during the 2nd week of December was reported to produce higher flower yield under the tested experimental conditions."`,
    `5. Every TOPIC-RELEVANT retrieved study must appear in exactly one sub-section. Do not omit any relevant studies.`,
    `6. Preserve all paper titles, cultivar names, numerical values, and citations exactly as retrieved.`,
  );

  return lines.join('\n') + '\n\n';
}

function buildGeneralPrompt(
  query: string,
  chunks: GeneralChunk[],
  resolvedQuery: string,
  targetCultivar?: string,
  targetSpecies?: string,
): string {
  const contextBlocks = chunks.slice(0, 4).map((c) => {
    const lines = [
      `SOURCE:\n${c.title || c.filename}${c.year ? ` (${c.year})` : ''}`,
      `SPECIES:\n${c.species || 'Jasminum sambac'}`,
      `CATEGORY:\n${c.category || 'Cultivation'}`,
    ];
    if (c.is_cross_species && c.cross_species_note) {
      lines.push(`CROSS-SPECIES NOTE:\n${c.cross_species_note}`);
    }
    lines.push(`EVIDENCE TEXT:\n${c.text}`);
    return lines.join('\n\n');
  });

  const contextText = contextBlocks.join('\n\n==================================================\n\n');

  const isSymptom = isSymptomQuery(resolvedQuery || query);
  const symptomHeader = isSymptom
    ? `[SYMPTOM QUERY NOTICE]\n` +
      `The user is asking about a plant symptom/observation. If no retrieved study directly investigates this symptom:\n` +
      `1. Begin Direct Answer with: "The retrieved research does not directly investigate this symptom."\n` +
      `2. Rename Section 2 heading to "### 2. Related Evidence from Retrieved Studies".\n` +
      `3. Label the study under "#### Related Evidence".\n` +
      `4. Write: "The retrieved study evaluated [evaluated topic X], but it did not investigate the cause of this symptom."\n` +
      `5. NEVER write causal phrases like "This could be caused by...", "Other factors such as...", or "Therefore it may be due to...".\n` +
      `6. End with a clear evidence-gap statement.\n\n`
    : '';

    // Chunk-aware cultivar separation + evidence-scoped Direct Answer wording
  const cultivarInstruction = buildCultivarInstruction(chunks.slice(0, 4), targetCultivar);

  // Active-species header: prevents LLM from mixing evidence from other jasmine species
  const speciesHeader = targetSpecies
    ? `ACTIVE SPECIES: ${targetSpecies}\n` +
      `The user grows ${targetSpecies}. Present ONLY studies on ${targetSpecies} as direct evidence.\n` +
      `If a retrieved study is on a different jasmine species, present it ONLY under a clearly labelled section: "#### Related Species Evidence" and NEVER as a direct recommendation.\n\n`
    : '';

  return (
    `==================================================\n` +
    `CONTEXT\n` +
    `==================================================\n\n` +
    `${contextText}\n\n` +
    `==================================================\n` +
    `USER QUESTION\n` +
    `==================================================\n\n` +
    `${speciesHeader}` +
    `${cultivarInstruction}` +
    `${symptomHeader}` +
    `${resolvedQuery || query}\n\n` +
    FORMAT_INSTRUCTIONS
  );
}

export async function callLLM(userPrompt: string): Promise<string> {
  if (!env.OPENROUTER_API_KEY) {
    throw Errors.MISSING_API_KEY();
  }

  try {
    const response = await axios.post(
      `${env.OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: env.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'JasmineGPT',
        },
        timeout: 30_000,
      },
    );

    const content: string = response.data?.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('Empty LLM response');
    return content;
  } catch (err) {
    const axErr = err as AxiosError;
    logger.error({ status: axErr.response?.status }, 'LLM call failed');
    if (axErr.code === 'ECONNREFUSED') throw Errors.LLM_UNAVAILABLE();
    if (axErr.response?.status === 401) throw Errors.MISSING_API_KEY();
    throw Errors.LLM_UNAVAILABLE();
  }
}

export { buildPostHarvestPrompt, buildGeneralPrompt };
