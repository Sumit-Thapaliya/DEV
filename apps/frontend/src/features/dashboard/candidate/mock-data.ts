/* Demo data for the candidate (job-seeker) workspace.
 * TODO(candidate): replace with real endpoints once the candidate module lands
 * in the backend. The shapes here intentionally mirror the recruiter workspace
 * (`features/dashboard/recruiter/mock-data.ts`) so both sides can move to the
 * same API contract without rework:
 *   APPLICATIONS -> GET  /api/candidate/me/applications
 *   JOBS         -> GET  /api/jobs
 *   INTERVIEWS   -> GET  /api/candidate/me/interviews
 *   PROFILE      -> GET  /api/candidate/me/profile */

export type ApplicationStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected'
  | 'Withdrawn';

export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

/** Human-readable meaning of each stage (used in tooltips/legend).
 * Candidate funnel: Applied -> Shortlisted -> Interview -> Offer -> Hired,
 * with Rejected / Withdrawn as exits. */
export const APPLICATION_STATUS_MEANINGS: Record<ApplicationStatus, string> = {
  Applied: 'Sent and waiting for the resume screen.',
  Shortlisted: 'Resume passed - the recruiter wants to talk.',
  Interview: 'Interview scheduled or completed, awaiting a decision.',
  Offer: 'Offer on the table - respond before it expires.',
  Hired: 'Offer accepted. Congratulations!',
  Rejected: 'Not moving forward for this role.',
  Withdrawn: 'You pulled out of this application.',
};

/** The funnel the dashboard reports on, in order. */
export const PIPELINE_ORDER: ApplicationStatus[] = [
  'Applied',
  'Shortlisted',
  'Interview',
  'Offer',
  'Hired',
];

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  'Applied',
  'Shortlisted',
  'Interview',
  'Offer',
];

/* -------------------------------------------------------------------------- */
/*                                   Profile                                  */
/* -------------------------------------------------------------------------- */

export interface ChecklistItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
  hint: string;
}

export interface CandidateProfile {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  about: string;
  seniority: string;
  experienceYears: number;
  expectedSalary: string;
  noticePeriod: string;
  openToWork: boolean;
  workModes: WorkMode[];
  skills: string[];
  links: Array<{ label: string; url: string }>;
  education: Array<{ degree: string; school: string; period: string }>;
  experience: Array<{
    role: string;
    company: string;
    period: string;
    highlights: string[];
  }>;
  resumeFileName: string;
  resumeUpdatedDaysAgo: number;
}

export const INITIAL_PROFILE: CandidateProfile = {
  name: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  about: '',
  seniority: '',
  experienceYears: 0,
  expectedSalary: '',
  noticePeriod: '',
  openToWork: true,
  workModes: [],
  skills: [],
  links: [],
  education: [],
  experience: [],
  resumeFileName: '',
  resumeUpdatedDaysAgo: 0,
};

/** Weighted profile-strength signals - drives the completeness ring. */
export const PROFILE_CHECKLIST: ChecklistItem[] = [
  {
    key: 'headline',
    label: 'Professional headline',
    weight: 10,
    done: false,
    hint: 'Say what you do and the stack you do it in.',
  },
  {
    key: 'about',
    label: 'About section',
    weight: 10,
    done: false,
    hint: 'Two or three sentences on impact, not duties.',
  },
  {
    key: 'skills',
    label: 'Five or more skills',
    weight: 15,
    done: false,
    hint: 'Recruiters filter on skills before anything else.',
  },
  {
    key: 'experience',
    label: 'Work experience with results',
    weight: 15,
    done: false,
    hint: 'Add numbers: latency, revenue, users, time saved.',
  },
  {
    key: 'resume',
    label: 'Resume attached',
    weight: 20,
    done: false,
    hint: 'Attach the resume you want recruiters to see.',
  },
  {
    key: 'links',
    label: 'Portfolio or GitHub',
    weight: 10,
    done: false,
    hint: 'Add links to your work so recruiters can review it.',
  },
  {
    key: 'education',
    label: 'Education',
    weight: 5,
    done: false,
    hint: 'Add your highest qualification.',
  },
  {
    key: 'salary',
    label: 'Salary expectation',
    weight: 5,
    done: false,
    hint: 'Set a target so match scores stay accurate.',
  },
  {
    key: 'phone',
    label: 'Phone number',
    weight: 5,
    done: false,
    hint: 'Recruiters call before they email.',
  },
  {
    key: 'workModes',
    label: 'Preferred working styles',
    weight: 5,
    done: false,
    hint: 'Pick remote, hybrid or on-site preferences.',
  },

];

export const profileCompleteness = (items: ChecklistItem[]) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce(
    (sum, item) => sum + (item.done ? item.weight : 0),
    0,
  );
  return Math.round((earned / total) * 100);
};

/* -------------------------------------------------------------------------- */
/*                                    Jobs                                    */
/* -------------------------------------------------------------------------- */

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  companyInitials: string;
  department: string;
  location: string;
  workMode: WorkMode;
  type: JobType;
  salary: string;
  postedDaysAgo: number;
  postedHoursAgo: number;
  postedTimeText: string;
  postedOn: string;
  applicants: number;
  views: number;
  /** 0-100 fit for this candidate, produced by the match score. */
  match: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  description: string;
  minimumQualifications?: string;
  preferredQualifications?: string;
  requirements: string[];
  saved?: boolean;
}

export const INITIAL_JOBS: JobPosting[] = [];

/* -------------------------------------------------------------------------- */
/*                                Applications                                */
/* -------------------------------------------------------------------------- */

export interface Application {
  id: string;
  jobId: string;
  title: string;
  company: string;
  companyInitials: string;
  location: string;
  workMode: WorkMode;
  type: JobType;
  salary: string;
  status: ApplicationStatus;
  match: number;
  appliedDaysAgo: number;
  appliedOn: string;
  resumeVersion: string;
  source: string;
  nextStep?: string;
  recruiterNote?: string;
  timeline: Array<{ status: ApplicationStatus; when: string; note: string }>;
}

export const INITIAL_APPLICATIONS: Application[] = [];

/* -------------------------------------------------------------------------- */
/*                                 Interviews                                 */
/* -------------------------------------------------------------------------- */

export interface Interview {
  id: string;
  applicationId: string;
  title: string;
  company: string;
  companyInitials: string;
  stage: string;
  date: string;
  time: string;
  durationMins: number;
  mode: 'Video call' | 'Phone screen' | 'On-site';
  interviewer: string;
  meetingUrl?: string;
  /** Whole days from today; negatives are in the past. */
  inDays: number;
  notes?: string;
}

export const INITIAL_INTERVIEWS: Interview[] = [];

export const PREP_CHECKLIST: Array<{ id: string; text: string; done: boolean }> = [
  {
    id: 'prep-1',
    text: 'Re-read the job description and map each requirement to a project you shipped.',
    done: true,
  },
  {
    id: 'prep-2',
    text: 'Prepare three stories: a hard bug, a disagreement, and a measurable win.',
    done: true,
  },
  {
    id: 'prep-3',
    text: 'Test camera, microphone and connection 15 minutes before a video call.',
    done: false,
  },
  {
    id: 'prep-4',
    text: 'Write down two questions about the team, roadmap and how success is measured.',
    done: false,
  },
  {
    id: 'prep-5',
    text: 'Have your notice period, expected salary and two references ready.',
    done: false,
  },
];

/* -------------------------------------------------------------------------- */
/*                              Saved / activity                              */
/* -------------------------------------------------------------------------- */

export const INITIAL_SAVED_IDS: string[] = [];

export interface Activity {
  id: string;
  kind: 'status' | 'interview' | 'view' | 'saved' | 'message' | 'badge';
  text: string;
  detail: string;
  time: string;
}

/** Icon tint per activity kind, so the feed reads at a glance. */
export const ACTIVITY_STATUS: Record<Activity['kind'], string> = {
  status: 'bg-primary-light text-primary-dark',
  interview: 'bg-warning/10 text-warning',
  view: 'bg-info/10 text-info',
  saved: 'bg-muted text-muted-foreground',
  message: 'bg-success/10 text-success',
  badge: 'bg-primary-light text-primary-dark',
};

export const INITIAL_ACTIVITY: Activity[] = [];

export interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  view: 'applications' | 'interviews' | 'saved' | 'jobs';
}

export const INITIAL_NOTIFICATIONS: Notification[] = [];

export interface Conversation {
  id: string;
  name: string;
  role: string;
  unread: number;
  messages: Array<{ from: 'them' | 'me'; text: string; time: string }>;
}

export const INITIAL_CONVERSATIONS: Conversation[] = [];

/* -------------------------------------------------------------------------- */
/*                                Analytics                                   */
/* -------------------------------------------------------------------------- */

export const WEEKLY: Array<{
  week: string;
  applications: number;
  views: number;
  interviews: number;
}> = [];

export const SKILL_DEMAND: Array<{ skill: string; roles: number; hasSkill: boolean }> = [];

/** Where the candidate's applications came from - mirrored by the recruiter's
 * "Applicant sources" donut so both dashboards tell the same story. */
export const SOURCES: Array<{ label: string; value: number; colorClass: string }> = [];
