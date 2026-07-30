import { describe, it, expect } from 'vitest';
import {
  shouldKeepSpeaker,
  filterTranscriptSpeakers,
  isOfficialSpeaker,
  isOpenFloorPublicComment,
} from '../src/lib/speaker-filter';
import { HDRB_CATEGORY_NAME } from '../src/lib/hdrb';

describe('isOfficialSpeaker', () => {
  it('keeps councilors and chairs', () => {
    expect(isOfficialSpeaker('Councilor Castro')).toBe(true);
    expect(isOfficialSpeaker('Chair Faulkner')).toBe(true);
    expect(isOfficialSpeaker('Faviola Chavez')).toBe(false);
  });
});

describe('shouldKeepSpeaker', () => {
  it('drops Jim Heath open-floor rant at QOL', () => {
    expect(
      shouldKeepSpeaker(
        'Jim Heath',
        "I'm a long-time member of the Santa Fe community. I will continue to protest any new permits for residences.",
        'Quality of Life Committee',
      ),
    ).toBe(false);
  });

  it('keeps Matt Goebel as invited LDC presenter at QOL', () => {
    expect(
      shouldKeepSpeaker(
        'Matt Goebel',
        'The purpose of the workshop is to summarize the land development code update for the committee.',
        'Quality of Life Committee',
      ),
    ).toBe(true);
  });

  it('drops Chandler Moore plaza public comment at Finance', () => {
    expect(
      shouldKeepSpeaker(
        'Chandler Moore',
        "Hello, I'm Chandler Moore. I'm a resident in Santa Fe. Thanks for allowing public comments about the Plaza.",
        'Finance Committee',
      ),
    ).toBe(false);
  });

  it('keeps Faviola Chavez via presenter speech at Finance', () => {
    expect(
      shouldKeepSpeaker(
        'Faviola Chavez',
        'Chair Faulkner, members of the Finance Committee. We tackle these on a daily basis in the affordable housing department.',
        'Finance Committee',
      ),
    ).toBe(true);
  });

  it('keeps Sherry Boucher consultant presentation', () => {
    expect(
      shouldKeepSpeaker(
        'Sherry Boucher',
        'Madam Chair and members of the committee. I have 21 years of affordable housing experience. Thank you, Director Chavez.',
        'Finance Committee',
      ),
    ).toBe(true);
  });

  it('keeps all speakers at HDRB', () => {
    expect(
      shouldKeepSpeaker(
        'Stephanie Benonato',
        'I think the canopy is too big on this case.',
        HDRB_CATEGORY_NAME,
      ),
    ).toBe(true);
  });
});

describe('filterTranscriptSpeakers', () => {
  it('removes open-floor speakers from policy committee', () => {
    const out = filterTranscriptSpeakers(
      [
        { speaker: 'Jim Heath', text: 'I am a resident protesting housing permits.' },
        { speaker: 'Matt Goebel', text: 'The purpose of the workshop is the land development code update.' },
        { speaker: 'Councilor Castro', text: 'Thank you for the presentation.' },
      ],
      'Quality of Life Committee',
    );
    expect(out.map((s) => s.speaker)).toEqual(['Matt Goebel', 'Councilor Castro']);
  });
});

describe('isOpenFloorPublicComment', () => {
  it('detects Public Commenter label', () => {
    expect(isOpenFloorPublicComment('Public Commenter (Laura Long)', 'Trail rules are hard to enforce.')).toBe(true);
  });
});
