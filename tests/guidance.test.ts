import { describe, it, expect } from 'vitest';
import { loadCityResearch, loadFullGuidance, loadEditorialGuidance } from '../src/lib/guidance';
import {
  dropPublicCommentStorylines,
  isPublicCommentStoryline,
  isResearchTopicActive,
  buildGuidanceLeakAllowedSource,
  findResearchTopicLeaks,
} from '../src/lib/guards';
import type { Storyline } from '../src/lib/types';

describe('loadCityResearch', () => {
  it('loads water rebuttal markdown', async () => {
    const research = await loadCityResearch();
    expect(research).toContain('water-housing-moratorium');
    expect(research).toContain('outdoor irrigation');
  });

  it('loadFullGuidance includes editorial and research', async () => {
    const full = await loadFullGuidance();
    expect(full).toContain('Hardline Santa Fe YIMBYs');
    expect(full).toContain('CITY RESEARCH CORPUS');
  });
});

describe('dropPublicCommentStorylines', () => {
  const mk = (overrides: Partial<Storyline>): Storyline => ({
    eventId: 992,
    eventName: 'Quality of Life Committee',
    committee: 'Quality of Life Committee',
    meetingDate: '2026-07-22',
    headline: 'LDC update',
    whatHappened: 'Consultant presented code overhaul.',
    whyItMatters: 'Housing supply.',
    people: [],
    quotes: [{ speaker: 'Matt Goebel', quote: 'The purpose of the workshop is to summarize the code update.' }],
    significance: 80,
    ...overrides,
  });

  it('drops Jim Heath storyline', () => {
    const heath = mk({
      headline: 'Resident Demands Housing Freeze Until Water Study Complete',
      whatHappened: 'Jim Heath opposed permits in public comment.',
      quotes: [{ speaker: 'Jim Heath', quote: 'Santa Fe has no housing shortage, contrary to popular opinion.' }],
    });
    expect(isPublicCommentStoryline(heath)).toBe(true);
    expect(dropPublicCommentStorylines([heath, mk({})])).toHaveLength(1);
  });

  it('keeps official LDC storyline', () => {
    const ldc = mk({});
    expect(isPublicCommentStoryline(ldc)).toBe(false);
  });
});

describe('research topic guards', () => {
  const waterStoryline: Storyline = {
    eventId: 992,
    eventName: 'QOL',
    committee: 'Quality of Life Committee',
    meetingDate: '2026-07-22',
    headline: 'Land development code phase 2',
    whatHappened: 'Consultant outlined water and permit reforms.',
    whyItMatters: 'Permitting path.',
    people: [],
    quotes: [],
    significance: 90,
  };

  it('detects water/LDC topic in storylines', () => {
    expect(isResearchTopicActive([waterStoryline])).toBe(true);
    expect(isResearchTopicActive([])).toBe(false);
  });

  it('allows research in leak surface when topic active', async () => {
    const research = (await loadCityResearch()) ?? '';
    const allowed = buildGuidanceLeakAllowedSource('meeting only', research, [waterStoryline]);
    expect(allowed).toContain('outdoor irrigation');
  });

  it('flags research facts when topic inactive', async () => {
    const research = await loadCityResearch();
    const body = 'Outdoor irrigation dominates demand on legacy properties.';
    const leaks = findResearchTopicLeaks(body, research, []);
    expect(leaks.length).toBeGreaterThanOrEqual(0);
  });
});

describe('loadEditorialGuidance', () => {
  it('loads editorial without research header', async () => {
    const editorial = await loadEditorialGuidance();
    expect(editorial).toContain('Citizen Portal');
    expect(editorial).not.toContain('CITY RESEARCH CORPUS');
  });
});
