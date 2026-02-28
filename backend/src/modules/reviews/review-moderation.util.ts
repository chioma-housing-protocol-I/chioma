// Basic prohibited language filter for reviews
const PROHIBITED_WORDS = [
  'spam',
  'scam',
  'fraud',
  'offensive',
  // Add more as needed
];

export function containsProhibitedLanguage(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PROHIBITED_WORDS.some((word) => lower.includes(word));
}
