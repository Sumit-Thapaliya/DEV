import { describe, expect, it } from 'vitest';
import { createJobSchema } from '../../src/modules/job/job.schema.js';

describe('Ritik job description and qualifications', () => {
  it('validates and preserves all form fields without trusting company or actor overrides', () => {
    const parsed = createJobSchema.parse({
      title: ' Engineer ',
      description: ' Build systems ',
      minimumQualifications: ' TypeScript ',
      preferredQualifications: ' React Query ',
      salary: null,
      company: 'spoofed',
      postedBy: 'other-user',
    });
    expect(parsed).toMatchObject({
      title: 'Engineer',
      description: 'Build systems',
      minimumQualifications: 'TypeScript',
      preferredQualifications: 'React Query',
      salary: null,
    });
    expect(parsed).not.toHaveProperty('company');
    expect(parsed).not.toHaveProperty('postedBy');
  });
  it('keeps older title-only clients compatible without accepting malformed supplied fields', () => {
    expect(
      createJobSchema.safeParse({ title: 'Existing client' }).success,
    ).toBe(true);
    expect(createJobSchema.safeParse({ title: ' ' }).success).toBe(false);
    expect(
      createJobSchema.safeParse({
        title: 'Engineer',
        minimumQualifications: [],
      }).success,
    ).toBe(false);
    expect(
      createJobSchema.safeParse({
        title: 'Engineer',
        description: 'x'.repeat(20001),
      }).success,
    ).toBe(false);
    expect(
      createJobSchema.safeParse({
        title: 'Engineer',
        preferredQualifications: 42,
      }).success,
    ).toBe(false);
  });
});
