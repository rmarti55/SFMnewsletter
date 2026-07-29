import rosterData from '../../guidance/hdrb-roster.json';
import type { RecentExportItem, Storyline } from './types';

export const HDRB_CATEGORY_NAME = 'Historic Districts Review Board';

type HdrbEntry = {
  canonicalName: string;
  displayName?: string;
  role: string;
  aliases: string[];
  active: boolean;
};

const ROSTER = rosterData as HdrbEntry[];

export function isHdrbMeeting(categoryName: string | null | undefined): boolean {
  return categoryName === HDRB_CATEGORY_NAME;
}

function getDisplayName(entry: HdrbEntry): string {
  return entry.displayName?.trim() || entry.canonicalName;
}

function hdrbRoleLabel(role: string): string {
  switch (role) {
    case 'Chair':
      return 'HDRB Chair';
    case 'Vice-Chair':
      return 'HDRB Vice-Chair';
    case 'Architect':
      return 'HDRB architect';
    default:
      return 'HDRB board member';
  }
}

function resolveSpokenName(spoken: string): string {
  const norm = spoken.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const entry of ROSTER) {
    if (!entry.active) continue;
    const candidates = [entry.canonicalName, getDisplayName(entry), ...entry.aliases];
    for (const c of candidates) {
      if (c.toLowerCase() === norm) return getDisplayName(entry);
    }
    const last = spoken.split(/\s+/).pop()?.toLowerCase();
    if (last && entry.canonicalName.toLowerCase().includes(last)) return getDisplayName(entry);
  }
  return spoken.replace(/^Member\s+/i, '').trim();
}

export function resolveStorylineNames(
  storylines: Storyline[],
  recentByEventId: Map<number, RecentExportItem>,
): Storyline[] {
  return storylines.map((s) => {
    const recent = recentByEventId.get(s.eventId);
    if (!recent || !isHdrbMeeting(recent.categoryName)) return s;
    return {
      ...s,
      people: s.people.map((p) => ({ ...p, name: resolveSpokenName(p.name) })),
      quotes: s.quotes.map((q) => ({ ...q, speaker: resolveSpokenName(q.speaker) })),
    };
  });
}

export function buildHdrbNameGuideBlock(names: string[]): string {
  const resolved = new Set<string>();
  for (const raw of names) {
    const name = resolveSpokenName(raw);
    const entry = ROSTER.find(
      (e) => getDisplayName(e).toLowerCase() === name.toLowerCase() || e.canonicalName.toLowerCase() === name.toLowerCase(),
    );
    if (entry) resolved.add(`${hdrbRoleLabel(entry.role)} ${getDisplayName(entry)} → later "${getDisplayName(entry)}"`);
  }
  if (resolved.size === 0) return '';
  return `\n\nHDRB NEWSPAPER NAMES (first mention → later references):\n${[...resolved].map((l) => `- ${l}`).join('\n')}`;
}
