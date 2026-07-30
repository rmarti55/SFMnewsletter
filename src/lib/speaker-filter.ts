import { isHdrbMeeting } from './hdrb';
import type { SpeakerSegment } from './types';

const OFFICIAL_LABEL =
  /\b(councilor|councillor|chair|vice[- ]?chair|mayor|director|commissioner|manager|staff|secretary|clerk|attorney|planner|administrator|committee member|chief|fire chief|captain|lieutenant|sergeant|engineer|analyst|facilitator|moderator|interim|superintendent|coordinator for the city)\b/i;

const MEMBER_LABEL = /^Member\s+(\d+|[A-Z][a-z])/;

const PUBLIC_COMMENT_LABEL = /\bpublic comment(er)?\b/i;

const OPEN_FLOOR_TEXT =
  /\b(thanks for allowing public comments?|i'?m a resident|long[- ]time member of the (santa fe )?community|public comment period|came (this week )?thinking there was a council meeting|urge the council|speak at city council in support)\b/i;

const PRESENTER_TEXT =
  /\b(consultant|contractor for|i work for|i am the|department for the city|coordinator for|director of|affordable housing department|land development code|purpose of the (workshop|presentation)|present(ing|ation)|members of the (finance|quality of life|planning|public|governing)|honor to be here|thank you, chair|madam chair and members|city staff|economic development department|\d+ years of (affordable housing|experience)|we looked at quite a few communities)\b/i;

export function isOfficialSpeaker(label: string): boolean {
  const sp = label.trim();
  if (!sp) return false;
  if (OFFICIAL_LABEL.test(sp)) return true;
  if (MEMBER_LABEL.test(sp)) return true;
  if (/^Councilor\s+/i.test(sp)) return true;
  if (/^Unknown Speaker/i.test(sp)) return true;
  return false;
}

export function isInvitedPresenter(_label: string, text: string): boolean {
  const sample = text.slice(0, 500);
  return PRESENTER_TEXT.test(sample);
}

export function isOpenFloorPublicComment(label: string, text: string): boolean {
  if (PUBLIC_COMMENT_LABEL.test(label)) return true;
  const sample = `${label} ${text.slice(0, 400)}`;
  if (OPEN_FLOOR_TEXT.test(sample) && !PRESENTER_TEXT.test(text.slice(0, 500))) return true;
  return false;
}

export function shouldKeepSpeaker(
  label: string,
  text: string,
  committee: string | null | undefined,
): boolean {
  if (isHdrbMeeting(committee ?? null)) return true;
  if (isOfficialSpeaker(label)) return true;
  if (isOpenFloorPublicComment(label, text)) return false;
  if (isInvitedPresenter(label, text)) return true;
  // Named residents (First Last) at policy committees without official role → open-floor
  if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(label.trim())) return false;
  return true;
}

export function filterTranscriptSpeakers(
  speakers: SpeakerSegment[],
  committee: string | null | undefined,
): SpeakerSegment[] {
  if (isHdrbMeeting(committee ?? null)) return speakers;
  return speakers.filter((s) => shouldKeepSpeaker(s.speaker, s.text, committee));
}
