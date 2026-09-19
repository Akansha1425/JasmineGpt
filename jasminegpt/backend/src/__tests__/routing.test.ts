/**
 * JasmineGPT — Routing Regression Tests A–I
 * ==========================================
 * These tests run entirely in Node.js — no MongoDB, no RAG sidecar, no LLM.
 * They validate the deterministic routing and context resolution logic.
 */

import { routeQuestion, isProfileStatement } from '../services/router/questionRouter';
import { looksContextDependent, resolveFollowup, extractEntities } from '../services/router/contextResolver';

// ────────────────────────────────────────────────────────────────────────────
// Profile statement detection
// ────────────────────────────────────────────────────────────────────────────
describe('Profile Statement Detection', () => {
  test('I grow Gundumalli jasmine → profile statement', () => {
    expect(isProfileStatement('I grow Gundumalli jasmine.')).toBe(true);
  });
  test('I am growing Gundumalli → profile statement', () => {
    expect(isProfileStatement('I am growing Gundumalli.')).toBe(true);
  });
  test('My crop is Gundumalli → profile statement', () => {
    expect(isProfileStatement('My crop is Gundumalli.')).toBe(true);
  });
  test('I cultivate Jasminum sambac → profile statement', () => {
    expect(isProfileStatement('I cultivate Jasminum sambac.')).toBe(true);
  });
  test('I have a jasmine bud worm problem → NOT a profile statement', () => {
    expect(isProfileStatement('I have a jasmine bud worm problem.')).toBe(false);
  });
  test('I grow Gundumalli. What fertilizer should I use? → NOT a pure profile statement (has question)', () => {
    expect(isProfileStatement('I grow Gundumalli. What fertilizer should I use?')).toBe(false);
  });
  test('I cultivate Jasminum sambac. When should I prune? → NOT a pure profile statement (has question)', () => {
    expect(isProfileStatement('I cultivate Jasminum sambac. When should I prune?')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Regression Tests A–I
// ────────────────────────────────────────────────────────────────────────────
describe('Regression Tests A–I', () => {
  // Test A
  test('A: I grow Gundumalli jasmine → MEMORY_UPDATE', () => {
    expect(routeQuestion('I grow Gundumalli jasmine.')).toBe('MEMORY_UPDATE');
  });

  // Test B — standalone, postharvest
  test('B: What packaging was tested → POSTHARVEST', () => {
    expect(routeQuestion('What packaging was tested?')).toBe('POSTHARVEST');
  });

  // Test C — context-dependent follow-up
  test('C: Was the packaging heat sealed → POSTHARVEST (with memory)', () => {
    const route = routeQuestion('Was the packaging heat sealed?', {
      last_route: 'POSTHARVEST',
      cultivar: 'Gundumalli',
    });
    expect(route).toBe('POSTHARVEST');
  });

  // Test D — context-dependent
  test('D: What temperature was used → POSTHARVEST (with memory)', () => {
    const route = routeQuestion('What temperature was used?', {
      last_route: 'POSTHARVEST',
      cultivar: 'Gundumalli',
    });
    expect(route).toBe('POSTHARVEST');
  });

  // Test E — context-dependent
  test('E: How long did it last → POSTHARVEST (with memory)', () => {
    const route = routeQuestion('How long did it last?', {
      last_route: 'POSTHARVEST',
    });
    expect(route).toBe('POSTHARVEST');
  });

  // Test F
  test('F: I have a jasmine bud worm problem → GENERAL_RAG', () => {
    expect(routeQuestion('I have a jasmine bud worm problem.')).toBe('GENERAL_RAG');
  });

  // Test G
  test('G: What pesticide studies are available → GENERAL_RAG', () => {
    expect(routeQuestion('What pesticide studies are available?')).toBe('GENERAL_RAG');
  });

  // Test H — routes to POSTHARVEST at top-level (evidence gating happens inside Python)
  test('H: What is passive MAP for Jasminum sambac storage → POSTHARVEST', () => {
    expect(routeQuestion('What is passive MAP for Jasminum sambac storage?')).toBe('POSTHARVEST');
  });

  // Test I — harvesting → POSTHARVEST (evidence gating at Python level)
  test('I: What is the best harvesting time for jasmine → POSTHARVEST', () => {
    expect(routeQuestion('What is the best harvesting time for jasmine?')).toBe('POSTHARVEST');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Context dependency detection
// ────────────────────────────────────────────────────────────────────────────
describe('Context Dependency Detection', () => {
  test('Was the packaging heat sealed → context dependent', () => {
    expect(looksContextDependent('Was the packaging heat sealed?')).toBe(true);
  });
  test('What temperature was used → context dependent', () => {
    expect(looksContextDependent('What temperature was used?')).toBe(true);
  });
  test('How long did it last → context dependent', () => {
    expect(looksContextDependent('How long did it last?')).toBe(true);
  });
  test('What about the treatment → context dependent', () => {
    expect(looksContextDependent('What about the treatment?')).toBe(true);
  });
  test('What pesticide should I use for bud worm → NOT context dependent', () => {
    expect(looksContextDependent('What pesticide should I use for bud worm?')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Follow-up resolution
// ────────────────────────────────────────────────────────────────────────────
describe('Follow-up Resolution', () => {
  const memory = { species: 'Jasminum sambac', cultivar: 'Gundumalli', last_route: 'POSTHARVEST' as const };

  test('New conversation — no rewrite', () => {
    const result = resolveFollowup('What packaging was tested?', [], {});
    expect(result.method).toBe('none');
    expect(result.standaloneQuery).toBe('What packaging was tested?');
  });

  test('Heat-sealed follow-up with memory — injects cultivar', () => {
    const turns = [
      { role: 'user' as const, content: 'What packaging was tested?' },
      { role: 'assistant' as const, content: 'The best packaging was 60µm polythene bag...' },
    ];
    const result = resolveFollowup('Was the packaging heat sealed?', turns, memory);
    expect(result.standaloneQuery).toContain('Gundumalli');
    expect(result.method).toBe('memory_injection');
  });

  test('Standalone question with full species info — no rewrite needed', () => {
    const turns = [{ role: 'user' as const, content: 'I grow Gundumalli' }];
    const result = resolveFollowup(
      'What packaging was tested for Gundumalli jasmine?',
      turns,
      memory,
    );
    expect(result.method).toBe('none');
    expect(result.standaloneQuery).toBe('What packaging was tested for Gundumalli jasmine?');
  });

  test('New independent packaging query after irrigation query — NO contamination', () => {
    const turns = [
      { role: 'user' as const, content: 'What drip irrigation practices are used for Jasminum grandiflorum?' },
      { role: 'assistant' as const, content: 'The available research does not provide sufficient evidence.' },
    ];
    const irrigationMemory = { species: 'Jasminum grandiflorum', last_route: 'GENERAL_RAG' as const };
    const result = resolveFollowup(
      'What packaging materials and storage conditions were found to extend the shelf life of Jasminum sambac flowers?',
      turns,
      irrigationMemory,
    );
    expect(result.method).toBe('none');
    expect(result.standaloneQuery).toBe(
      'What packaging materials and storage conditions were found to extend the shelf life of Jasminum sambac flowers?'
    );
    expect(result.standaloneQuery).not.toContain('grandiflorum');
    expect(result.standaloneQuery).not.toContain('irrigation');
  });

  test('Follow-up query "What packaging was tested?" uses memory correctly', () => {
    const turns = [
      { role: 'user' as const, content: 'I grow Gundumalli jasmine.' },
      { role: 'assistant' as const, content: "I've noted that you grow Gundumalli (Jasminum sambac)." },
    ];
    const gundumalliMemory = { species: 'Jasminum sambac', cultivar: 'Gundumalli', last_route: 'MEMORY_UPDATE' as const };
    const result = resolveFollowup('What packaging was tested?', turns, gundumalliMemory);
    expect(result.method).toBe('memory_injection');
    expect(result.standaloneQuery).toBe('What packaging was tested? (cv. Gundumalli, Jasminum sambac)');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Entity extraction
// ────────────────────────────────────────────────────────────────────────────
describe('Entity Extraction', () => {
  test('Gundumalli → sambac species + Gundumalli cultivar', () => {
    const e = extractEntities('I grow Gundumalli jasmine.');
    expect(e.species).toBe('Jasminum sambac');
    expect(e.cultivar).toBe('Gundumalli');
  });
  test('Pacha Mullai → auriculatum species', () => {
    const e = extractEntities('My crop is Pacha Mullai.');
    expect(e.species).toBe('Jasminum auriculatum');
  });
  test('Packaging question → packaging domain', () => {
    const e = extractEntities('What packaging was tested?');
    expect(e.domains).toContain('packaging');
  });
  test('Bud worm question → pest domain', () => {
    const e = extractEntities('I have a jasmine bud worm problem.');
    expect(e.domains).toContain('pest');
  });
  test('Storage question → storage domain', () => {
    const e = extractEntities('What is the shelf life of jasmine flowers?');
    expect(e.domains).toContain('storage');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Additional domain routing
// ────────────────────────────────────────────────────────────────────────────
describe('Domain Routing', () => {
  test('Fertilizer question → GENERAL_RAG', () => {
    expect(routeQuestion('What fertilizer should I use for jasmine?')).toBe('GENERAL_RAG');
  });
  test('Irrigation question → GENERAL_RAG', () => {
    expect(routeQuestion('What drip irrigation schedule should I use?')).toBe('GENERAL_RAG');
  });
  test('Pruning question → GENERAL_RAG', () => {
    expect(routeQuestion('When should I prune Gundumalli for off-season flowering?')).toBe('GENERAL_RAG');
  });
  test('Storage question → POSTHARVEST', () => {
    expect(routeQuestion('How should I store jasmine flowers after harvest?')).toBe('POSTHARVEST');
  });
  test('Export packaging → POSTHARVEST', () => {
    expect(routeQuestion('What packaging is used for jasmine export?')).toBe('POSTHARVEST');
  });
  test('My crop is Gundumalli → MEMORY_UPDATE', () => {
    expect(routeQuestion('My crop is Gundumalli.')).toBe('MEMORY_UPDATE');
  });
  test('We grow Jasminum sambac → MEMORY_UPDATE', () => {
    expect(routeQuestion('We grow Jasminum sambac on our farm.')).toBe('MEMORY_UPDATE');
  });
});
