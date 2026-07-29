import { describe, it, expect } from 'vitest';
import {
  filterVerbatimQuotes,
  selectDocketItems,
  extractQuotedSpans,
  findFabricatedQuotes,
  stripFabricatedQuotes,
  findGuidanceLeaks,
  stripGuidanceLeakParagraphs,
  normalizeGuidanceFingerprint,
  extractGuidanceFingerprints,
} from '../src/lib/guards';

const transcript = `Chair Faulkner called the meeting to order.
Councilor Romero-Wirth said, "We were told five hundred thousand was the ceiling," pressing staff on the contract.
The motion passed five to two.`;

describe('filterVerbatimQuotes', () => {
  it('keeps verbatim quotes', () => {
    const out = filterVerbatimQuotes(
      [{ speaker: 'Romero-Wirth', quote: 'We were told five hundred thousand was the ceiling' }],
      transcript,
    );
    expect(out).toHaveLength(1);
  });

  it('drops hallucinated quotes', () => {
    const out = filterVerbatimQuotes(
      [{ speaker: 'Mayor', quote: 'This is the best budget in city history' }],
      transcript,
    );
    expect(out).toHaveLength(0);
  });
});

describe('selectDocketItems', () => {
  const mk = (eventName: string, digest: string | null = 'x') => ({
    eventId: 1,
    eventName,
    meetingDate: '2026-07-15',
    digest,
    agendaHighlights: [] as string[],
  });

  it('drops cancelled meetings', () => {
    const out = selectDocketItems([mk('Canceled - Planning Commission Meeting'), mk('Finance Committee')]);
    expect(out.map((o) => o.eventName)).toEqual(['Finance Committee']);
  });
});

describe('findFabricatedQuotes', () => {
  const src = `Councilor Feghali said, "the street is unsafe in the summer months" during the debate.`;
  it('flags fabricated quotes', () => {
    expect(
      findFabricatedQuotes('Mayor said, "The Plaza should be a living room for Santa Fe."', src),
    ).toEqual(['The Plaza should be a living room for Santa Fe.']);
  });
});

describe('guidance leaks', () => {
  const guidance = `FY24 balance went negative (–$97,250.71); a $3.07M BAR was needed.`;
  it('extracts fingerprints', () => {
    const fps = extractGuidanceFingerprints(guidance);
    expect(fps).toContain(normalizeGuidanceFingerprint('$97,250.71'));
  });
  it('flags leaks not in meeting source', () => {
    const body = `The fund hit -$97,250.71 in FY24.`;
    const allowed = `HDRB postponed a design review.`;
    expect(findGuidanceLeaks(body, extractGuidanceFingerprints(guidance), allowed).length).toBeGreaterThan(0);
  });
  it('strips leaked paragraphs', () => {
    const body = `**AHTF Crisis**\nThe fund hit -$97,250.71.\n\n**HDRB**\nStyle police.`;
    const out = stripGuidanceLeakParagraphs(body, [normalizeGuidanceFingerprint('$97,250.71')]);
    expect(out).not.toContain('97,250');
    expect(out).toContain('HDRB');
  });
});

describe('stripFabricatedQuotes', () => {
  it('removes sentence with bad quote', () => {
    const body = 'Real news. Mayor said, "Totally invented quote here today." More news.';
    const out = stripFabricatedQuotes(body, ['Totally invented quote here today.']);
    expect(out).not.toContain('invented');
    expect(out).toContain('Real news');
  });
});

describe('extractQuotedSpans', () => {
  it('extracts spans over threshold', () => {
    expect(extractQuotedSpans('He said "the street is unsafe here"')).toEqual(['the street is unsafe here']);
  });
});
