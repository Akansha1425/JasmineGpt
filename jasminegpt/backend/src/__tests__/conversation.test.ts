/**
 * Conversation service unit tests
 * Uses jest.mock to avoid real MongoDB connections
 */
import { generateTitle } from '../services/conversation/conversationService';
import { extractEntities } from '../services/router/contextResolver';

// ── generateTitle ──────────────────────────────────────────────────────────
describe('generateTitle', () => {
  test('generates title from first message', () => {
    const title = generateTitle('What packaging was tested for Gundumalli?');
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  test('returns New Chat for very short messages', () => {
    expect(generateTitle('Hi')).toBe('New Chat');
  });

  test('strips special characters', () => {
    const title = generateTitle('What is the best packaging??');
    expect(title).not.toContain('?');
  });

  test('truncates to 6 words', () => {
    const title = generateTitle('Tell me about the best post harvest packaging for export of jasmine');
    const words = title.split(' ');
    expect(words.length).toBeLessThanOrEqual(6);
  });
});

// ── extractEntities ────────────────────────────────────────────────────────
describe('extractEntities from conversation service', () => {
  test('profile statement has species + cultivar', () => {
    const e = extractEntities('I grow Gundumalli jasmine.');
    expect(e.species).toBe('Jasminum sambac');
    expect(e.cultivar).toBe('Gundumalli');
  });

  test('packaging question has packaging domain', () => {
    const e = extractEntities('What packaging was tested?');
    expect(e.domains).toContain('packaging');
    expect(e.species).toBeNull();
  });

  test('storage question has storage domain', () => {
    const e = extractEntities('How long can I store jasmine flowers?');
    expect(e.domains).toContain('storage');
  });

  test('pest question has pest domain', () => {
    const e = extractEntities('I have a jasmine bud worm problem.');
    expect(e.domains).toContain('pest');
  });

  test('memory update does not extract post-harvest domain from profile statements', () => {
    const e = extractEntities('I grow Gundumalli jasmine.');
    // Species/cultivar is extracted but domain is NOT packaging/storage
    // because profile statements don't mention those
    expect(e.domains).not.toContain('packaging');
    expect(e.domains).not.toContain('storage');
  });
});
