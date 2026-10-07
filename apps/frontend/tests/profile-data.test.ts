import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStoredProfile, profileChecklist } from '../src/features/dashboard/candidate/profile-data';
import { INITIAL_PROFILE, profileCompleteness } from '../src/features/dashboard/candidate/mock-data';

test('autofills ATS envelope fields, dates, links and case-insensitive skills', () => {
  const profile = parseStoredProfile({ raw_resume_data: {
    basics: { name: 'Candidate', label: 'Developer', summary: 'Builds software', profiles: [{ network: 'GitHub', url: 'https://github.com/example' }] },
    skills: [{ name: 'Other', keywords: ['TypeScript', 'typescript', 'Python'] }],
    work: [{ name: 'Example', position: 'Engineer', startDate: '2024', endDate: '2026' }],
    education: [{ institution: 'University', studyType: 'BSc', area: 'Computing' }],
  } });
  assert.equal(profile.headline, 'Developer'); assert.equal(profile.about, 'Builds software');
  assert.equal(profile.skills?.length, 2); assert.equal(profile.education?.[0].degree, 'BSc in Computing');
  assert.equal(profile.experience?.[0].period, '2024 – 2026'); assert.equal(profile.links?.[0].label, 'GitHub');
});
test('saved canonical profiles and intentionally emptied lists restore correctly', () => {
  const stored = { ...INITIAL_PROFILE, skills: [], education: [], headline: '' };
  const profile = parseStoredProfile(JSON.stringify(stored));
  assert.deepEqual(profile.skills, []); assert.deepEqual(profile.education, []); assert.equal(profile.headline, '');
});
test('resume and five skills contribute to real completeness; unsupported signals are absent', () => {
  const empty = profileChecklist(INITIAL_PROFILE);
  assert.equal(profileCompleteness(empty), 0);
  const profile = { ...INITIAL_PROFILE, resumeFileName: 'resume.pdf', skills: ['A', 'B', 'C', 'D', 'E'] };
  const items = profileChecklist(profile);
  assert.equal(profileCompleteness(items), 35);
  assert(!items.some(item => item.key === 'video' || item.key === 'references'));
  assert.equal(items.reduce((total, item) => total + item.weight, 0), 100);
});
test('recovers recognizable skills and qualifications from pre-fix canvas-only profiles', () => {
  const profile = parseStoredProfile({ pages: [{ objects: [
    'Candidate', 'Computer Engineering Student', 'SUMMARY', 'Builds software.', 'EDUCATION',
    'Bachelor of Engineering', '2023 – Present', 'SKILLS', 'Other: Python, Git, TypeScript, SQL, React',
  ].map((text, i) => ({ type: 'text', text, x: 0, y: i * 20 })) }], assets: {} });
  assert.equal(profile.headline, 'Computer Engineering Student');
  assert.equal(profile.skills?.length, 5);
  assert.equal(profile.education?.[0].degree, 'Bachelor of Engineering');
  assert.equal(profile.about, 'Builds software.');
});
