/** Pure file/ATS-to-resume mapping. All API reads and writes live in Query hooks. */
import {
  type CanvasDocument,
  type ResumeAlign,
  type ResumeBlock,
  type ResumeBlockKind,
  type ResumeBlockStyle,
  type ResumeDocument,
  type ResumeSection,
} from './demo-resume-pdf';


export type ResumeKind = 'pdf' | 'docx';

export interface AtsUploadedFile {
  name: string;
  size: number;
  kind: ResumeKind;
  /** ISO timestamp of when it was selected/replaced. */
  uploadedAt: string;
}

/** The service caps uploads at 20 MB (its MAX_UPLOAD_MB default). */
export const ATS_MAX_BYTES = 20 * 1024 * 1024;
export const ATS_ACCEPTED_LABEL = 'PDF or DOCX · up to 20 MB';
export const ATS_ACCEPT_ATTR =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** The service accepts .pdf and .docx only — legacy .doc gets a 415. */
export function resumeKindOf(fileName: string): ResumeKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  return null;
}

export function toUploadedFile(file: File): AtsUploadedFile | null {
  const kind = resumeKindOf(file.name);
  if (!kind) return null;
  return { name: file.name, size: file.size, kind, uploadedAt: new Date().toISOString() };
}

/** Returns a message to show the candidate, or `null` when the file is fine. */
export function validateAtsUpload(file: File): string | null {
  if (!resumeKindOf(file.name)) {
    return 'Only PDF and DOCX are supported. Export your resume to one of those and try again.';
  }
  if (file.size === 0) {
    return 'That file looks empty — download it again and re-upload.';
  }
  if (file.size > ATS_MAX_BYTES) {
    return `That file is ${formatBytes(file.size)}. The service accepts up to 20 MB.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `bibek-thapa-ats-resume.pdf` — the name the candidate downloads. */
export interface AtsGenerationResult {
  fileName: string;
  blob: Blob;
  pages: number;
  generatedAt: string;
  engine: 'service';
  note: string;
  document?: ResumeDocument;
  canvas?: CanvasDocument;
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* -------------------------------------------------------------------------- */
/*                     Parse → JSON (what the editor edits)                   */
/* -------------------------------------------------------------------------- */

const BLOCK_KINDS: readonly ResumeBlockKind[] = ['entry', 'bullet', 'text'];
const ALIGNMENTS: readonly ResumeAlign[] = ['left', 'center', 'right'];

/* Key aliases, so a parser that names things differently still opens. */
const SECTION_KEY_ALIASES = ['sections', 'resume_sections', 'blocks'];
const SECTION_TITLE_ALIASES = ['title', 'heading', 'section', 'name', 'label'];
const SECTION_ITEMS_ALIASES = ['blocks', 'items', 'lines', 'bullets', 'entries', 'content', 'children'];
const BLOCK_TEXT_ALIASES = ['text', 'content', 'value', 'line', 'description', 'bullet', 'title'];
const NAME_ALIASES = [
  'name',
  'full_name',
  'fullName',
  'fullname',
  'candidate',
  'candidate_name',
  'candidateName',
];
const HEADLINE_ALIASES = [
  'headline',
  'title',
  'role',
  'position',
  'designation',
  'summary_title',
  'current_title',
  'current_role',
  'professional_title',
];
const CONTACT_ALIASES = [
  'contacts',
  'contact',
  'contact_info',
  'contact_information',
  'contact_details',
  'personal_details',
  'links',
  'details',
];
const PLAIN_TEXT_ALIASES = [
  'text',
  'raw_text',
  'plain_text',
  'rawText',
  'plainText',
  'content',
  'extracted_text',
  'raw_resume_data',
  'resume_text',
  'resumeText',
  'extracted_resume',
];
/** Containers a service may wrap the resume in. */
const ENVELOPE_ALIASES = [
  'resume',
  'parsed',
  'data',
  'result',
  'document',
  'profile',
  'output',
  'payload',
  'raw_resume_data',
  'resume_data',
  'raw_data',
  'parsed_resume',
  'parsed_data',
  'resume_json',
  'json',
  /* The service wraps the whole answer: { success, candidate_name, raw_resume_data } */
  'response',
  'content',
];
/** Single-value contact fields a parser may keep beside the name. */
const CONTACT_FIELD_KEYS = [
  'email',
  'email_address',
  'phone',
  'phone_number',
  'mobile',
  'linkedin',
  'github',
  'website',
  'portfolio',
  'address',
  'location',
  'city',
];

/** Top-level arrays that clearly are resume sections when `sections` is absent. */
const SECTION_ARRAY_ALIASES: Array<[string, string]> = [
  ['summary', 'Summary'],
  ['objective', 'Objective'],
  ['experience', 'Experience'],
  ['work_experience', 'Experience'],
  ['workExperience', 'Experience'],
  ['employment', 'Experience'],
  ['education', 'Education'],
  ['skills', 'Skills'],
  ['projects', 'Projects'],
  ['certifications', 'Certifications'],
  ['awards', 'Awards'],
  ['publications', 'Publications'],
  ['languages', 'Languages'],
  ['interests', 'Interests'],
  ['volunteer', 'Volunteer'],
  ['achievements', 'Achievements'],
];

const KNOWN_HEADINGS =
  /^(summary|profile|objective|about|experience|work experience|employment|education|skills|technical skills|projects|certifications?|licenses?|awards?|honors?|publications?|languages?|interests?|volunteer|achievements?|references?|activities|training|courses?)\b/i;

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function asAlign(value: unknown): ResumeAlign | undefined {
  return typeof value === 'string' && (ALIGNMENTS as readonly string[]).includes(value)
    ? (value as ResumeAlign)
    : undefined;
}

function firstString(source: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = asText(source[key]);
    if (value) return value;
  }
  return '';
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'object' && item !== null) {
        const text = firstString(item as Record<string, unknown>, BLOCK_TEXT_ALIASES);
        return text ? [text] : [];
      }
      const text = asText(item);
      return text ? [text] : [];
    });
  }
  /* { email, phone, linkedin } → three entries. */
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => stringList(item));
  }
  const text = asText(value);
  return text ? text.split(/\s*[|•·]\s*/).filter(Boolean) : [];
}

/** Steps into whatever wrapper the service used: { resume: { … } }, { data: { … } }, … */
/** A string that is really serialised JSON (`raw_resume_data` often is). */
function parseJsonString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!/^[[{]/.test(text)) return value;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return value;
  }
}

/**
 * Every level of the payload, outermost first. A service that answers
 * `{ success, candidate_name, raw_resume_data: { … } }` keeps the name on the
 * wrapper, so the mapping needs both levels — the resume itself and the
 * envelope around it.
 */
export function unwrapLevels(payload: unknown): Array<Record<string, unknown>> {
  const levels: Array<Record<string, unknown>> = [];
  let current = parseJsonString(payload);
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      /* A bare array of sections/entries. */
      const level = { sections: current } as Record<string, unknown>;
      levels.push(level);
      return levels;
    }
    if (current === null || typeof current !== 'object') return levels;

    const source = current as Record<string, unknown>;
    levels.push(source);

    /* 1. The resume is here: a `sections` array, or the usual section arrays. */
    if (Array.isArray(source.sections) && source.sections.length > 0) return levels;
    if (
      SECTION_ARRAY_ALIASES.some(([key]) => {
        const value = source[key];
        return Array.isArray(value) && value.length > 0;
      })
    ) {
      return levels;
    }

    /* 2. It is wrapped — { success, candidate_name, raw_resume_data: { … } } —
          including the case where the wrapper is a JSON string. */
    const next = ENVELOPE_ALIASES.map((key) => parseJsonString(source[key])).find(
      (value) => value !== null && typeof value === 'object',
    );
    if (next === undefined) return levels;   /* nothing nested left */
    current = next;
  }
  return levels;
}

/** An object entry like { company, title, dates } → one entry line plus bullets. */
function blocksFromEntry(item: unknown): ResumeBlock[] {
  if (typeof item === 'string') {
    const text = item.trim();
    return text ? [{ kind: 'text' as const, text }] : [];
  }
  if (item === null || typeof item !== 'object') return [];
  const entry = item as Record<string, unknown>;
  const blocks: ResumeBlock[] = [];

  const head = [firstString(entry, ['company', 'organization', 'employer', 'institution', 'school']),
                firstString(entry, ['title', 'position', 'role', 'degree', 'name', 'field'])];
  const dates = [firstString(entry, ['dates', 'date', 'period', 'duration']),
                 firstString(entry, ['start', 'start_date'])]
    .filter(Boolean)
    .join(' – ');
  const headline = [head.filter(Boolean).join(' — '), dates && `· ${dates}`].filter(Boolean).join(' ');
  if (headline) blocks.push({ kind: 'entry', text: headline });

  for (const key of ['highlights', 'bullets', 'responsibilities', 'achievements', 'details', 'description', 'summary']) {
    for (const line of stringList(entry[key])) blocks.push({ kind: 'bullet', text: line });
  }
  if (!blocks.length) {
    const fallback = firstString(entry, BLOCK_TEXT_ALIASES);
    if (fallback) blocks.push({ kind: 'text', text: fallback });
  }
  return blocks;
}

/** Sections straight from the parser's own shape. */
function sectionsFromSections(source: Record<string, unknown>): ResumeSection[] {
  const raw = SECTION_KEY_ALIASES.map((key) => source[key]).find((value) => Array.isArray(value));
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((rawSection) => {
      const section = (rawSection ?? {}) as Record<string, unknown>;
      const items = SECTION_ITEMS_ALIASES.map((key) => section[key]).find((value) => Array.isArray(value));
      const rawBlocks: unknown[] = Array.isArray(items) ? (items as unknown[]) : [];
      const blocks: ResumeBlock[] = [];
      for (const rawBlock of rawBlocks) {
        if (typeof rawBlock === 'object' && rawBlock !== null && !BLOCK_TEXT_ALIASES.some((k) => asText((rawBlock as Record<string, unknown>)[k]))) {
          blocks.push(...blocksFromEntry(rawBlock));
          continue;
        }
        const block = (rawBlock ?? {}) as Record<string, unknown>;
        const text = typeof rawBlock === 'string' ? rawBlock.trim() : firstString(block, BLOCK_TEXT_ALIASES);
        if (!text) continue;
        const kind = BLOCK_KINDS.includes(block.kind as ResumeBlockKind) ? (block.kind as ResumeBlockKind) : 'text';
        const rawStyle = (block.style ?? {}) as Record<string, unknown>;
        const style: ResumeBlockStyle = {};
        if (typeof rawStyle.bold === 'boolean') style.bold = rawStyle.bold;
        if (typeof rawStyle.italic === 'boolean') style.italic = rawStyle.italic;
        if (typeof rawStyle.size === 'number') style.size = rawStyle.size;
        const align = asAlign(rawStyle.align);
        if (align) style.align = align;
        blocks.push(Object.keys(style).length ? { kind, text, style } : { kind, text });
      }
      return { title: firstString(section, SECTION_TITLE_ALIASES) || 'Section', blocks };
    })
    .filter((section) => section.blocks.length > 0);
}

/* -------------------------------------------------------------------------- */
/*                     JSON Resume (jsonresume.org) mapping                   */
/* -------------------------------------------------------------------------- */

/**
 * The parser wraps the standard JSON Resume schema:
 *
 *   { success, candidate_name, total_years_experience,
 *     raw_resume_data: { basics, work[], education[], skills[], projects[], … } }
 *
 * Everything below maps that schema onto the studio's document.
 */
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function looksLikeJsonResume(source: Record<string, unknown>): boolean {
  const basics = source.basics;
  if (basics !== null && typeof basics === 'object') return true;
  const skillGroups = asArray(source.skills).some(
    (item) => item !== null && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).keywords),
  );
  return asArray(source.work).length > 0 || skillGroups;
}

/** JSON Resume keeps dates in several shapes; show the human string when given. */
function jsonResumeDates(entry: Record<string, unknown>): string {
  const raw = asText(entry.datesRaw);
  if (raw) return raw;
  const start = asText(entry.startDate);
  const end = asText(entry.endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

/** `Primary — Secondary · Dates`, skipping whatever is missing. */
function entryLine(primary: string, secondary: string, dates: string): string {
  const head = [primary, secondary].filter(Boolean).join(' — ');
  return [head, dates].filter(Boolean).join(' · ');
}

function jsonResumeSections(source: Record<string, unknown>): ResumeSection[] {
  const sections: ResumeSection[] = [];
  const basics = (source.basics ?? {}) as Record<string, unknown>;

  const summary = asText(basics.summary);
  if (summary) sections.push({ title: 'Summary', blocks: [{ kind: 'text', text: summary }] });

  const work = asArray(source.work);
  if (work.length) {
    const blocks: ResumeBlock[] = [];
    for (const item of work) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const line = entryLine(asText(entry.name), asText(entry.position), jsonResumeDates(entry));
      if (line) blocks.push({ kind: 'entry', text: line });
      for (const highlight of stringList(entry.highlights)) blocks.push({ kind: 'bullet', text: highlight });
      const description = asText(entry.summary);
      if (description) blocks.push({ kind: 'text', text: description });
    }
    if (blocks.length) sections.push({ title: 'Experience', blocks });
  }

  const education = asArray(source.education);
  if (education.length) {
    const blocks: ResumeBlock[] = [];
    for (const item of education) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const line = entryLine(asText(entry.institution), asText(entry.area), jsonResumeDates(entry));
      if (line) blocks.push({ kind: 'entry', text: line });
      const score = asText(entry.score);
      if (score) blocks.push({ kind: 'text', text: `Score: ${score}` });
      const detail = asText(entry.location);
      if (detail) blocks.push({ kind: 'text', text: detail });
    }
    if (blocks.length) sections.push({ title: 'Education', blocks });
  }

  const skills = asArray(source.skills);
  if (skills.length) {
    const blocks: ResumeBlock[] = [];
    for (const item of skills) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const group = asText(entry.name);
      const keywords = stringList(entry.keywords ?? entry.keywords_);
      if (group && keywords.length) blocks.push({ kind: 'text', text: `${group}: ${keywords.join(', ')}` });
      else if (group) blocks.push({ kind: 'text', text: group });
      else if (keywords.length) blocks.push({ kind: 'text', text: keywords.join(', ') });
    }
    if (blocks.length) sections.push({ title: 'Skills', blocks });
  }

  const projects = asArray(source.projects);
  if (projects.length) {
    const blocks: ResumeBlock[] = [];
    for (const item of projects) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const line = entryLine(asText(entry.name), asText(entry.description), jsonResumeDates(entry));
      if (line) blocks.push({ kind: 'entry', text: line });
      for (const highlight of stringList(entry.highlights)) blocks.push({ kind: 'bullet', text: highlight });
      const url = asText(entry.url);
      if (url) blocks.push({ kind: 'text', text: url });
    }
    if (blocks.length) sections.push({ title: 'Projects', blocks });
  }

  /* The rest of the schema, in a sensible order, only when present. */
  const extras: Array<[string, string, string, string]> = [
    ['certificates', 'Certifications', 'name', 'issuer'],
    ['awards', 'Awards', 'title', 'awarder'],
    ['publications', 'Publications', 'name', 'publisher'],
    ['volunteer', 'Volunteer', 'organization', 'position'],
    ['languages', 'Languages', 'language', 'fluency'],
    ['interests', 'Interests', 'name', 'keywords'],
    ['references', 'References', 'name', 'reference'],
  ];
  for (const [key, title, primaryKey, secondaryKey] of extras) {
    const items = asArray(source[key]);
    if (!items.length) continue;
    const blocks: ResumeBlock[] = [];
    for (const item of items) {
      if (typeof item === 'string') {
        if (item.trim()) blocks.push({ kind: 'text', text: item.trim() });
        continue;
      }
      const entry = (item ?? {}) as Record<string, unknown>;
      const secondary = secondaryKey === 'keywords' ? stringList(entry.keywords).join(', ') : asText(entry[secondaryKey]);
      const line = entryLine(
        asText(entry[primaryKey]),
        secondary,
        asText(entry.date) || asText(entry.releaseDate) || jsonResumeDates(entry),
      );
      if (line) blocks.push({ kind: title === 'References' ? 'entry' : 'text', text: line });
    }
    if (blocks.length) sections.push({ title, blocks });
  }

  return sections;
}

function identityFromJsonResume(source: Record<string, unknown>): {
  name: string;
  headline: string;
  contacts: string[];
} {
  const basics = (source.basics ?? {}) as Record<string, unknown>;
  const contacts: string[] = [];
  const email = asText(basics.email);
  if (email) contacts.push(email);
  const phone = asText(basics.phone);
  if (phone) contacts.push(phone);

  const location = basics.location;
  if (location !== null && typeof location === 'object') {
    const place = (location ?? {}) as Record<string, unknown>;
    const text =
      asText(place.raw) ||
      [asText(place.city), asText(place.region), asText(place.countryCode)].filter(Boolean).join(', ');
    if (text) contacts.push(text);
  } else if (asText(location)) {
    contacts.push(asText(location));
  }

  for (const item of asArray(basics.profiles)) {
    const profile = (item ?? {}) as Record<string, unknown>;
    const text = asText(profile.url) || asText(profile.username);
    if (text) contacts.push(text);
  }

  return { name: asText(basics.name), headline: asText(basics.label), contacts };
}

/** No `sections` key, but the parser split the resume into the usual arrays. */
function sectionsFromArrays(source: Record<string, unknown>): ResumeSection[] {
  const sections: ResumeSection[] = [];
  for (const [key, title] of SECTION_ARRAY_ALIASES) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const blocks = value.flatMap((item) => blocksFromEntry(item));
      if (blocks.length) sections.push({ title, blocks });
    } else {
      const lines = stringList(value);
      if (lines.length) sections.push({ title, blocks: lines.map((text) => ({ kind: 'text' as const, text })) });
    }
  }
  return sections;
}

/** Last resort: the parser returned the resume as plain text — split it on headings. */
export function sectionsFromPlainText(raw: string): ResumeSection[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line, index, all) => line.trim().length > 0 || (index > 0 && all[index - 1].trim().length > 0));

  const sections: ResumeSection[] = [];
  let current: ResumeSection | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading = trimmed.length <= 48 && (KNOWN_HEADINGS.test(trimmed) || (!/[a-z]/.test(trimmed) && /[A-Z]{3,}/.test(trimmed)));
    if (isHeading) {
      current = { title: trimmed.replace(/:$/, ''), blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: 'Summary', blocks: [] };
      sections.push(current);
    }
    const bullet = /^[-•*·▪]\s+/.test(trimmed);
    current.blocks.push({
      kind: bullet ? 'bullet' : 'text',
      text: bullet ? trimmed.replace(/^[-•*·▪]\s+/, '') : trimmed,
    });
  }
  return sections.filter((section) => section.blocks.length > 0);
}

/**
 * Plain text → document. The first one or two lines are usually the name and
 * the headline, so they are lifted out before the headings are split.
 */
export function resumeFromPlainText(raw: string): {
  name: string;
  headline: string;
  contacts: string[];
  sections: ResumeSection[];
} {
  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  let cursor = 0;
  const nextLine = () => {
    while (cursor < lines.length && !lines[cursor]) cursor += 1;
    return cursor < lines.length ? lines[cursor++] : '';
  };

  let name = '';
  let headline = '';
  let contacts: string[] = [];

  const first = nextLine();
  const looksLikeName = first.length > 0 && first.length <= 48 && !/[\d@]/.test(first);
  if (looksLikeName) {
    name = first;
    const second = nextLine();
    if (second && second.length <= 120 && !KNOWN_HEADINGS.test(second)) {
      contacts = stringList(second);
      if (contacts.length > 1) {
        /* "email | phone | city" — everything from the first @ onwards is contact info. */
        const firstContact = contacts.findIndex((part) => /[@+]|\d/.test(part));
        if (firstContact >= 0) {
          headline = contacts.slice(0, firstContact).join(' ').trim();
          contacts = contacts.slice(firstContact);
        } else {
          headline = second;
          contacts = [];
        }
      } else {
        headline = second;
        contacts = [];
      }
    } else if (second) {
      cursor -= 1;
    }
  } else {
    cursor -= 1;
  }

  return { name, headline, contacts, sections: sectionsFromPlainText(lines.slice(cursor).join('\n')) };
}

/**
 * Turns whatever the parser sends into the shape the studio can edit and
 * `resumePdf()` can render.
 *
 * Handles, in order: its own documented shape; a resume wrapped in
 * `{resume|data|parsed|result|document: …}`; section arrays named differently
 * (`items`, `lines`, `bullets`, `content`); the usual top-level arrays
 * (`experience`, `education`, `skills`, …) built from objects; and finally a
 * plain-text resume split on headings. Unknown fields are dropped, missing ones
 * defaulted, so a different parser payload still opens in the editor.
 */
export function toResumeDocument(payload: unknown): ResumeDocument {
  const levels = unwrapLevels(payload);
  const source = levels.length ? levels[levels.length - 1] : {};

  /* The standard JSON Resume schema first — the parser wraps one. */
  const fromJsonResume = looksLikeJsonResume(source) ? jsonResumeSections(source) : [];
  let sections = fromJsonResume;
  if (!sections.length) sections = sectionsFromSections(source);
  if (!sections.length) sections = sectionsFromArrays(source);

  /* The wrapper may hold the name while the resume object holds the rest:
     read from the inside out, and copy nothing twice. */
  const contacts: string[] = [];
  for (const level of [...levels].reverse()) {
    for (const candidate of stringList(
      CONTACT_ALIASES.map((key) => level[key]).find((value) => value !== undefined),
    )) {
      if (!contacts.includes(candidate)) contacts.push(candidate);
    }
    for (const key of CONTACT_FIELD_KEYS) {
      const value = asText(level[key]);
      if (value && !contacts.includes(value)) contacts.push(value);
    }
  }

  const identity = identityFromJsonResume(source);
  for (const contact of identity.contacts) {
    if (!contacts.includes(contact)) contacts.push(contact);
  }

  const name =
    identity.name ||
    [...levels].reverse().map((level) => firstString(level, NAME_ALIASES)).find(Boolean) ||
    '';
  const headline =
    identity.headline ||
    [...levels].reverse().map((level) => firstString(level, HEADLINE_ALIASES)).find(Boolean) ||
    '';

  if (!sections.length) {
    /* Nothing structured: the answer may be the resume as plain text. */
    const plain = PLAIN_TEXT_ALIASES.map((key) => asText(source[key])).find((text) => text.length > 40);
    if (plain) {
      const fromText = resumeFromPlainText(plain);
      return {
        name: name || fromText.name || 'Your name',
        headline: headline || fromText.headline,
        contacts: contacts.length ? contacts : fromText.contacts,
        sections: fromText.sections,
      };
    }
  }

  return { name: name || 'Your name', headline, contacts, sections };
}

/** For the error message: what the payload actually contained. */
/**
 * Human-readable summary of a payload the mapper could not use: checks the whole
 * object (including envelopes) and reports `path: type`, with array lengths —
 * enough to add the missing mapping without guessing.
 */
export function describePayload(payload: unknown): string {
  const paths: string[] = [];
  const seen = new Set<unknown>();

  const walk = (value: unknown, path: string, depth: number) => {
    if (paths.length >= 14 || depth > 2) return;
    if (Array.isArray(value)) {
      const label = value.length
        ? `array[${value.length}] of ${typeof value[0]}`
        : 'empty array';
      paths.push(`${path}: ${label}`);
      if (value.length && typeof value[0] === 'object' && value[0] !== null) {
        for (const key of Object.keys(value[0] as Record<string, unknown>).slice(0, 6)) {
          paths.push(`${path}[0].${key}: ${typeof (value[0] as Record<string, unknown>)[key]}`);
        }
      }
      return;
    }
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) return;
      seen.add(value);
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, path ? `${path}.${key}` : key, depth + 1);
      }
      return;
    }
    const text = typeof value === 'string' ? `"${value.slice(0, 28)}${value.length > 28 ? '…' : ''}"` : String(value);
    paths.push(`${path}: ${text}`);
  };

  walk(parseJsonString(payload), '', 0);
  return paths.length ? paths.join(' · ') : 'an empty object';
}
