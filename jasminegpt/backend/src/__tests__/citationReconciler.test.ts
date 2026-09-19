import {
  isSourceReferenced,
  extractEvidenceStudies,
  reconcileSourcesAndEvidence,
} from '../services/conversation/citationReconciler';
import type { SourceDoc } from '../types';

describe('Citation & Evidence Reconciler', () => {
  const source1: SourceDoc = {
    documentId: 'JAS-SAM-001',
    title: 'Packaging technology for export of jasmine (Jasminum sambac Ait.) flowers',
    authors: 'Jawaharlal et al.',
    year: 2012,
    doi: '10.5958/j.0974-0112.9.2.016',
    species: 'Jasminum sambac',
  };

  const source2: SourceDoc = {
    documentId: 'JAS-SAM-002',
    title: 'Packaging Technology for Extending Shelf Life of Jasmine (Jasminum sambac CV. Gundumalli) Flowers',
    authors: 'Choudhury et al.',
    year: 2019,
    doi: '10.20546/ijcmas.2019.806.157',
    species: 'Jasminum sambac',
  };

  const source3: SourceDoc = {
    documentId: 'JAS-SAM-004',
    title: 'Edible Coating of Chitosan and Packaging Types to Maintain Quality of Jasmine Flower',
    authors: 'Ffadhilah et al.',
    year: 2024,
    doi: '10.1088/1755-1315/1359/1/012015',
    species: 'Jasminum sambac',
  };

  const source4Unused: SourceDoc = {
    documentId: 'JAS-SAM-005',
    title: 'Mycelium bio-composite foam for flower transit cushioning',
    authors: 'M Mohamed Asik et al.',
    year: 2026,
    doi: '10.1016/j.indcrop.2025.120500',
    species: 'Jasminum sambac',
  };

  const sampleAssistantContent = `
### 1. Direct Answer
Packaging jasmine buds in 60 µm polythene bags or foil-lined boxes significantly extends flower freshness and shelf life.

### 2. Evidence from Retrieved Studies
- **Paper Title**: Packaging technology for export of jasmine (Jasminum sambac Ait.) flowers (Jawaharlal et al., 2012)
  - **Key Finding**: 4% boric acid + Box A + thermocol outer pack + intermittent gel ice maintained freshness for 42.88 hours.
  - **Experimental Conditions**: Box A (foil-lined cardboard) with gel ice; reefer van/air-transport simulation.
  - **Reported Outcome**: 74.15% freshness and 29.17% flower opening at 36 h.

- **Paper Title**: Packaging Technology for Extending Shelf Life of Jasmine (Jasminum sambac CV. Gundumalli) Flowers (Choudhury et al., 2019)
  - **Key Finding**: 4% boric acid + 60 µm polythene bag stored at 7°C extended shelf life to 168.33 h.
  - **Experimental Conditions**: 60 µm polythene bags at 7°C, 80-85% RH.
  - **Reported Outcome**: 98.75% freshness and 3.16% flower opening at 24 h.

- **Paper Title**: Edible Coating of Chitosan and Packaging Types to Maintain Quality of Jasmine Flower (Ffadhilah et al., 2024)
  - **Key Finding**: 1.5% chitosan coating with sealed packaging maintained flower quality.
  - **Experimental Conditions**: 1.5% chitosan coating at 5°C.
  - **Reported Outcome**: Prolonged post-harvest freshness.

### 3. Research Scope
These findings apply strictly to the specific post-harvest treatments, packaging materials, and storage conditions evaluated in the cited studies.
`;

  test('extractEvidenceStudies extracts 3 paper titles from evidence section', () => {
    const studies = extractEvidenceStudies(sampleAssistantContent);
    expect(studies.length).toBe(3);
    expect(studies[0]).toContain('Packaging technology for export');
    expect(studies[1]).toContain('Packaging Technology for Extending Shelf Life');
    expect(studies[2]).toContain('Edible Coating of Chitosan');
  });

  test('isSourceReferenced correctly identifies referenced and unreferenced sources', () => {
    expect(isSourceReferenced(source1, sampleAssistantContent)).toBe(true);
    expect(isSourceReferenced(source2, sampleAssistantContent)).toBe(true);
    expect(isSourceReferenced(source3, sampleAssistantContent)).toBe(true);
    expect(isSourceReferenced(source4Unused, sampleAssistantContent)).toBe(false);
  });

  test('reconcileSourcesAndEvidence removes unused 4th source to ensure exact 1:1 match', () => {
    const candidateSources = [source1, source2, source3, source4Unused];
    const result = reconcileSourcesAndEvidence(sampleAssistantContent, candidateSources);

    // 4 candidate sources given, but only 3 were summarized
    expect(result.sourceCount).toBe(3);
    expect(result.evidenceCount).toBe(3);
    expect(result.reconciledSources.length).toBe(3);
    expect(result.reconciledSources).toContainEqual(source1);
    expect(result.reconciledSources).toContainEqual(source2);
    expect(result.reconciledSources).toContainEqual(source3);
    expect(result.reconciledSources).not.toContainEqual(source4Unused);

    // Metadata is preserved exactly
    expect(result.reconciledSources[0].doi).toBe(source1.doi);
    expect(result.reconciledSources[1].doi).toBe(source2.doi);
    expect(result.reconciledSources[2].doi).toBe(source3.doi);
  });

  test('reconcileSourcesAndEvidence returns empty sources for insufficient evidence', () => {
    const insufficientContent = 'The available research does not provide sufficient evidence.';
    const candidateSources = [source1, source2];
    const result = reconcileSourcesAndEvidence(insufficientContent, candidateSources);

    expect(result.sourceCount).toBe(0);
    expect(result.reconciledSources.length).toBe(0);
  });
});
