import {
  detectLanguage,
  maskProtectedEntities,
  unmaskProtectedEntities,
  normalizeQueryToEnglish,
  translateResponseToTarget,
  isAlreadyKannada,
  hasConsecutiveRepetition,
  deduplicateRepetitions,
} from '../services/language/languageService';

describe('Multilingual Engine (English ↔ Kannada)', () => {
  describe('1. Language Detection', () => {
    test('detects English queries correctly', () => {
      const res = detectLanguage('What fertilizer practices improve flowering in Jasminum sambac?');
      expect(res.detected).toBe('en');
      expect(res.target).toBe('en');
    });

    test('detects native Kannada script correctly', () => {
      const res = detectLanguage('ಮಲ್ಲಿಗೆಗೆ ಯಾವ ಗೊಬ್ಬರ ಉತ್ತಮ?');
      expect(res.detected).toBe('kn');
      expect(res.target).toBe('kn');
    });

    test('detects transliterated/mixed Kannada queries correctly', () => {
      const res = detectLanguage('Gundumalli ge pruning yavaga madbeku?');
      expect(res.detected).toBe('kn');
      expect(res.target).toBe('kn');
    });

    test('respects explicit language preference override', () => {
      const res1 = detectLanguage('What is the spacing?', 'kn');
      expect(res1.target).toBe('kn');

      const res2 = detectLanguage('ಮಲ್ಲಿಗೆಗೆ ನೀರು ಯಾವಾಗ ಕೊಡಬೇಕು?', 'en');
      expect(res2.target).toBe('en');
    });
  });

  describe('2. Protected Entity Placeholder Masking & Unmasking', () => {
    test('masks scientific entities, paper titles, DOIs, citations, and fertilizer ratios without loss', () => {
      const originalText =
        `### 1. Direct Answer\n` +
        `Jasminum sambac cv. Ramanathapuram Gundumalli responded best to 60:120:120 g NPK combined with 3% Panchagavya and 0.4% Humic acid.\n\n` +
        `### 2. Evidence from Retrieved Studies\n` +
        `- **Paper Title**: Bioecology and management of Jasmine blossom midge\n` +
        `- **Key Finding**: (Jawaharlal et al., 2012) reported that storage at 4°C with 100% IW/CPE maintained quality. doi:10.20546/ijcmas.2019.805.234`;

      const { maskedText, replacements } = maskProtectedEntities(originalText);

      // Masked text should replace protected terms with placeholders
      expect(maskedText).not.toContain('Bioecology and management of Jasmine blossom midge');
      expect(maskedText).not.toContain('Ramanathapuram Gundumalli');
      expect(maskedText).not.toContain('10.20546/ijcmas.2019.805.234');
      expect(maskedText).not.toContain('60:120:120 g');
      expect(maskedText).not.toContain('3%');
      expect(maskedText).not.toContain('0.4%');
      expect(maskedText).toContain('{{TITLE_MASK_');
      expect(maskedText).toContain('{{ENTITY_MASK_');
      expect(maskedText).toContain('{{DOI_MASK_');
      expect(maskedText).toContain('{{RATIO_MASK_');
      expect(maskedText).toContain('{{UNIT_MASK_');

      // Unmasking should perfectly restore the original text
      const restored = unmaskProtectedEntities(maskedText, replacements);
      expect(restored).toBe(originalText);
    });
  });

  describe('3. Query Normalization', () => {
    test('normalizes Kannada query into English preserving agricultural entities', async () => {
      const normalized = await normalizeQueryToEnglish('ಮಲ್ಲಿಗೆಗೆ ಯಾವ ಗೊಬ್ಬರ ಉತ್ತಮ?', 'kn');
      expect(normalized.toLowerCase()).toMatch(/jasmine|jasminum/);
      expect(normalized.toLowerCase()).toContain('fertilizer');
    }, 15_000);

    test('normalizes transliterated Kannada preserving Gundumalli', async () => {
      const normalized = await normalizeQueryToEnglish('Gundumalli ge pruning yavaga madbeku?', 'kn');
      expect(normalized).toContain('Gundumalli');
      expect(normalized.toLowerCase()).toContain('pruning');
    }, 15_000);
  });

  describe('4. Repetition Guard & Already-Kannada Detection', () => {
    test('detects already-translated Kannada content to prevent redundant translation passes', () => {
      const kannadaText = '### 1. ನೇರ ಉತ್ತರ (Direct Answer)\nಪತ್ತೆಹಚ್ಚಿದ ಅಧ್ಯಯನಗಳಲ್ಲಿ, 60:120:120 g NPK ಪರೀಕ್ಷಿಸಲಾಗಿದೆ.';
      expect(isAlreadyKannada(kannadaText)).toBe(true);

      const englishText = '### 1. Direct Answer\nIn evaluated trials, 60:120:120 g NPK was tested.';
      expect(isAlreadyKannada(englishText)).toBe(false);
    });

    test('detects consecutive repetition loops of single words (>3 consecutive times)', () => {
      const loopedText = 'ಪತ್ತೆಹಚ್ಚಿದ ಅಧ್ಯಯನಗಳಲ್ಲಿ ಖಾತರಿಯಲ್ಲಿರುವ ಖಾತರಿಯಲ್ಲಿರುವ ಖಾತರಿಯಲ್ಲಿರುವ ಖಾತರಿಯಲ್ಲಿರುವ 60:120:120 g NPK';
      expect(hasConsecutiveRepetition(loopedText, 3)).toBe(true);
    });

    test('detects consecutive repetition loops of multi-word phrases (>3 consecutive times)', () => {
      const loopedPhrase = 'ಅಧ್ಯಯನಗಳಲ್ಲಿ ಪರೀಕ್ಷಿಸಲಾಗಿದೆ ಅಧ್ಯಯನಗಳಲ್ಲಿ ಪರೀಕ್ಷಿಸಲಾಗಿದೆ ಅಧ್ಯಯನಗಳಲ್ಲಿ ಪರೀಕ್ಷಿಸಲಾಗಿದೆ ಅಧ್ಯಯನಗಳಲ್ಲಿ ಪರೀಕ್ಷಿಸಲಾಗಿದೆ';
      expect(hasConsecutiveRepetition(loopedPhrase, 3)).toBe(true);
    });

    test('does NOT flag natural text or 1-2 consecutive words', () => {
      const naturalText = 'ಪತ್ತೆಹಚ್ಚಿದ ಅಧ್ಯಯನಗಳಲ್ಲಿ, 60:120:120 g NPK ಜೊತೆಗೆ 3% Panchagavya ಮತ್ತು 0.4% Humic acid ಅನ್ನು ಪರೀಕ್ಷಿಸಲಾಗಿದೆ.';
      expect(hasConsecutiveRepetition(naturalText, 3)).toBe(false);

      const doubledWord = 'ರೈತರು ಬೇಗ ಬೇಗ ಗೊಬ್ಬರ ಹಾಕಬೇಕು.';
      expect(hasConsecutiveRepetition(doubledWord, 3)).toBe(false);
    });

    test('deduplicates excessive consecutive repeated words', () => {
      const looped = 'ಖಾತರಿಯಲ್ಲಿರುವ ಖಾತರಿಯಲ್ಲಿರುವ ಖಾತರಿಯಲ್ಲಿರುವ ಖಾತರಿಯಲ್ಲಿರುವ 60:120:120 g NPK';
      const clean = deduplicateRepetitions(looped);
      expect(clean).toBe('ಖಾತರಿಯಲ್ಲಿರುವ 60:120:120 g NPK');
      expect(hasConsecutiveRepetition(clean, 3)).toBe(false);
    });
  });

  describe('5. Response Translation to Kannada', () => {
    test('preserves markdown headings, tables, and titles when translating', async () => {
      const sampleResponse =
        `### 1. Direct Answer\n` +
        `Research on Jasminum sambac cv. Gundumalli shows optimal flowering with Panchagavya.\n\n` +
        `### 2. Evidence from Retrieved Studies\n` +
        `- **Paper Title**: Yield and quality parameters of Jasminum sambac\n` +
        `- **Key Finding**: Pruning at 45 cm combined with 150:100:100 g NPK/plant/year yielded maximum flowers.\n` +
        `- **Experimental Conditions**: Field trial at 4°C.\n\n` +
        `| Treatment | Yield |\n` +
        `|---|---|\n` +
        `| T1 (NPK) | 5.2 t/ha |\n\n` +
        `### 3. Research Scope\n` +
        `These findings apply specifically to the tested experimental conditions.`;

      const translated = await translateResponseToTarget(sampleResponse, 'kn');

      // Check headings are in Kannada with English markers or translated cleanly
      expect(translated).toContain('### 1.');
      expect(translated).toContain('### 2.');
      expect(translated).toContain('### 3.');

      // Check table markdown structure is preserved
      expect(translated).toMatch(/\|.+?\|.+?\|/);
      expect(translated).toContain('|---|---|');
      expect(translated).toContain('| T1 (NPK) | 5.2 t/ha |');

      // Check scientific entities and paper title are preserved
      expect(translated).toContain('Yield and quality parameters of Jasminum sambac');
      expect(translated).toContain('Jasminum sambac');
      expect(translated).toContain('Gundumalli');
      expect(translated).toContain('Panchagavya');
      expect(translated).toContain('NPK');

      // Check no repetition loop exists
      expect(hasConsecutiveRepetition(translated, 3)).toBe(false);
    }, 25_000);

    test('never translates already-translated Kannada content', async () => {
      const alreadyKannada = '### 1. ನೇರ ಉತ್ತರ\nಇದು ಈಗಾಗಲೇ ಕನ್ನಡದಲ್ಲಿದೆ.';
      const res = await translateResponseToTarget(alreadyKannada, 'kn');
      expect(res).toBe(alreadyKannada);
    });

    test('returns English text unchanged when target is English', async () => {
      const sample = '### 1. Direct Answer\nDirect English content.';
      const res = await translateResponseToTarget(sample, 'en');
      expect(res).toBe(sample);
    });
  });
});

