import { createHmac } from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * Contact values a recruiter may SEE (the field exists) but not READ.
 *
 * Instead of sending `bibek@gmail.com`, the API sends its keyed digest:
 *
 *     contactToken('bibek@gmail.com')  →  '9f2c4a…e71b'
 *
 * Why HMAC and not a plain hash: `sha256('bibek@gmail.com')` can be guessed by
 * hashing a list of addresses, but nobody can reproduce this without the
 * server-side pepper. The digest is stable, so the same candidate always shows
 * the same token (the UI can tell two rows apart, and "same value" still
 * compares equal without revealing the value).
 */
const CONTACT_PEPPER = env.CONTACT_PEPPER;

/** Keys whose values are contact data, compared after normalising case. */
const CONTACT_KEYS = new Set([
  'email',
  'email_address',
  'emailaddress',
  'mail',
  'e-mail',
  'phone',
  'phone_number',
  'phonenumber',
  'telephone',
  'mobile',
  'mobile_number',
  'contact',
  'contact_number',
  'linkedin',
  'linkedin_url',
  'linkedinurl',
  'github',
  'github_url',
  'website',
  'url',
  'portfolio',
  /* Note: `location` / `city` are deliberately NOT here — recruiters screen by
     location, it is not contact data, and it stays readable. */
  'address',
  'street',
]);

export const isContactKey = (key: string) => CONTACT_KEYS.has(key.trim().toLowerCase());

/** `+977 9803 555 210` and `+9779803555210` are the same number. */
export const normaliseContact = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '');

export const contactToken = (value: string): string =>
  createHmac('sha256', CONTACT_PEPPER).update(normaliseContact(value)).digest('hex');

/** Short form for the wire: enough to spot "same/different", no value lost. */
export const contactTokenShort = (value: string): string => contactToken(value).slice(0, 24);

/**
 * Copy a parsed-resume JSON and replace every contact value with its token.
 * Everything that is not contact data (name, summary, experience, skills,
 * education) is copied through untouched — the recruiter still reads the CV.
 *
 * `email: "bibek@gmail.com"`  →  `email: "9f2c4a…e71b"`
 * Nested keys are walked and every match is masked.
 */
const maskValue = (value: string): string => (value.trim() ? contactTokenShort(value) : '');

export function maskContactFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => maskContactFields(item));
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      if (isContactKey(key)) {
        if (typeof item === 'string') {
          out[key] = maskValue(item);
          continue;
        }
        if (Array.isArray(item)) {
          out[key] = item.map((entry) => (typeof entry === 'string' ? maskValue(entry) : maskContactFields(entry)));
          continue;
        }
        out[key] = maskContactFields(item);
        continue;
      }
      out[key] = maskContactFields(item);
    }
    return out;
  }
  return value;
}

/** Every string stored under a contact key anywhere in the parsed resume. */
export function collectContact(source: unknown, found: Record<string, string> = {}): Record<string, string> {
  if (Array.isArray(source)) {
    for (const item of source) collectContact(item, found);
    return found;
  }
  if (source && typeof source === 'object') {
    for (const [key, item] of Object.entries(source as Record<string, unknown>)) {
      const normalised = key.trim().toLowerCase();
      if (isContactKey(normalised)) {
        if (typeof item === 'string' && item.trim() && !found[normalised]) found[normalised] = item.trim();
        if (Array.isArray(item)) {
          const first = item.find((entry) => typeof entry === 'string' && entry.trim());
          if (typeof first === 'string' && !found[normalised]) found[normalised] = first.trim();
        }
        continue;
      }
      collectContact(item, found);
    }
  }
  return found;
}

/* ------------------------------------------------------------------ free text */
/**
 * Contact data does not always sit under a key. Candidates write
 * "reach me at bibek@gmail.com or +977 9803 555 210" straight into the summary,
 * and a PDF makes that text impossible to blur. So every string that leaves the
 * server is swept for contact patterns and replaced with a plain marker:
 *
 *   "Reach me at bibek@gmail.com"        → "Reach me at [hidden email]"
 *   "LinkedIn: linkedin.com/in/bibek"    → "LinkedIn: [hidden link]"
 *   "Call +977 9803 555 210"             → "Call [hidden phone]"
 *
 * Deliberately conservative: a bare year range ("2021-2022"), a percentage or a
 * team size is left alone — only patterns that are unambiguous get redacted.
 */
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LINK_PATTERN =
  /(?:https?:\/\/|www\.)[^\s,;)]+|\b(?:linkedin\.com|lnkd\.in|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com)\/[^\s,;)]*/gi;
/* 9+ digits (or 8+ with an explicit +) — years and counts stay readable. */
const PHONE_PATTERN = /(\+?\d[\d\s().-]{6,}\d)/g;

const digitsIn = (value: string) => (value.match(/\d/g) ?? []).length;

export function redactContactText(value: string): string {
  if (!value) return value;
  let out = value.replace(EMAIL_PATTERN, '[hidden email]');
  out = out.replace(LINK_PATTERN, '[hidden link]');
  out = out.replace(PHONE_PATTERN, (match) => {
    const digits = digitsIn(match);
    const looksLikePhone = digits >= 9 || (match.trim().startsWith('+') && digits >= 8);
    return looksLikePhone ? '[hidden phone]' : match;
  });
  return out;
}

/** Walks any JSON shape and sweeps every string it contains. */
export function redactContactTextDeep<T>(value: T): T {
  if (typeof value === 'string') return redactContactText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => redactContactTextDeep(item)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactContactTextDeep(item);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * The shape the recruiter UI renders: one row per contact field that exists in
 * the resume. `state: 'blurred'` → show the row, blur the token, reveal nothing.
 * `state: 'missing'` → the resume never had it; the row stays hidden.
 */
export type MaskedContactField = {
  label: string;
  state: 'blurred' | 'missing';
  /** Keyed digest (no usable value) — only ever rendered under a blur. */
  token: string | null;
  /** How long the real value was, for blur sizing / "present" hinting. */
  length: number;
};

export type MaskedContact = {
  email: MaskedContactField;
  phone: MaskedContactField;
  linkedin: MaskedContactField;
  /** Extra links that were present but are not one of the three headline fields. */
  other: Array<{ label: string; token: string | null; length: number }>;
};

const LABELS: Record<string, string> = {
  email: 'Email',
  email_address: 'Email',
  emailaddress: 'Email',
  mail: 'Email',
  'e-mail': 'Email',
  phone: 'Phone',
  phone_number: 'Phone',
  phonenumber: 'Phone',
  telephone: 'Phone',
  mobile: 'Phone',
  mobile_number: 'Phone',
  contact_number: 'Phone',
  linkedin: 'LinkedIn',
  linkedin_url: 'LinkedIn',
  linkedinurl: 'LinkedIn',
  github: 'GitHub',
  github_url: 'GitHub',
  website: 'Website',
  url: 'Website',
  portfolio: 'Portfolio',
  address: 'Address',
  street: 'Address',
  city: 'Location',
  location: 'Location',
};

const EM_KEYS = ['email', 'email_address', 'emailaddress', 'mail', 'e-mail'];
const PHONE_KEYS = ['phone', 'phone_number', 'phonenumber', 'telephone', 'mobile', 'mobile_number', 'contact_number'];
const LINKEDIN_KEYS = ['linkedin', 'linkedin_url', 'linkedinurl'];
const HEADLINE = new Set([...EM_KEYS, ...PHONE_KEYS, ...LINKEDIN_KEYS]);

const pick = (found: Record<string, string>, keys: string[]): string | null => {
  for (const key of keys) if (found[key]) return found[key];
  return null;
};

const field = (label: string, value: string | null): MaskedContactField =>
  value
    ? { label, state: 'blurred', token: contactTokenShort(value), length: value.length }
    : { label, state: 'missing', token: null, length: 0 };

export function contactSummary(parsedProfile: unknown): MaskedContact {
  const found = collectContact(parsedProfile);
  const other = Object.entries(found)
    .filter(([key]) => !HEADLINE.has(key))
    .map(([key, value]) => ({
      label: LABELS[key] ?? key,
      token: contactTokenShort(value),
      length: value.length,
    }));
  return {
    email: field('Email', pick(found, EM_KEYS)),
    phone: field('Phone', pick(found, PHONE_KEYS)),
    linkedin: field('LinkedIn', pick(found, LINKEDIN_KEYS)),
    other,
  };
}
