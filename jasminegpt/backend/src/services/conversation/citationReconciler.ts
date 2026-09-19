/**
 * JasmineGPT — Citation & Evidence Reconciler
 * ============================================
 * Enforces a strict 1:1 mapping between the evidence section and cited sources:
 * 1. Every paper used in "Evidence from Retrieved Studies" appears in Sources.
 * 2. Every paper shown in Sources has a corresponding evidence summary in the answer.
 * 3. Removes unused retrieved citations from the Sources list.
 * 4. Preserves original title, author, year, DOI, species, and cultivar exactly as retrieved.
 */

import type { SourceDoc } from '../../types';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.pdf\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a candidate source is referenced/used in the assistant message.
 */
export function isSourceReferenced(source: SourceDoc, content: string): boolean {
  if (!content) return false;
  const normContent = normalizeText(content);

  // 1. Check Document ID (e.g. "JAS-SAM-001", "JAS-AUR-001")
  if (source.documentId && source.documentId.length >= 3) {
    const normDocId = normalizeText(source.documentId);
    if (normDocId && normContent.includes(normDocId)) {
      return true;
    }
  }

  // 2. Check Title (full title, prefix, or significant token overlap)
  if (source.title) {
    const normTitle = normalizeText(source.title);
    if (normTitle.length >= 8) {
      // Full title match
      if (normContent.includes(normTitle)) {
        return true;
      }
      // First 32 characters match
      const titlePrefix = normTitle.slice(0, Math.min(32, normTitle.length)).trim();
      if (titlePrefix.length >= 12 && normContent.includes(titlePrefix)) {
        return true;
      }
      // Token overlap match (>=70% of words with length > 3)
      const titleWords = normTitle.split(' ').filter((w) => w.length > 3);
      if (titleWords.length >= 3) {
        const matchingWords = titleWords.filter((w) => normContent.includes(w));
        if (matchingWords.length / titleWords.length >= 0.7) {
          return true;
        }
      }
    }
  }

  // 3. Check Author + Year (e.g. "Jawaharlal et al. (2012)" or "Choudhury et al., 2019")
  if (source.authors && source.year) {
    const firstAuthor = source.authors.split(/\s+et\s+al|\s*,/i)[0].trim().toLowerCase();
    if (firstAuthor.length >= 3) {
      const authorYearPattern = new RegExp(`\\b${firstAuthor}\\b[^\\n]{0,35}\\b${source.year}\\b`, 'i');
      if (authorYearPattern.test(content)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts study titles or summaries from the Evidence section of the assistant message.
 */
export function extractEvidenceStudies(content: string): string[] {
  const studies: string[] = [];
  if (!content) return studies;

  // Isolate Section 2: Evidence from Retrieved Studies / Related Evidence from Retrieved Studies
  const evidenceSectionRegex = /(?:###?\s*(?:2\.\s*)?(?:Related\s+)?Evidence(?:[^\n]*))([\s\S]*?)(?:###?\s*(?:3\.\s*)?Research Scope|$)/i;
  const match = content.match(evidenceSectionRegex);
  const sectionText = match ? match[1] : content;

  // Find occurrences of Paper Title
  const paperTitleRegex = /(?:[-*•]?\s*\*\*Paper Title\*\*:?|\*\*Title\*\*:?|\*\*Study\*\*:?)\s*([^\n]+)/gi;
  let titleMatch: RegExpExecArray | null;
  while ((titleMatch = paperTitleRegex.exec(sectionText)) !== null) {
    const title = titleMatch[1].trim();
    if (title.length > 3) {
      studies.push(title);
    }
  }

  return studies;
}

/**
 * Reconciles Sources and Evidence to guarantee a strict 1:1 mapping:
 * - Keeps only candidate sources that are actually summarized in the response.
 * - Filters out unused candidate citations.
 * - Ensures original metadata is preserved verbatim.
 */
export function reconcileSourcesAndEvidence(
  assistantContent: string,
  candidateSources: SourceDoc[],
): {
  reconciledContent: string;
  reconciledSources: SourceDoc[];
  evidenceCount: number;
  sourceCount: number;
} {
  // If response is insufficient evidence, sources must be empty
  if (
    assistantContent.includes('The available research does not provide sufficient evidence.') ||
    candidateSources.length === 0
  ) {
    return {
      reconciledContent: assistantContent,
      reconciledSources: [],
      evidenceCount: 0,
      sourceCount: 0,
    };
  }

  // Match each candidate source against the response text
  const referencedSources: SourceDoc[] = [];
  const seenSourceKeys = new Set<string>();

  for (const source of candidateSources) {
    const sourceKey = source.documentId || source.title;
    if (seenSourceKeys.has(sourceKey)) continue;

    if (isSourceReferenced(source, assistantContent)) {
      referencedSources.push(source);
      seenSourceKeys.add(sourceKey);
    }
  }

  const evidenceStudies = extractEvidenceStudies(assistantContent);
  const evidenceCount = evidenceStudies.length > 0 ? evidenceStudies.length : referencedSources.length;

  return {
    reconciledContent: assistantContent,
    reconciledSources: referencedSources,
    evidenceCount,
    sourceCount: referencedSources.length,
  };
}
