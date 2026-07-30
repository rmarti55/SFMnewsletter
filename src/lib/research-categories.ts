export interface ResearchCategory {
  id: string;
  label: string;
  storylineMatch: RegExp;
}

/** Categories for uploaded city research. Pipeline includes docs when storylines match. */
export const RESEARCH_CATEGORIES: ResearchCategory[] = [
  {
    id: 'water',
    label: 'Water & permits',
    storylineMatch: /\b(water|permits?|permitting|irrigation|moratorium|water study|water supply)\b/i,
  },
  {
    id: 'housing-supply',
    label: 'Housing supply / LDC',
    storylineMatch: /\b(housing|ldc|land development code|zoning|density|units|infill|development code)\b/i,
  },
  {
    id: 'ahtf',
    label: 'AHTF',
    storylineMatch: /\b(ahtf|trust fund|affordable housing trust)\b/i,
  },
  {
    id: 'fee-in-lieu',
    label: 'Fee-in-lieu / SFHP',
    storylineMatch: /\b(fee-in-lieu|fee in lieu|sfhp|santa fe homes program)\b/i,
  },
  {
    id: 'hdrb',
    label: 'HDRB / design review',
    storylineMatch: /\b(hdrb|historic district|design review|historic preservation)\b/i,
  },
  {
    id: 'general-plan',
    label: 'General plan',
    storylineMatch: /\b(general plan|santa fe forward)\b/i,
  },
  {
    id: 'general',
    label: 'General (always eligible when any storyline exists)',
    storylineMatch: /.*/,
  },
];

export function getResearchCategory(id: string): ResearchCategory | undefined {
  return RESEARCH_CATEGORIES.find((c) => c.id === id);
}

export function isValidResearchCategory(id: string): boolean {
  return RESEARCH_CATEGORIES.some((c) => c.id === id);
}

export function getActiveResearchCategories(storylines: Array<{ headline: string; whatHappened: string; whyItMatters: string }>): string[] {
  if (storylines.length === 0) return [];
  const blob = storylines.map((s) => `${s.headline} ${s.whatHappened} ${s.whyItMatters}`).join(' ');
  const specific = RESEARCH_CATEGORIES.filter(
    (c) => c.id !== 'general' && c.storylineMatch.test(blob),
  ).map((c) => c.id);
  if (specific.length > 0) return specific;
  return ['general'];
}
