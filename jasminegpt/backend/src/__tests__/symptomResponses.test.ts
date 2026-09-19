import {
  isSymptomQuery,
  studyDirectlyInvestigatesSymptom,
  sanitizeSymptomResponse,
  getStudyEvaluatedTopic,
} from '../services/router/topicFilter';

describe('Symptom Detection & Evidence Gap Analysis', () => {
  test('isSymptomQuery detects symptom-related questions', () => {
    expect(isSymptomQuery('Why are my jasmine buds small and not opening?')).toBe(true);
    expect(isSymptomQuery('What causes small unopened buds in Jasminum sambac?')).toBe(true);
    expect(isSymptomQuery('Why are leaves yellowing and dropping?')).toBe(true);
    expect(isSymptomQuery('What causes wilting of flower buds?')).toBe(true);
    expect(isSymptomQuery('What fertilizer and nutrient management practices have been evaluated?')).toBe(false);
    expect(isSymptomQuery('What is the recommended spacing for Jasminum sambac?')).toBe(false);
  });

  test('studyDirectlyInvestigatesSymptom distinguishes direct symptom studies from unrelated trials', () => {
    const symptomQuery = 'What causes small unopened buds?';

    const unrelatedIrrigationText = 'Photosynthetic response to water stress and changes in metabolites in Jasminum sambac. Drip irrigation at 100% IW/CPE ratio.';
    const unrelatedFertilizerText = 'Yield and cost economics of Jasminum sambac Cv. Mysuru Mallige as influenced by fertigation.';
    const directBudMidgeText = 'Bioecology of Blossom Midge of Jasmine, Contarinia maculipennis. Larvae feed on floral parts causing small unopened buds and premature bud drying.';

    expect(studyDirectlyInvestigatesSymptom(symptomQuery, unrelatedIrrigationText)).toBe(false);
    expect(studyDirectlyInvestigatesSymptom(symptomQuery, unrelatedFertilizerText)).toBe(false);
    expect(studyDirectlyInvestigatesSymptom(symptomQuery, directBudMidgeText)).toBe(true);
  });

  test('getStudyEvaluatedTopic accurately identifies study topic', () => {
    expect(getStudyEvaluatedTopic({ title: 'Photosynthetic response to water stress and drip irrigation' })).toBe(
      'water stress and irrigation schedules',
    );
    expect(getStudyEvaluatedTopic({ title: 'Yield of Jasminum sambac as influenced by fertigation with NPK' })).toBe(
      'fertilizer and nutrient management',
    );
    expect(getStudyEvaluatedTopic({ title: 'Effect of pruning severity on Jasminum sambac' })).toBe(
      'pruning and canopy management',
    );
    expect(getStudyEvaluatedTopic({ title: 'Packaging and storage of jasmine flowers at 4°C' })).toBe(
      'post-harvest packaging and storage conditions',
    );
  });

  test('sanitizeSymptomResponse replaces causal phrases and labels related evidence', () => {
    const query = 'Why are my jasmine buds small and unopened?';
    const chunks = [
      {
        title: 'Photosynthetic response to water stress in Jasminum sambac',
        text: 'Irrigation at 100% IW/CPE ratio resulted in optimal photosynthesis.',
      },
    ];

    const inputContent =
      `### 1. Direct Answer\nSmall unopened buds may be caused by irrigation issues.\n\n` +
      `### 2. Evidence from Retrieved Studies\n#### Direct Evidence\n` +
      `- **Paper Title**: Photosynthetic response to water stress in Jasminum sambac\n` +
      `- **Key Finding**: This could be caused by water stress during flower bud formation.\n\n` +
      `### 3. Research Scope\nFindings apply to tested irrigation treatments.`;

    const sanitized = sanitizeSymptomResponse(inputContent, query, chunks);

    expect(sanitized).toContain('The retrieved research does not directly investigate this symptom.');
    expect(sanitized).toContain('### 2. Related Evidence from Retrieved Studies');
    expect(sanitized).not.toContain('### 2. Evidence from Retrieved Studies');
    expect(sanitized).toContain('The retrieved study evaluated water stress and irrigation schedules, but it did not investigate the cause of this symptom.');
    expect(sanitized).not.toContain('This could be caused by');
    expect(sanitized).toContain('#### Related Evidence');
    expect(sanitized).not.toContain('#### Direct Evidence');
  });

  test('sanitizeSymptomResponse does not modify responses for direct symptom studies', () => {
    const query = 'What causes small unopened buds?';
    const directChunks = [
      {
        title: 'Bioecology of Blossom Midge in Jasminum sambac',
        text: 'Contarinia maculipennis causes small unopened buds and discoloration.',
      },
    ];

    const directContent =
      `### 1. Direct Answer\nBlossom midge larvae cause small unopened buds in Jasminum sambac.\n\n` +
      `### 2. Evidence from Retrieved Studies\n#### Direct Evidence\n` +
      `- **Paper Title**: Bioecology of Blossom Midge in Jasminum sambac\n` +
      `- **Key Finding**: Blossom midge was identified as the direct cause of unopened buds.`;

    const result = sanitizeSymptomResponse(directContent, query, directChunks);
    expect(result).toBe(directContent);
    expect(result).toContain('### 2. Evidence from Retrieved Studies');
  });
});

