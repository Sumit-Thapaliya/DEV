/* Recruiter workspace data.
 * Everything starts EMPTY - jobs are created through "Post a job", applicants
 * arrive once the applications backend module lands. No seeded/demo rows. */

export type JobStatus = 'Active' | 'Paused' | 'Closed';

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary: string;
  status: JobStatus;
  applicants: number;
  views: number;
  postedDaysAgo: number;
  postedHoursAgo: number;
  postedTimeText: string;
  postedOn: string;
  statusChangedOn?: string;
  description?: string;
  requirements?: string[];
}

export type ApplicantStatus =
  | 'New'
  | 'Shortlisted'
  | 'Interview'
  | 'Hired'
  | 'Rejected';

/** Human-readable meaning of each pipeline stage (used in tooltips/legend).
 * Workflow: New -> Shortlisted -> Interview -> Hired or Rejected. */
export const STATUS_MEANINGS: Record<ApplicantStatus, string> = {
  New: 'Applied and waiting for the resume screen.',
  Shortlisted: 'Resume screen passed, waiting for an interview call.',
  Interview: 'Interview scheduled or in progress, next: hire or reject.',
  Hired: 'Offer accepted, now part of your team.',
  Rejected: 'Not moving forward for this role.',
};

export interface Applicant {
  id: string;
  name: string;
  job: string;
  match: number;
  status: ApplicantStatus;
  appliedDaysAgo: number;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: Array<{ role: string; company: string; period: string }>;
  education: string;
  scheduledDate?: string;
}

export interface Conversation {
  id: string;
  name: string;
  role: string;
  unread: number;
  messages: Array<{ from: 'them' | 'me'; text: string; time: string }>;
}

export interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  view: 'applicants' | 'jobs';
}

export const INITIAL_JOBS: Job[] = [];

export const INITIAL_APPLICANTS: Applicant[] = [];

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

export const WEEKLY: Array<{ week: string; applications: number; interviews: number }> = [];

export const SOURCES: Array<{ label: string; value: number; colorClass: string }> = [];