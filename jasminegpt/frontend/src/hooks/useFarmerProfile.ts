import { useMemo } from 'react';
import type { Message, Conversation, LanguagePreference, FarmerProfile } from '../types';

// ── Known cultivar names (canonical list for fast lookup) ────────────────────
const KNOWN_CULTIVARS = [
  'Gundumalli',
  'Arka Surabhi',
  'MDU-1', 'MDU 1',
  'PKM-1', 'PKM 1',
  'Co-1', 'Co 1',
  'Pitchi',
  'Ramabanam',
  'Mukthi',
  'Iruvatchi',
  'Parimullai',
  'Nithyamalli',
  'Single',
  'Double',
];

// ── Known Jasminum species ───────────────────────────────────────────────────
const KNOWN_SPECIES = [
  'Jasminum sambac',
  'Jasminum auriculatum',
  'Jasminum multiflorum',
  'Jasminum grandiflorum',
  'Jasminum officinale',
];

// ── Indian states (jasmine-growing regions first) ────────────────────────────
const KNOWN_STATES = [
  'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana',
  'Maharashtra', 'Kerala', 'Gujarat', 'Rajasthan',
  'Uttar Pradesh', 'Madhya Pradesh', 'Odisha', 'West Bengal',
  'Bihar', 'Jharkhand', 'Chhattisgarh', 'Assam',
];

// ── Common jasmine-growing districts ────────────────────────────────────────
const KNOWN_DISTRICTS = [
  // Karnataka
  'Hassan', 'Mysuru', 'Mysore', 'Bengaluru', 'Bangalore', 'Tumkur', 'Kolar',
  'Chikkamagaluru', 'Belagavi', 'Hubli', 'Dharwad', 'Mandya', 'Ramanagara',
  // Tamil Nadu
  'Madurai', 'Dindigul', 'Coimbatore', 'Salem', 'Tirunelveli', 'Theni',
  'Virudhunagar', 'Ramanathapuram',
  // Andhra Pradesh / Telangana
  'Guntur', 'Prakasam', 'Hyderabad', 'Kurnool',
];

// ── Language keywords → display label ───────────────────────────────────────
const LANGUAGE_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(Kannada|\u0c95\u0ca8\u0ccd\u0ca8\u0ca1)\b/i, 'ಕನ್ನಡ'],
  [/\bTelugu\b/i, 'Telugu'],
  [/\bTamil\b/i, 'Tamil'],
  [/\bEnglish\b/i, 'English'],
  [/\bHindi\b/i, 'Hindi'],
];

// ── Farming purpose keywords → canonical label ───────────────────────────────
const PURPOSE_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(garland[s]?(?:\s+making)?|garland\s+market)\b/i, 'Garland making'],
  [/\b(temple|religious\s+offering[s]?|puja)\b/i, 'Temple offerings'],
  [/\b(commercial|export|wholesale)\b/i, 'Commercial farming'],
  [/\b(essential\s+oil|perfume|fragrance|attar)\b/i, 'Essential oil / perfume'],
  [/\b(home\s+garden|backyard|small\s+farm)\b/i, 'Home garden'],
];

// ── Core extraction logic ────────────────────────────────────────────────────
function extractProfile(userTexts: string[]): FarmerProfile {
  const corpus = userTexts.join('\n');
  const profile: FarmerProfile = {};

  // --- Species ---
  for (const sp of KNOWN_SPECIES) {
    if (new RegExp(`\\b${sp.replace('.', '\\.')}\\b`, 'i').test(corpus)) {
      profile.species = sp;
      break;
    }
  }
  // Fallback: "J. sambac"
  if (!profile.species && /\bJ\.\s*sambac\b/i.test(corpus)) {
    profile.species = 'Jasminum sambac';
  }

  // --- Cultivar ---
  // Pattern 1: explicit "cv. X" or "cultivar X" — greedy word capture before separator
  const cvMatch = corpus.match(
    /\b(?:cv\.|cultivar|variety)\s+([A-Z][A-Za-z0-9](?:[A-Za-z0-9 -]{0,25}?)?)(?=[,.;\s]|$)/
  );
  if (cvMatch) {
    profile.cultivar = cvMatch[1].trim();
  }

  // Pattern 2: "I grow/plant/have Gundumalli"
  if (!profile.cultivar) {
    const growMatch = corpus.match(
      /\b(?:grow(?:ing)?|plant(?:ing)?|have|farm(?:ing)?)\s+([A-Z][a-z]{3,}(?:\s[A-Z][a-z]{3,})?)\b/
    );
    if (growMatch) {
      const candidate = growMatch[1].trim();
      const isKnown = KNOWN_CULTIVARS.some(
        (k) => k.toLowerCase() === candidate.toLowerCase()
      );
      if (isKnown) profile.cultivar = candidate;
    }
  }

  // Pattern 3: direct known cultivar mention anywhere
  if (!profile.cultivar) {
    for (const cv of KNOWN_CULTIVARS) {
      if (new RegExp(`\\b${cv.replace(/[-]/g, '[-\\s]?')}\\b`, 'i').test(corpus)) {
        profile.cultivar = cv;
        break;
      }
    }
  }

  // --- State ---
  for (const st of KNOWN_STATES) {
    if (new RegExp(`\\b${st}\\b`, 'i').test(corpus)) {
      profile.state = st;
      break;
    }
  }

  // --- District ---
  // Explicit: "in/from/at X district/taluk"
  const districtExplicit = corpus.match(
    /\b(?:in|from|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:district|taluk|village|area)\b/i
  );
  if (districtExplicit) {
    profile.district = districtExplicit[1];
  }
  // Fallback: known district keyword
  if (!profile.district) {
    for (const d of KNOWN_DISTRICTS) {
      if (new RegExp(`\\b${d}\\b`, 'i').test(corpus)) {
        profile.district = d;
        break;
      }
    }
  }

  // --- Language ---
  for (const [pattern, label] of LANGUAGE_KEYWORDS) {
    if (pattern.test(corpus)) {
      profile.language = label;
      break;
    }
  }

  // --- Farming purpose ---
  for (const [pattern, label] of PURPOSE_KEYWORDS) {
    if (pattern.test(corpus)) {
      profile.farmingPurpose = label;
      break;
    }
  }

  return profile;
}

// ── Public hook ───────────────────────────────────────────────────────────────
/**
 * Derives a session-scoped FarmerProfile from the current message list.
 * - Merges backend conversation.memory (species/cultivar) when available.
 * - Derives language from languagePreference when not mentioned in text.
 * - Completely ephemeral: resets automatically when messages become empty
 *   (i.e. on New Chat or when a different conversation is loaded).
 */
export function useFarmerProfile(
  messages: Message[],
  conversationMemory?: Conversation['memory'],
  languagePreference?: LanguagePreference
): FarmerProfile {
  return useMemo(() => {
    const userTexts = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content);

    const extracted = userTexts.length > 0 ? extractProfile(userTexts) : {};

    // Backend memory is authoritative for species / cultivar (it uses LLM extraction)
    if (conversationMemory?.species) extracted.species = conversationMemory.species;
    if (conversationMemory?.cultivar) extracted.cultivar = conversationMemory.cultivar;

    // Derive language from language preference when text doesn't mention it
    if (!extracted.language && languagePreference && languagePreference !== 'auto') {
      extracted.language = languagePreference === 'kn' ? 'ಕನ್ನಡ' : 'English';
    }

    return extracted;
  }, [messages, conversationMemory, languagePreference]);
}
