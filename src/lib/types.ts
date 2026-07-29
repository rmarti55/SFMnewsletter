export interface TranscriptSummary {
  executiveSummary: string;
  keyDecisions: string[];
  actionItems: string[];
  publicCommentsSummary: string;
  motionsAndVotes: string[];
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
}

export interface RecentExportItem {
  eventId: number;
  eventName: string;
  categoryName: string | null;
  meetingDate: string;
  transcriptId: number | null;
  transcriptStatus: string | null;
  executiveSummary: string;
  summary: TranscriptSummary;
  topics: string[];
  cleanedTranscript: string | null;
  speakers: SpeakerSegment[];
  sourceUrl: string;
}

export interface UpcomingItem {
  eventId: number;
  eventName: string;
  meetingDate: string;
  digest: string | null;
  agendaHighlights: string[];
}

export interface NewsletterReadiness {
  recentInWindow: number;
  recentWithCompletedTranscript: number;
  recentWithExecutiveSummary: number;
  skippedNoSummary: number;
  skippedNoTranscriptRow: number;
  skippedBreakdown: {
    notEligibleCommittee: number;
    eligibleNoVideo: number;
    eligiblePending: number;
    noSummary: number;
  };
  skippedMeetings: Array<{
    eventId: number;
    eventName: string;
    categoryName: string | null;
    meetingDate: string;
    reason: 'not_eligible' | 'no_video' | 'pending' | 'no_summary';
    transcriptStatus?: string | null;
  }>;
}

export interface NewsletterCorpus {
  issueDate: string;
  lookbackDays: number;
  lookaheadDays: number;
  recent: RecentExportItem[];
  upcoming: UpcomingItem[];
  readiness: NewsletterReadiness;
}

export interface Storyline {
  eventId: number;
  eventName: string;
  committee: string | null;
  meetingDate: string;
  headline: string;
  whatHappened: string;
  whyItMatters: string;
  people: Array<{ name: string; role?: string; position?: string }>;
  quotes: Array<{ speaker: string; quote: string }>;
  significance: number;
}

export interface NewsletterEdition {
  id: number;
  issueDate: string;
  subject: string | null;
  bodyMarkdown: string | null;
  sourceEventIds: string | null;
  status: 'draft' | 'sent';
  model: string | null;
  createdAt: string;
  sentAt: string | null;
}

export type GenerateReason = 'created' | 'empty';

export interface GenerateResult {
  created: boolean;
  edition: NewsletterEdition | null;
  reason: GenerateReason;
  readiness?: NewsletterReadiness;
}
