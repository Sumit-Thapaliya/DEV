'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Briefcase,
  CalendarCheck,
  CheckCheck,
  Compass,
  Download,
  Eye,
  FileCheck2,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { apiGet, apiPost, type JobRow } from '@/features/dashboard/shared';
import { CandidateProfileGate } from '@/features/dashboard/candidate-profile-gate';
import { useCountUp } from '@/lib/use-count-up';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

import {
  ACTIVE_STATUSES,
  type Application,
  type ApplicationStatus,
  type CandidateProfile,
  INITIAL_APPLICATIONS,
  INITIAL_INTERVIEWS,
  INITIAL_JOBS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROFILE,
  INITIAL_SAVED_IDS,
  type JobPosting,
  PIPELINE_ORDER,
  profileCompleteness,
  PROFILE_CHECKLIST,
  type ChecklistItem,
  type Notification,
} from './candidate/mock-data';
import { Sidebar as CandidateSidebar, type CandidateView } from './candidate/sidebar';
import { ResumeStudioView } from './candidate/resume-studio';
import {
  type AtsGenerationResult,
  type AtsUploadedFile,
  triggerDownload,
} from './candidate/ats-service';
import { ApplicationsTrend } from './candidate/charts';
import {
  ApplicationDrawer,
  ApplicationsView,
  EmptyState,
  HelpView,
  InterviewsView,
  JobDrawer,
  JobsView,
  ProfileView,
  SavedJobsView,
  SectionCard,
  SettingsView,
  StagePills,
  StatusChip,
} from './candidate/views';

function parseStoredProfile(raw: string | null | undefined): Partial<CandidateProfile> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<CandidateProfile>;
  } catch {
    return {};
  }
}

const LIVE_STATUS: Record<string, ApplicationStatus> = {
  NEW: 'Applied',
  REVIEWING: 'Shortlisted',
  INTERVIEW: 'Interview',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

const initialsOf = (value: string) =>
  value
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JD';

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const hoursSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
const formatPostedTime = (hours: number, days: number) => {
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

function mapLiveJob(job: JobRow): JobPosting {
  const metadata = job.metadata ?? {};
  const str = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const location = job.location || 'Nepal';
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    companyInitials: initialsOf(job.company),
    department: str(metadata.department) ?? '',
    location,
    workMode: /remote/i.test(location) ? 'Remote' : 'On-site',
    type: (str(metadata.employmentType) as JobPosting['type'] | null) ?? 'Full-time',
    salary: str(metadata.salary) ?? 'Negotiable',
    postedDaysAgo: daysSince(job.createdAt),
    postedHoursAgo: hoursSince(job.createdAt),
    postedTimeText: formatPostedTime(hoursSince(job.createdAt), daysSince(job.createdAt)),
    postedOn: new Date(job.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    applicants: 0,
    views: 0,
    match: 0,
    matchedSkills: [],
    missingSkills: [],
    reasons: [],
    description: job.description ?? '',
    requirements: [],
  };
}

function mapLiveApplication(application: {
  id: string;
  status: string;
  createdAt: string;
  job: JobRow | null;
}): Application {
  const job = application.job;
  return {
    id: application.id,
    jobId: job?.id ?? '',
    title: job?.title ?? 'Removed job',
    company: job?.company ?? '',
    companyInitials: initialsOf(job?.company ?? 'Job Dev'),
    location: job?.location ?? '',
    workMode: 'On-site',
    type: 'Full-time',
    salary: 'Negotiable',
    status: LIVE_STATUS[application.status] ?? 'Applied',
    match: 0,
    appliedDaysAgo: daysSince(application.createdAt),
    appliedOn: new Date(application.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    resumeVersion: 'My resume',
    source: 'JobDev',
    timeline: [
      {
        status: 'Applied',
        when: new Date(application.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        note: 'Application submitted with your uploaded resume.',
      },
    ],
  };
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  delay,
  onClick,
  hint,
}: {
  label: string;
  value: number;
  delta: string;
  icon: typeof Briefcase;
  delay: number;
  onClick?: () => void;
  hint?: string;
}) {
  const count = useCountUp(value);
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight xl:text-3xl">
            {count.toLocaleString()}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-success">{delta}</p>
    </>
  );
  const base =
    'sheen-hover group animate-fade-in-up w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg xl:p-5';

  /* Cards with a destination are buttons; the rest stay plain. */
  if (!onClick) {
    return (
      <div className={base} style={{ animationDelay: `${delay}ms` }}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={cn(
        base,
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {body}
    </button>
  );
}

function countByStatus(applications: Application[]): Record<ApplicationStatus, number> {
  const counts = PIPELINE_ORDER.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<ApplicationStatus, number>,
  );
  counts.Rejected = 0;
  counts.Withdrawn = 0;
  for (const application of applications) {
    counts[application.status] = (counts[application.status] ?? 0) + 1;
  }
  return counts;
}

export function CandidateDashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [view, setView] = useState<CandidateView>('overview');
  const [jobs, setJobs] = useState<JobPosting[]>(INITIAL_JOBS);
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [savedIds, setSavedIds] = useState<string[]>(INITIAL_SAVED_IDS);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    PROFILE_CHECKLIST.map((item) => ({ ...item, done: false })),
  );
  const [toast, setToast] = useState<string | null>(null);

  /* Profile mirrors the real account, enriched by the ATS-parsed resume when
     one was uploaded; editable during the session. */
  const [profile, setProfile] = useState<CandidateProfile>(() => {
    const stored = parseStoredProfile(user?.parsedProfile);
    return {
      ...INITIAL_PROFILE,
      ...stored,
      name: user?.name || stored.name || '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      resumeFileName: user?.resumeFileName ?? '',
    };
  });

  useEffect(() => {
    setProfile((current) => {
      const stored = parseStoredProfile(user?.parsedProfile);
      return {
        ...current,
        ...stored,
        name: user?.name || stored.name || current.name,
        email: user?.email ?? current.email,
        phone: user?.phone ?? current.phone,
        resumeFileName: user?.resumeFileName ?? current.resumeFileName,
      };
    });
  }, [user]);

  /* Data-driven checklist signals track the real profile; references/video
     stay manual because only the candidate knows about them. */
  useEffect(() => {
    setChecklist((current) =>
      current.map((item) => {
        switch (item.key) {
          case 'links':
            return { ...item, done: profile.links.length > 0 };
          case 'education':
            return { ...item, done: profile.education.length > 0 };
          case 'salary':
            return { ...item, done: Boolean(profile.expectedSalary) };
          case 'phone':
            return { ...item, done: Boolean(profile.phone) };
          case 'workModes':
            return { ...item, done: profile.workModes.length > 0 };
          default:
            return item;
        }
      }),
    );
  }, [profile]);

  /* Live data: jobs and applications come from the API, not mock data. */
  const loadLiveData = useCallback(async () => {
    try {
      const [jobsData, applicationsData] = await Promise.all([
        apiGet<{ jobs: JobRow[] }>('/api/jobs'),
        apiGet<{
          applications: Array<{
            id: string;
            status: string;
            createdAt: string;
            job: JobRow | null;
          }>;
        }>('/api/applications'),
      ]);
      setJobs(jobsData.jobs.map(mapLiveJob));
      setApplications(applicationsData.applications.map(mapLiveApplication));
    } catch {
      /* API errors surface via apiClient; dashboard shows empty states. */
    }
  }, []);

  useEffect(() => {
    void loadLiveData();
  }, [loadLiveData]);

  /* ATS resume: the uploaded file and the generated download live here so they
     survive switching views (the studio itself is unmounted on navigation). */
  const [atsFile, setAtsFile] = useState<AtsUploadedFile | null>(null);
  const [atsResult, setAtsResult] = useState<AtsGenerationResult | null>(null);

  /* Notifications persist in localStorage so read state survives reloads. */
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
    try {
      const raw = window.localStorage.getItem('jobdev-candidate-notifications');
      if (raw) return JSON.parse(raw) as Notification[];
    } catch {
      /* fall back to the demo set */
    }
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'jobdev-candidate-notifications',
        JSON.stringify(notifications),
      );
    } catch {
      /* storage may be unavailable; ignore */
    }
  }, [notifications]);

  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
  

  /* Keyword boxes: curated job-market keywords plus anything derived from the
     live job list; picking one adds it to the search box and filters the grid. */
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* The navbar bell + gear live in the shared layout; they drive this
     dashboard through custom events so every role keeps its own UI. */
  useEffect(() => {
    const onView = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) setView(detail as CandidateView);
    };
    const onNotifications = () => setNotifOpen((value) => !value);
    window.addEventListener('jobdev:view', onView);
    window.addEventListener('jobdev:notifications', onNotifications);
    return () => {
      window.removeEventListener('jobdev:view', onView);
      window.removeEventListener('jobdev:notifications', onNotifications);
    };
  }, []);

  const firstName =
    (user?.name || user?.identifier || 'there').split(/[@\s]/)[0] || 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const counts = useMemo(() => countByStatus(applications), [applications]);
  const appliedJobIds = useMemo(
    () => applications.map((application) => application.jobId),
    [applications],
  );
  const completeness = useMemo(() => profileCompleteness(checklist), [checklist]);
  const missingSignals = checklist.filter((item) => !item.done).length;

  const upcomingInterviews = INITIAL_INTERVIEWS.filter((interview) => interview.inDays >= 0);
  const activeApplications = applications.filter((application) =>
    ACTIVE_STATUSES.includes(application.status),
  );
  const avgMatch = Math.round(
    applications.reduce((sum, application) => sum + application.match, 0) /
      Math.max(applications.length, 1),
  );

  const stats: Array<{
    label: string;
    value: number;
    delta: string;
    icon: typeof Briefcase;
    hint: string;
    go: () => void;
  }> = [
    {
      label: 'Active applications',
      value: activeApplications.length,
      delta: `${counts.Applied} awaiting a reply`,
      icon: Briefcase,
      hint: 'Open your applications',
      go: () => setView('applications'),
    },
    /* { label: 'Interviews scheduled' ... } */
    {
      label: 'Saved jobs',
      value: savedIds.length,
      delta: `${jobs.filter((job) => job.match >= 85).length} roles above 85% match`,
      icon: Bookmark,
      hint: 'Open your shortlist',
      go: () => setView('saved'),
    },
    {
      label: 'Profile views',
      value: 0,
      delta: `Profile ${completeness}% complete`,
      icon: Eye,
      hint: 'Open your profile',
      go: () => setView('profile'),
    },
  ];

  /* Working global search: matches open roles + your applications, click to jump in. */


  const unread = notifications.filter((notification) => !notification.read).length;

  /* ------------------------------- mutations ------------------------------ */

  function toggleSave(job: JobPosting) {
    const saved = savedIds.includes(job.id);
    setSavedIds((current) =>
      saved ? current.filter((id) => id !== job.id) : [job.id, ...current],
    );
    setJobs((current) =>
      current.map((entry) => (entry.id === job.id ? { ...entry, saved: !saved } : entry)),
    );
    setToast(
      saved
        ? `Removed “${job.title}” from saved jobs`
        : `Saved “${job.title}” for later`,
    );
  }

  async function applyToJob(job: JobPosting) {
    if (appliedJobIds.includes(job.id)) {
      setToast('You have already applied to this role');
      return;
    }
    try {
      await apiPost('/api/applications', { jobId: job.id });
      await loadLiveData();
      setToast(`Applied to “${job.title}” — we will track it for you`);
    } catch (error) {
      setToast((error as Error).message);
    }
  }

  function withdrawApplication(id: string) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id
          ? {
              ...application,
              status: 'Withdrawn',
              nextStep: undefined,
              timeline: [
                ...application.timeline,
                {
                  status: 'Withdrawn',
                  when: 'Today',
                  note: 'You withdrew from this application.',
                },
              ],
            }
          : application,
      ),
    );
    setToast('Application withdrawn — the recruiter has been notified');
  }


  function toggleChecklistItem(key: string) {
    setChecklist((current) =>
      current.map((item) => (item.key === key ? { ...item, done: !item.done } : item)),
    );
  }

  function downloadAtsResume() {
    if (!atsResult) {
      setView('resume');
      return;
    }
    triggerDownload(atsResult.blob, atsResult.fileName);
    setToast(`Downloading ${atsResult.fileName}`);
  }

  function openApplicationById(applicationId: string) {
    const application = applications.find((entry) => entry.id === applicationId);
    if (!application) return;
    setView('applications');
    setSelectedApplication(application);
  }

  const recommended = useMemo(
    () =>
      jobs
        .filter((job) => !appliedJobIds.includes(job.id))
        .sort((a, b) => b.match - a.match)
        .slice(0, 3),
    [jobs, appliedJobIds],
  );

  const refreshJob = selectedJob
    ? jobs.find((job) => job.id === selectedJob.id) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <CandidateProfileGate />
      <CandidateSidebar
        active={view}
        onSelect={setView}
        badges={{
          applications: activeApplications.length,
          interviews: upcomingInterviews.length,
          saved: savedIds.length,
        }}
        strengthPercent={completeness}
        missingSignals={missingSignals}
        onLogout={() => {
          logout();
          window.location.href = '/login';
        }}
      />

      <main className="min-w-0 flex-1 space-y-4">
        {/* Greeting + global actions */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting}, <span className="text-primary">{firstName}</span>
            </h1>
            
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <div>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="animate-pop-in fixed right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                    <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                      <p className="text-sm font-bold">Notifications</p>
                      <button
                        type="button"
                        onClick={() =>
                          setNotifications((current) =>
                            current.map((notification) => ({ ...notification, read: true })),
                          )
                        }
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    </div>
                    <ul className="max-h-80 overflow-y-auto p-2 scrollbar-slim">
                      {notifications.map((notification) => (
                        <li key={notification.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setNotifications((current) =>
                                current.map((entry) =>
                                  entry.id === notification.id ? { ...entry, read: true } : entry,
                                ),
                              );
                              setView(notification.view);
                              setNotifOpen(false);
                            }}
                            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-primary-light"
                          >
                            <span
                              className={
                                notification.read
                                  ? 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border'
                                  : 'mt-1.5 h-2 w-2 shrink-0 animate-pulse-dot rounded-full bg-primary'
                              }
                            />
                            <span>
                              <span className="block text-sm font-medium leading-snug">
                                {notification.text}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {notification.time}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            <Button className="hidden sm:inline-flex" onClick={() => setView('jobs')}>
              <Compass className="h-4 w-4" />
              Find jobs
            </Button>
          </div>
        </div>

        {/* Mobile primary action */}
        <Button className="w-full sm:hidden" onClick={() => setView('jobs')}>
          <Compass className="h-4 w-4" />
          Find jobs
        </Button>

        {view === 'overview' && (
          <>
            <div className="animate-fade-in-up overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <img
                src="/jobdev-poster.png"
                alt="JobDev - find work that fits, apply in one click"
                className="h-auto w-full object-cover"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  delta={stat.delta}
                  icon={stat.icon}
                  delay={index * 90}
                  onClick={stat.go}
                  hint={stat.hint}
                />
              ))}
            </div>

            {/* ATS resume shortcut */}
            <SectionCard
              title="ATS-friendly resume"
              subtitle="Upload the resume you send out and download the ATS-friendly version"
              delay={220}
            >
              {atsResult ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                    <FileCheck2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{atsResult.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      PDF · {atsResult.pages} page{atsResult.pages === 1 ? '' : 's'} · ready to
                      send
                    </p>
                  </div>
                  <Button onClick={downloadAtsResume}>
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                    <FileCheck2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">No ATS resume generated yet</p>
                    <p className="text-sm text-muted-foreground">
                      Upload a PDF, DOCX or DOC and download a single-column, parser-safe
                      version.
                    </p>
                  </div>
                  <Button onClick={() => setView('resume')}>
                    <UploadCloud className="h-4 w-4" />
                    Upload resume
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* Recommendations */}
            <SectionCard
              title="Recommended for you"
              subtitle="Ranked by skills, experience, working style and salary fit"
              delay={400}
              action={
                <button
                  type="button"
                  onClick={() => setView('jobs')}
                  className="text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  Browse all
                </button>
              }
            >
              {recommended.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  title="No fresh matches right now"
                  body="Add a few more skills to your profile and new roles will appear here within minutes."
                />
              ) : (
                <ul className="space-y-3">
                  {recommended.map((job, index) => (
                    <li
                      key={job.id}
                      className="animate-fade-in-up rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary-light/20"
                      style={{ animationDelay: `${460 + index * 70}ms` }}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-xs font-bold text-primary-dark">
                          {job.companyInitials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold">{job.title}</h4>
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                              {job.match}% match
                            </span>
                            {job.postedDaysAgo <= 3 ? (
                              <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {job.company} · {job.location} · {job.workMode} · {job.salary}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {job.matchedSkills.slice(0, 3).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.missingSkills.slice(0, 2).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button size="sm" onClick={() => applyToJob(job)}>
                            Quick apply
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setSelectedJob(job)}>
                            Details
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </>
        )}

        {view === 'applications' && (
          <ApplicationsView
            applications={applications}
            onOpen={setSelectedApplication}
            onWithdraw={withdrawApplication}
            onBrowseJobs={() => setView('jobs')}
          />
        )}

        {view === 'interviews' && (
          <InterviewsView
            interviews={INITIAL_INTERVIEWS}
            onOpenApplication={openApplicationById}
          />
        )}

        {view === 'saved' && (
          <SavedJobsView
            jobs={jobs.filter((job) => savedIds.includes(job.id))}
            onOpenJob={setSelectedJob}
            onToggleSave={toggleSave}
            onApply={applyToJob}
            appliedJobIds={appliedJobIds}
          />
        )}

        {view === 'resume' && (
          <ResumeStudioView
            profile={profile}
            file={atsFile}
            onFileChange={setAtsFile}
            result={atsResult}
            onResultChange={setAtsResult}
            onNotify={setToast}
          />
        )}

        {view === 'jobs' && (
          <div className="space-y-4">
            <JobsView
              jobs={jobs}
              savedIds={savedIds}
              appliedJobIds={appliedJobIds}
              onOpenJob={setSelectedJob}
              onToggleSave={toggleSave}
              onApply={applyToJob}
            />
          </div>
        )}



        {view === 'profile' && (
          <ProfileView
            profile={profile}
            checklist={checklist}
            percent={completeness}
            onToggleChecklist={toggleChecklistItem}
            onOpenSettings={() => setView('settings')}
            atsReady={Boolean(atsResult)}
            atsFileName={atsResult?.fileName ?? null}
            onOpenResume={() => setView('resume')}
            onDownloadAts={downloadAtsResume}
            onSaveProfile={(fields) => setProfile((current) => ({ ...current, ...fields }))}
            onAddSkill={(skill) =>
              setProfile((current) =>
                current.skills.includes(skill)
                  ? current
                  : { ...current, skills: [...current.skills, skill] },
              )
            }
            onRemoveSkill={(skill) =>
              setProfile((current) => ({
                ...current,
                skills: current.skills.filter((item) => item !== skill),
              }))
            }
            onAddExperience={(entry) =>
              setProfile((current) => ({
                ...current,
                experience: [
                  ...current.experience,
                  { ...entry, highlights: [] },
                ],
              }))
            }
          />
        )}

        {view === 'settings' && <SettingsView profile={profile} />}
        {view === 'help' && <HelpView />}
      </main>

      <ApplicationDrawer
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
        onWithdraw={withdrawApplication}
      />

      <JobDrawer
        job={refreshJob}
        applied={refreshJob ? appliedJobIds.includes(refreshJob.id) : false}
        saved={refreshJob ? savedIds.includes(refreshJob.id) : false}
        onClose={() => setSelectedJob(null)}
        onApply={applyToJob}
        onToggleSave={toggleSave}
      />

      {/* Toast */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-pop-in fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-xl"
        >
          <CheckCheck className="h-4 w-4 text-success" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
