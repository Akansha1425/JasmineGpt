/**
 * JasmineGPT — Chat Controller (Orchestrator)
 * =============================================
 * Coordinates the full pipeline for a single conversational turn:
 *
 *   1. Validate request
 *   2. Load conversation memory + recent turns
 *   3. Resolve follow-up → standalone query (deterministic)
 *   4. Route question (MEMORY_UPDATE | GENERAL_RAG | POSTHARVEST)
 *   5. Call RAG sidecar (if not MEMORY_UPDATE)
 *   6. Validate evidence (gate LLM call)
 *   7. Call LLM (only if evidence is supported)
 *   8. Save user + assistant messages to MongoDB
 *   9. Update conversation memory
 *  10. Return structured response
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { Errors } from '../utils/errors';
import { env } from '../config/env';
import { routeQuestion } from '../services/router/questionRouter';
import { resolveFollowup } from '../services/router/contextResolver';
import { retrieveGeneral, retrievePostHarvest } from '../services/rag/ragClient';
import { callLLM, buildPostHarvestPrompt, buildGeneralPrompt } from '../services/llm/llmService';
import {
  getConversation,
  appendMessage,
  mergeMemoryFromQuestion,
  getRecentTurns,
  getMemory,
  updateMemory,
  generateTitle,
  updateConversationTitle,
} from '../services/conversation/conversationService';
import {
  filterChunksByTopic,
  isSymptomQuery,
  studyDirectlyInvestigatesSymptom,
  sanitizeSymptomResponse,
  getStudyEvaluatedTopic,
} from '../services/router/topicFilter';
import { reconcileSourcesAndEvidence } from '../services/conversation/citationReconciler';
import {
  detectLanguage,
  normalizeQueryToEnglish,
  translateResponseToTarget,
} from '../services/language/languageService';
import type {
  RouteType,
  EvidenceStatus,
  SourceDoc,
  ChatRequest,
  ChatResponse,
  PostHarvestDoc,
  ProfileFact,
  PostHarvestChunk,
  GeneralChunk,
} from '../types';

// ── Memory-update response ────────────────────────────────────────────────────
function memoryUpdateResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('gundumalli')) {
    return "Got it — I've noted that you grow Jasminum sambac cv. Gundumalli. I'll use this context for the rest of our conversation.";
  }
  if (q.includes('pacha mullai') || q.includes('auriculatum')) {
    return "Got it — I've noted that you grow Jasminum auriculatum (Pacha Mullai ecotype). I'll use this context throughout our conversation.";
  }
  if (q.includes('sambac') || q.includes('jasmine') || q.includes('jasmin')) {
    return "Understood — I've saved your farm profile information for this conversation.";
  }
  return "I've noted that information and will keep it in mind for this conversation.";
}

// ── Response Formatters for Post-Retrieval Fallbacks ────────────────────────
function insufficientEvidenceResponse(_reason?: string): string {
  return 'The available research does not provide sufficient evidence.';
}

function formatPostHarvestFallback(
  ragResult: {
    documents: PostHarvestDoc[];
    profile_facts: ProfileFact[];
    chunks?: PostHarvestChunk[];
  },
  query: string,
  targetCultivar?: string,
): string {
  const sections: string[] = [];
  const isSymptom = isSymptomQuery(query);
  const directlyInvestigates = isSymptom && (
    ragResult.documents.some((d) => studyDirectlyInvestigatesSymptom(query, `${d.title} ${d.limitations || ''}`)) ||
    ragResult.profile_facts.some((pf) => studyDirectlyInvestigatesSymptom(query, pf.facts.join(' ')))
  );

  // 1. Direct Answer
  if (isSymptom && !directlyInvestigates) {
    sections.push(
      `### 1. Direct Answer\nThe retrieved research does not directly investigate this symptom. The available studies evaluated post-harvest storage and packaging parameters, and a definitive diagnosis or cause for this symptom cannot be drawn from the retrieved evidence.`
    );
  } else {
    const topFact = ragResult.profile_facts[0]?.facts[0] || 'Evidence is available from verified post-harvest research on jasmine.';
    const directAnswer = topFact.replace(/^Study: [^,]+,\s*/, '');
    sections.push(`### 1. Direct Answer\nBased on verified research, ${directAnswer.charAt(0).toLowerCase() + directAnswer.slice(1)}`);
  }

  // 2. Evidence from Retrieved Studies (or Related Evidence if indirect symptom query)
  sections.push(
    isSymptom && !directlyInvestigates
      ? `### 2. Related Evidence from Retrieved Studies`
      : `### 2. Evidence from Retrieved Studies`
  );

  const renderDoc = (pf: ProfileFact) => {
    const doc = ragResult.documents.find((d) => d.document_id === pf.document_id);
    const title = doc?.title ?? pf.document_id;
    const authorYear = doc?.authors && doc?.year ? ` (${doc.authors}, ${doc.year})` : '';

    const bestFinding = pf.facts.find((f) => f.toLowerCase().includes('best reported') || f.toLowerCase().includes('reported')) ?? pf.facts[0] ?? 'Post-harvest quality and shelf-life evaluation.';

    const condList: string[] = [];
    if (doc?.species) condList.push(`Species: ${doc.species}`);
    if (doc?.cultivar && doc.cultivar !== 'NOT_REPORTED') condList.push(`Cultivar: ${doc.cultivar}`);
    const condFact = pf.facts.find((f) =>
      f.toLowerCase().includes('packaging') ||
      f.toLowerCase().includes('polythene') ||
      f.toLowerCase().includes('boric acid') ||
      f.toLowerCase().includes('temperature') ||
      f.toLowerCase().includes('°c') ||
      f.toLowerCase().includes('box') ||
      f.toLowerCase().includes('foam') ||
      f.toLowerCase().includes('chitosan')
    );
    if (condFact) condList.push(condFact);

    const outcomeFact = pf.facts.find((f) =>
      f.toLowerCase().includes('freshness') ||
      f.toLowerCase().includes('shelf life') ||
      f.toLowerCase().includes('flower opening') ||
      f.toLowerCase().includes('colour retention') ||
      f.toLowerCase().includes('moisture')
    );

    if (isSymptom && !directlyInvestigates) {
      let studyText = `- **Paper Title**: ${title}${authorYear}\n` +
        `- **Key Finding**: The retrieved study evaluated post-harvest storage and packaging conditions, but it did not investigate the cause of this symptom. ${bestFinding}\n` +
        `- **Experimental Conditions**: ${condList.length > 0 ? condList.join('; ') : 'Controlled storage conditions'}`;
      if (outcomeFact) {
        studyText += `\n- **Reported Outcome**: ${outcomeFact}`;
      }
      return studyText;
    }

    let studyText = `- **Paper Title**: ${title}${authorYear}\n` +
      `- **Key Finding**: ${bestFinding}\n` +
      `- **Experimental Conditions**: ${condList.length > 0 ? condList.join('; ') : 'Controlled storage conditions'}`;

    if (outcomeFact) {
      studyText += `\n- **Reported Outcome**: ${outcomeFact}`;
    }

    return studyText;
  };

  if (isSymptom && !directlyInvestigates) {
    sections.push(`#### Related Evidence`);
    for (const pf of ragResult.profile_facts) {
      sections.push(renderDoc(pf));
    }
  } else {
    // Determine the primary cultivar for separating Direct vs Related
    const detectedCultivars = ragResult.documents
      .map((d) => d.cultivar)
      .filter((c) => c && c !== 'NOT_REPORTED');
    const uniqueCultivars = [...new Set(detectedCultivars)];
    const primaryCultivar = targetCultivar || (uniqueCultivars.length >= 1 ? uniqueCultivars[0] : null);
    const hasMultipleCultivars = uniqueCultivars.length >= 2;

    if (primaryCultivar && hasMultipleCultivars) {
      const directFacts = ragResult.profile_facts.filter((pf) => {
        const doc = ragResult.documents.find((d) => d.document_id === pf.document_id);
        const cv = doc?.cultivar;
        return !cv || cv === 'NOT_REPORTED' || cv.toLowerCase() === primaryCultivar.toLowerCase();
      });
      const relatedFacts = ragResult.profile_facts.filter((pf) => !directFacts.includes(pf));

      if (directFacts.length > 0) {
        sections.push(`#### Direct Evidence (${primaryCultivar})`);
        directFacts.forEach((pf) => sections.push(renderDoc(pf)));
      }
      if (relatedFacts.length > 0) {
        sections.push(`#### Related Cultivar Evidence`);
        relatedFacts.forEach((pf) => sections.push(renderDoc(pf)));
      }
    } else if (targetCultivar) {
      const directFacts = ragResult.profile_facts.filter((pf) => {
        const doc = ragResult.documents.find((d) => d.document_id === pf.document_id);
        const text = `${doc?.cultivar || ''} ${doc?.title || ''}`.toLowerCase();
        return text.includes(targetCultivar.toLowerCase());
      });
      const relatedFacts = ragResult.profile_facts.filter((pf) => !directFacts.includes(pf));

      if (directFacts.length > 0) {
        sections.push(`#### Direct Evidence (${targetCultivar})`);
        directFacts.forEach((pf) => sections.push(renderDoc(pf)));
      }
      if (relatedFacts.length > 0) {
        sections.push(`#### Related Cultivar Evidence`);
        relatedFacts.forEach((pf) => sections.push(renderDoc(pf)));
      }
    } else {
      for (const pf of ragResult.profile_facts) {
        sections.push(renderDoc(pf));
      }
    }
  }

  // 3. Research Scope
  sections.push(
    isSymptom && !directlyInvestigates
      ? `### 3. Research Scope\nThese post-harvest findings apply strictly to tested storage and packaging trials and do not establish causal factors for the observed symptom.\n\nNo direct evidence on the cause of this symptom is evaluated in the retrieved research.`
      : `### 3. Research Scope\nThese findings apply strictly to the specific post-harvest treatments, packaging materials, and storage conditions tested in the cited studies.`
  );

  return sections.join('\n\n');
}

function formatGeneralFallback(
  chunks: GeneralChunk[],
  targetSpecies: string,
  targetCultivar?: string,
  query?: string,
): string {
  if (!chunks || chunks.length === 0) {
    return 'The available research does not provide sufficient evidence.';
  }

  const sections: string[] = [];
  const isSymptom = query ? isSymptomQuery(query) : false;
  const directlyInvestigates = isSymptom && query
    ? chunks.some((c) => studyDirectlyInvestigatesSymptom(query, `${c.title || ''} ${c.text || ''}`))
    : false;

  // ── Detect cultivars in the retrieved chunks ──────────────────────────────
  const KNOWN_CULTIVARS: Array<[string, string]> = [
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

  function detectChunkCultivar(c: GeneralChunk): string | null {
    const haystack = `${c.title || ''} ${c.text || ''}`.toLowerCase();
    for (const [alias, canonical] of KNOWN_CULTIVARS) {
      if (haystack.includes(alias)) return canonical;
    }
    return null;
  }

  // The effective primary cultivar: explicit target, or user memory, or first detected
  const detectedAll = chunks.map(detectChunkCultivar).filter(Boolean) as string[];
  const uniqueCultivars = [...new Set(detectedAll)];
  const primaryCultivar = targetCultivar || (uniqueCultivars.length >= 1 ? uniqueCultivars[0] : null);
  const hasMultipleCultivars = uniqueCultivars.length >= 2;

  // ── 1. Direct Answer ──────────────────────────────────────────────────────
  if (isSymptom && !directlyInvestigates) {
    const evaluatedPractice = chunks.length > 0 ? getStudyEvaluatedTopic(chunks[0]) : 'specific agronomic trials';
    sections.push(
      `### 1. Direct Answer\nThe retrieved research does not directly investigate this symptom. The retrieved studies evaluated ${evaluatedPractice}, and a definitive diagnosis or causal conclusion for this symptom cannot be drawn from the retrieved evidence.`
    );
  } else {
    // Evidence-scoped Direct Answer: no absolute recommendations
    const topChunk = chunks[0];
    const summarySnippet = topChunk.text.slice(0, 180).replace(/\s+/g, ' ').trim();
    const speciesLabel = topChunk.species || targetSpecies;
    const cultivarLabel = primaryCultivar ? ` (cv. ${primaryCultivar})` : '';
    sections.push(
      `### 1. Direct Answer\nAmong the retrieved ${speciesLabel}${cultivarLabel} studies, the following was reported under the tested experimental conditions: ${summarySnippet}...`
    );
  }

  // ── 2. Evidence sections ──────────────────────────────────────────────────
  sections.push(
    isSymptom && !directlyInvestigates
      ? `### 2. Related Evidence from Retrieved Studies`
      : `### 2. Evidence from Retrieved Studies`
  );

  const renderChunk = (c: GeneralChunk) => {
    const title = c.title || c.filename;
    const authorYear = c.author && c.year ? ` (${c.author}, ${c.year})` : c.year ? ` (${c.year})` : '';
    const condList: string[] = [];
    if (c.species) condList.push(`Species: ${c.species}`);
    if (c.category) condList.push(`Category: ${c.category}`);
    const cultivar = detectChunkCultivar(c);
    if (cultivar) condList.push(`Cultivar: ${cultivar}`);

    if (isSymptom && !directlyInvestigates) {
      const topic = getStudyEvaluatedTopic(c);
      return (
        `- **Paper Title**: ${title}${authorYear}\n` +
        `- **Key Finding**: The retrieved study evaluated ${topic}, but it did not investigate the cause of this symptom. ${c.text.slice(0, 180).replace(/\s+/g, ' ').trim()}...\n` +
        `- **Experimental Conditions**: ${condList.join('; ') || 'Experimental field/crop conditions'}`
      );
    }

    return (
      `- **Paper Title**: ${title}${authorYear}\n` +
      `- **Key Finding**: ${c.text.slice(0, 240).replace(/\s+/g, ' ').trim()}...\n` +
      `- **Experimental Conditions**: ${condList.join('; ') || 'Experimental field/crop conditions'}`
    );
  };

  if (isSymptom && !directlyInvestigates) {
    sections.push(`#### Related Evidence`);
    for (const c of chunks.slice(0, 3)) {
      sections.push(renderChunk(c));
    }
  } else if (primaryCultivar && hasMultipleCultivars) {
    // Multiple cultivars detected: always separate them
    const directChunks = chunks.filter((c) => {
      const cv = detectChunkCultivar(c);
      return cv === null || cv === primaryCultivar;
    });
    const relatedChunks = chunks.filter((c) => {
      const cv = detectChunkCultivar(c);
      return cv !== null && cv !== primaryCultivar;
    });

    if (directChunks.length > 0) {
      sections.push(`#### Direct Evidence (${primaryCultivar})`);
      directChunks.slice(0, 2).forEach((c) => sections.push(renderChunk(c)));
    }
    if (relatedChunks.length > 0) {
      sections.push(`#### Related Cultivar Evidence`);
      relatedChunks.slice(0, 2).forEach((c) => sections.push(renderChunk(c)));
    }
  } else if (targetCultivar) {
    // Explicit targetCultivar but single cultivar detected — still separate by text match
    const directCultivarChunks = chunks.filter((c) => {
      const text = `${c.title || ''} ${c.filename || ''} ${c.text || ''}`.toLowerCase();
      return text.includes(targetCultivar.toLowerCase());
    });
    const relatedCultivarChunks = chunks.filter((c) => !directCultivarChunks.includes(c));

    if (directCultivarChunks.length > 0) {
      sections.push(`#### Direct Evidence (${targetCultivar})`);
      directCultivarChunks.slice(0, 2).forEach((c) => sections.push(renderChunk(c)));
    }
    if (relatedCultivarChunks.length > 0) {
      sections.push(`#### Related Cultivar Evidence`);
      relatedCultivarChunks.slice(0, 2).forEach((c) => sections.push(renderChunk(c)));
    }
  } else {
    for (const c of chunks.slice(0, 3)) {
      sections.push(renderChunk(c));
    }
  }

  // ── 3. Research Scope ─────────────────────────────────────────────────────
  sections.push(
    isSymptom && !directlyInvestigates
      ? `### 3. Research Scope\nThese experimental findings apply strictly to the evaluated agronomic treatments and do not establish causal factors or remedies for the observed symptom.\n\nNo direct evidence on the cause of this symptom is evaluated in the retrieved research.`
      : `### 3. Research Scope\nThese findings apply specifically to the tested experimental conditions, field locations, and agronomic management practices reported in the cited research.`
  );

  return sections.join('\n\n');
}

export async function handleChat(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId, message, languagePreference } = req.body as ChatRequest;

    // ── Basic validation ────────────────────────────────────────────────
    if (!conversationId || !message?.trim()) {
      throw Errors.INVALID_REQUEST('conversationId and message are required');
    }
    if (message.length > env.MAX_MESSAGE_LENGTH) {
      throw Errors.INVALID_REQUEST(`Message exceeds maximum length of ${env.MAX_MESSAGE_LENGTH} characters`);
    }

    const cleanMessage = message.trim();

    // ── Language Detection & Normalization ──────────────────────────────
    const { detected: detectedLang, target: targetLang } = detectLanguage(cleanMessage, languagePreference);
    const queryForPipeline = detectedLang === 'kn'
      ? await normalizeQueryToEnglish(cleanMessage, detectedLang)
      : cleanMessage;

    // ── Load conversation state ─────────────────────────────────────────
    const [conv, memory, recentTurns] = await Promise.all([
      getConversation(conversationId),
      getMemory(conversationId),
      getRecentTurns(conversationId, env.MAX_CONTEXT_TURNS),
    ]);

    // ── Resolve follow-up query ─────────────────────────────────────────
    const resolved = resolveFollowup(queryForPipeline, recentTurns, memory);
    const standaloneQuery = resolved.standaloneQuery;

    logger.info(
      {
        conversationId,
        method: resolved.method,
        original: cleanMessage,
        detectedLang,
        targetLang,
        queryForPipeline,
        resolved: standaloneQuery,
      },
      'Query resolved',
    );

    // ── Route question ──────────────────────────────────────────────────
    const route: RouteType = routeQuestion(standaloneQuery, memory);
    logger.info({ conversationId, route }, 'Question routed');

    // ── Variables to fill ───────────────────────────────────────────────
    let assistantContent = '';
    let evidenceStatus: EvidenceStatus = 'NOT_APPLICABLE';
    let sources: SourceDoc[] = [];
    let llmCalled = false;
    let selectedDocs: string[] = [];

    // ════════════════════════════════════════════════════════════════════
    // MEMORY_UPDATE — profile statement
    // ════════════════════════════════════════════════════════════════════
    if (route === 'MEMORY_UPDATE') {
      assistantContent = memoryUpdateResponse(cleanMessage);
      evidenceStatus = 'NOT_APPLICABLE';
    }

    // ════════════════════════════════════════════════════════════════════
    // POSTHARVEST — evidence-gated retrieval
    // ════════════════════════════════════════════════════════════════════
    else if (route === 'POSTHARVEST') {
      const ragResult = await retrievePostHarvest(standaloneQuery);
      evidenceStatus = ragResult.evidence_status;
      selectedDocs = ragResult.selected_docs;

      if (!ragResult.supported) {
        // Evidence gate: LLM must NOT be called
        assistantContent = insufficientEvidenceResponse(ragResult.reason);
        llmCalled = false;
        logger.info({ conversationId, reason: ragResult.reason }, 'LLM blocked: INSUFFICIENT_EVIDENCE');
      } else {
        // Build sources
        sources = ragResult.documents.map((d) => ({
          documentId: d.document_id,
          title: d.title,
          authors: d.authors,
          year: d.year,
          doi: d.doi,
        }));

        const targetCultivar = resolved.cultivar || memory.cultivar || undefined;

        // Call LLM (if API key available)
        if (env.OPENROUTER_API_KEY) {
          try {
            const prompt = buildPostHarvestPrompt(
              standaloneQuery,
              ragResult.documents,
              ragResult.profile_facts,
              standaloneQuery,
              ragResult.chunks,
              targetCultivar,
              memory.species || undefined,
            );
            assistantContent = await callLLM(prompt);
            llmCalled = true;
          } catch (llmErr) {
            logger.warn({ err: llmErr }, 'LLM failed — falling back to formatted profile facts');
            assistantContent = formatPostHarvestFallback(ragResult, standaloneQuery, targetCultivar);
            llmCalled = false;
          }
        } else {
          // No API key — return formatted facts directly
          assistantContent = formatPostHarvestFallback(ragResult, standaloneQuery, targetCultivar);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // GENERAL_RAG
    // ════════════════════════════════════════════════════════════════════
    else {
      const targetSpecies = resolved.species || memory.species || 'Jasminum sambac';
      const targetCultivar = resolved.cultivar || memory.cultivar || undefined;

      const ragResult = await retrieveGeneral(standaloneQuery, 5, {
        species: targetSpecies,
        cultivar: targetCultivar,
        allowCrossSpecies: false,
      });

      // ── Hard species-mismatch reclassification ─────────────────────────────
      // The Python sidecar may return chunks from a different jasmine species
      // without setting is_cross_species=true (e.g. if the index mixed metadata).
      // We enforce the active species here regardless of sidecar flags:
      // Any chunk whose `species` field names a recognisably different species
      // than targetSpecies is demoted to the cross-species bucket.
      const JASMINE_SPECIES_ALIASES: Record<string, string> = {
        'sambac': 'Jasminum sambac',
        'jasminum sambac': 'Jasminum sambac',
        'auriculatum': 'Jasminum auriculatum',
        'jasminum auriculatum': 'Jasminum auriculatum',
        'grandiflorum': 'Jasminum grandiflorum',
        'jasminum grandiflorum': 'Jasminum grandiflorum',
        'multiflorum': 'Jasminum multiflorum',
        'jasminum multiflorum': 'Jasminum multiflorum',
      };

      function resolveSpeciesCanonical(raw: string | undefined): string | null {
        if (!raw) return null;
        const lower = raw.toLowerCase().trim();
        // Direct lookup
        if (JASMINE_SPECIES_ALIASES[lower]) return JASMINE_SPECIES_ALIASES[lower];
        // Partial match (e.g. "Jasminum sambac cv. Gundumalli")
        for (const [alias, canonical] of Object.entries(JASMINE_SPECIES_ALIASES)) {
          if (lower.includes(alias)) return canonical;
        }
        return null;
      }

      const activeSpeciesCanonical = resolveSpeciesCanonical(targetSpecies) ?? targetSpecies;

      // Partition sidecar chunks into confirmed-direct and confirmed-cross lists
      const confirmedDirectRaw: typeof ragResult.chunks = [];
      const confirmedCrossRaw: typeof ragResult.chunks = [];

      for (const chunk of ragResult.chunks) {
        const chunkSpecies = resolveSpeciesCanonical(chunk.species);
        const isMismatch =
          chunkSpecies !== null &&
          chunkSpecies.toLowerCase() !== activeSpeciesCanonical.toLowerCase();

        if (chunk.is_cross_species || isMismatch) {
          // Force into cross bucket; annotate if not already annotated
          confirmedCrossRaw.push({
            ...chunk,
            is_cross_species: true,
            cross_species_note:
              chunk.cross_species_note ||
              (isMismatch
                ? `Study species (${chunk.species}) differs from active species (${targetSpecies}).`
                : undefined),
          });
        } else {
          confirmedDirectRaw.push(chunk);
        }
      }

      // Apply Topic-Relevance Filtering: Keep only studies directly evaluating the requested management topic
      const { filteredChunks: directChunks } = filterChunksByTopic(standaloneQuery, confirmedDirectRaw);
      const { filteredChunks: crossChunks } = filterChunksByTopic(standaloneQuery, confirmedCrossRaw);

      if (directChunks.length > 0 && ragResult.direct_evidence_found !== false) {
        evidenceStatus = 'DIRECT_EVIDENCE';
      } else if (crossChunks.length > 0 || ragResult.cross_species_used) {
        evidenceStatus = 'SOURCE_REVIEW_REQUIRED';
      } else {
        evidenceStatus = 'INSUFFICIENT_EVIDENCE';
      }

      // Populate real sources matching the evidence status
      if (evidenceStatus === 'DIRECT_EVIDENCE') {
        sources = directChunks.map((c) => ({
          documentId: c.chunk_id,
          title: c.title || c.filename,
          authors: c.author,
          year: c.year,
          doi: c.doi,
          page: c.page,
          species: c.species,
          category: c.category,
          isCrossSpecies: false,
          crossSpeciesNote: c.cross_species_note,
        }));
      } else if (evidenceStatus === 'SOURCE_REVIEW_REQUIRED') {
        sources = crossChunks.map((c) => ({
          documentId: c.chunk_id,
          title: c.title || c.filename,
          authors: c.author,
          year: c.year,
          doi: c.doi,
          page: c.page,
          species: c.species,
          category: c.category,
          isCrossSpecies: true,
          crossSpeciesNote: c.cross_species_note,
        }));
      } else {
        sources = [];
      }

      if (evidenceStatus === 'INSUFFICIENT_EVIDENCE') {
        assistantContent = 'The available research does not provide sufficient evidence.';
        llmCalled = false;
      } else if (env.OPENROUTER_API_KEY) {
        try {
          const selectedChunks = evidenceStatus === 'DIRECT_EVIDENCE' ? directChunks : crossChunks;
          const prompt = buildGeneralPrompt(standaloneQuery, selectedChunks, standaloneQuery, targetCultivar, targetSpecies);
          assistantContent = await callLLM(prompt);
          llmCalled = true;
        } catch (llmErr) {
          logger.warn({ err: llmErr }, 'LLM failed for general RAG — using fallback formatting');
          const selectedChunks = evidenceStatus === 'DIRECT_EVIDENCE' ? directChunks : crossChunks;
          assistantContent = formatGeneralFallback(selectedChunks, targetSpecies, targetCultivar, standaloneQuery);
        }
      } else {
        // No API key — return structured evidence directly
        const selectedChunks = evidenceStatus === 'DIRECT_EVIDENCE' ? directChunks : crossChunks;
        assistantContent = formatGeneralFallback(selectedChunks, targetSpecies, targetCultivar, standaloneQuery);
      }
    }

    // ── Sanitize Symptom Responses (prevent unauthorized causal inference) ──
    assistantContent = sanitizeSymptomResponse(
      assistantContent,
      standaloneQuery,
      sources.map((s) => ({ title: s.title, text: s.category || '' })),
    );

    // ── Enforce 1:1 Evidence-to-Sources Citation Consistency ────────────
    const reconciliation = reconcileSourcesAndEvidence(assistantContent, sources);
    sources = reconciliation.reconciledSources;
    assistantContent = reconciliation.reconciledContent;

    // ── Translate only the final rendered answer (if target is Kannada) ──
    if (targetLang === 'kn') {
      assistantContent = await translateResponseToTarget(assistantContent, 'kn');
    }

    // ── Auto-title the conversation on first turn ───────────────────────
    const msgCount = recentTurns.length;
    if (msgCount === 0 && conv.title === 'New Chat') {
      const title = generateTitle(cleanMessage);
      await updateConversationTitle(conversationId, title);
    }

    // ── Persist messages ────────────────────────────────────────────────
    const [userMsg, assistantMsg] = await Promise.all([
      appendMessage({
        conversationId,
        role: 'user',
        content: cleanMessage,
        route,
        resolvedQuery: standaloneQuery !== cleanMessage ? standaloneQuery : undefined,
      }),
      appendMessage({
        conversationId,
        role: 'assistant',
        content: assistantContent,
        route,
        evidenceStatus,
        sources,
        resolvedQuery: standaloneQuery !== cleanMessage ? standaloneQuery : undefined,
        llmCalled,
      }),
    ]);

    // ── Update memory ───────────────────────────────────────────────────
    await mergeMemoryFromQuestion(conversationId, `${cleanMessage} ${standaloneQuery}`, route, selectedDocs);

    // ── Respond ─────────────────────────────────────────────────────────
    const response: ChatResponse = {
      conversationId,
      userMessageId: String(userMsg._id),
      assistantMessageId: String(assistantMsg._id),
      userMessage: cleanMessage,
      assistantMessage: assistantContent,
      route,
      evidenceStatus,
      llmCalled,
      sources,
      resolvedQuery: standaloneQuery,
      topScore: sources.length > 0 && typeof sources[0].score === 'number' ? sources[0].score : undefined,
      detectedLanguage: detectedLang,
      targetLanguage: targetLang,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
}
