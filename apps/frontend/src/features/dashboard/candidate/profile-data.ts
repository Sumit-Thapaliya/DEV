import { PROFILE_CHECKLIST } from './mock-data';
import type { CandidateProfile } from './mock-data';

export function parseStoredProfile(
  raw: string | Record<string, unknown> | null | undefined,
): Partial<CandidateProfile> {
  if (!raw) return {};
  let parsed: unknown;
  if (typeof raw === 'object') {
    parsed = raw;
  } else {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object') return {};
  const envelope = parsed as Record<string, unknown>;
  if (Array.isArray(envelope.pages)) return profileFromLegacyCanvas(envelope);
  /* The extraction service wraps a JSON-Resume object in raw_resume_data. */
  const resume =
    envelope.raw_resume_data && typeof envelope.raw_resume_data === 'object'
      ? (envelope.raw_resume_data as Record<string, unknown>)
      : envelope;
  const basics =
    resume.basics && typeof resume.basics === 'object'
      ? (resume.basics as Record<string, unknown>)
      : {};
  const levels = [basics, resume, envelope];

  const str = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const first = (keys: string[]) => {
    for (const level of levels) {
      for (const key of keys) {
        const hit = str(level[key]);
        if (hit) return hit;
      }
    }
    return null;
  };

  const out: Partial<CandidateProfile> = { headline: '', about: '', location: '', skills: [], experience: [], education: [], links: [] };
  // Preserve editable preferences when reading the normalized profile format.
  for (const key of ['expectedSalary', 'noticePeriod', 'seniority'] as const) {
    if (typeof envelope[key] === 'string') out[key] = envelope[key] as string;
  }
  if (Array.isArray(envelope.workModes)) out.workModes = envelope.workModes as CandidateProfile['workModes'];

  const name = first(['name', 'candidate_name']);
  if (name) out.name = name;
  const headline = first(['headline', 'label', 'title', 'role']);
  if (headline) out.headline = headline;
  const about = first(['about', 'summary']);
  if (about) out.about = about;
  const email = first(['email']);
  if (email) out.email = email;
  const phone = first(['phone']);
  if (phone) out.phone = phone;
  const locationRaw =
    first(['location']) ??
    (basics.location && typeof basics.location === 'object'
      ? str((basics.location as Record<string, unknown>).raw) ??
        str((basics.location as Record<string, unknown>).city)
      : null);
  if (locationRaw) out.location = locationRaw;

  /* skills: either string[] or [{ keywords: string[] }] (JSON Resume). */
  if (Array.isArray(resume.skills)) {
    const skills: string[] = [];
    for (const item of resume.skills) {
      if (typeof item === 'string') {
        if (!skills.includes(item)) skills.push(item);
      } else if (item && typeof item === 'object') {
        const entry = item as Record<string, unknown>;
        const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
        for (const keyword of keywords) {
          if (typeof keyword === 'string' && !skills.includes(keyword)) skills.push(keyword);
        }
        const single = str(entry.name);
        if (single && single.toLowerCase() !== 'other' && !skills.includes(single)) {
          skills.push(single);
        }
      }
    }
    if (skills.length > 0) out.skills = skills;
  }

  /* experience: our {role,company,period} or JSON Resume work entries. */
  const workSource = Array.isArray(resume.experience)
    ? resume.experience
    : Array.isArray(resume.work)
      ? resume.work
      : null;
  if (workSource) {
    const experience = workSource
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((entry) => ({
        role: str(entry.role) ?? str(entry.position) ?? str(entry.title) ?? '',
        company: str(entry.company) ?? str(entry.name) ?? '',
        period: str(entry.period) ?? str(entry.datesRaw) ?? str(entry.duration) ?? [str(entry.startDate), str(entry.endDate)].filter(Boolean).join(' – '),
        highlights: Array.isArray(entry.highlights)
          ? entry.highlights.filter((h): h is string => typeof h === 'string')
          : [],
      }));
    if (experience.length > 0) out.experience = experience;
  }

  /* education: our {degree,school,period} or JSON Resume education entries. */
  if (Array.isArray(resume.education)) {
    const education = (resume.education as unknown[])
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((entry) => ({
        degree: str(entry.degree) ?? str(entry.qualification) ?? ([str(entry.studyType), str(entry.area)].filter(Boolean).join(' in ') || ''),
        school: str(entry.school) ?? str(entry.institution) ?? '',
        period: str(entry.period) ?? str(entry.datesRaw) ?? str(entry.duration) ?? [str(entry.startDate), str(entry.endDate)].filter(Boolean).join(' – '),
      }));
    if (education.length > 0) out.education = education;
  }

  const links: CandidateProfile['links'] = [];
  const profiles = Array.isArray(basics.profiles) ? basics.profiles : Array.isArray(resume.links) ? resume.links : [];
  for (const value of profiles) {
    if (!value || typeof value !== 'object') continue;
    const link = value as Record<string, unknown>;
    const url = str(link.url);
    if (url) links.push({ label: str(link.label) ?? str(link.network) ?? 'Portfolio', url });
  }
  for (const key of ['url', 'website', 'github', 'linkedin']) {
    const url = str(basics[key]) ?? str(resume[key]);
    if (url && !links.some(link => link.url === url)) links.push({ label: key === 'url' ? 'Portfolio' : key, url });
  }
  out.links = links;
  out.skills = [...new Map((out.skills ?? []).map(skill => [skill.trim().toLowerCase(), skill.trim()])).values()];
  return out;
}

/** Only fields supported by the app count toward completeness (weights total 100). */
export function profileChecklist(profile: CandidateProfile) {
  const signals: Record<string, boolean> = {
    headline: Boolean(profile.headline.trim()), about: Boolean(profile.about.trim()),
    skills: profile.skills.length >= 5, experience: profile.experience.some(entry => Boolean(entry.role || entry.company)),
    resume: Boolean(profile.resumeFileName), links: profile.links.some(link => Boolean(link.url)),
    education: profile.education.some(entry => Boolean(entry.degree || entry.school)),
    salary: Boolean(profile.expectedSalary.trim()), phone: Boolean(profile.phone.trim()), workModes: profile.workModes.length > 0,
  };
  return PROFILE_CHECKLIST.map(item => ({ ...item, done: signals[item.key] ?? false }));
}

/** Older releases stored canvas JSON in parsedProfile. Recover only recognizable
 * fields without inventing institutions/employers. The next canvas save uses ATS. */
function profileFromLegacyCanvas(canvas: Record<string, unknown>): Partial<CandidateProfile> {
  const pages = canvas.pages as Array<{ objects?: Array<{ type?: string; text?: string; hidden?: boolean; y?: number; x?: number }> }>;
  const texts = pages.flatMap(page => (page.objects ?? [])
    .filter(object => object.type === 'text' && !object.hidden && typeof object.text === 'string')
    .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
    .flatMap(object => object.text!.split(/\r?\n/).map(line => line.trim()).filter(Boolean)));
  const out: Partial<CandidateProfile> = { name: texts[0] ?? '', headline: '', about: '', skills: [], education: [], experience: [], links: [] };
  const sections = new Map<string, string[]>();
  const headings = /^(summary|profile|about(?: me)?|skills|technical skills|education|qualifications|work experience|experience|employment|projects|awards|certifications|training.*|hobbies.*|languages|interests)$/i;
  let section = 'identity';
  for (const line of texts.slice(1)) {
    const clean = line.replace(/:$/, '');
    if (headings.test(clean)) { section = clean.toLowerCase(); continue; }
    sections.set(section, [...(sections.get(section) ?? []), line]);
  }
  const identity = sections.get('identity') ?? [];
  out.headline = identity.find(line => !/[@+\d]|https?:/i.test(line)) ?? '';
  out.email = identity.find(line => /@/.test(line));
  out.phone = identity.find(line => /^\+?[\d()\s-]{7,}$/.test(line));
  out.location = identity.find(line => line !== out.headline && line !== out.email && line !== out.phone && !/https?:/.test(line)) ?? '';
  out.about = (sections.get('summary') ?? sections.get('profile') ?? sections.get('about') ?? []).join(' ');
  const skills = (sections.get('skills') ?? sections.get('technical skills') ?? [])
    .flatMap(line => line.replace(/^[^:]{1,40}:\s*/, '').split(/[,;|•]+/)).map(value => value.trim()).filter(Boolean);
  out.skills = [...new Map(skills.map(skill => [skill.toLowerCase(), skill])).values()];
  const education = sections.get('education') ?? sections.get('qualifications') ?? [];
  let current: CandidateProfile['education'][number] | null = null;
  for (const line of education) {
    if (/bachelor|master|doctor|phd|b\.?sc|b\.?e\b|degree|diploma|high school|secondary/i.test(line)) {
      current = { degree: line, school: '', period: '' }; out.education!.push(current);
    } else if (current && /\b(?:19|20)\d{2}\b/.test(line)) {
      if (!current.period) current.period = line;
    } else if (current && !current.school) current.school = line;
  }
  const experience = sections.get('experience') ?? sections.get('work experience') ?? sections.get('employment') ?? [];
  for (const line of experience) {
    // Only split clearly delimited entries; leave ambiguous prose for ATS.
    const parts = line.split(/\s+[–—|]\s+|\s+-\s+/);
    if (parts.length >= 2) out.experience!.push({ role: parts[0], company: parts[1], period: parts.slice(2).join(' – '), highlights: [] });
  }
  const urls = [...new Set(texts.flatMap(line => line.match(/https?:\/\/[^\s)]+/g) ?? []))];
  out.links = urls.map(url => ({ label: 'Portfolio', url }));
  return out;
}
